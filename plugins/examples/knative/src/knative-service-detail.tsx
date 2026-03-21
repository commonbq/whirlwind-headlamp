/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useHistory, useParams } from 'react-router';
import {
  formatAge,
  getReadyStatus,
  KNativeRevision,
  KNativeService,
  useKNativeList,
  useKNativeResource,
} from './common';
import { ReadyChip } from './knative-services';

export default function KNativeServiceDetail() {
  const history = useHistory();
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const { item: service, error: svcError } = useKNativeResource<KNativeService>(
    `/apis/serving.knative.dev/v1/namespaces/${namespace}/services/${name}`
  );
  const { items: revisions, error: revError } = useKNativeList<KNativeRevision>(
    `/apis/serving.knative.dev/v1/namespaces/${namespace}/revisions`
  );

  if (svcError) {
    return (
      <SectionBox title={`KNative Service: ${name}`}>
        <Alert severity="error">{svcError}</Alert>
      </SectionBox>
    );
  }

  if (!service) {
    return (
      <SectionBox title={`KNative Service: ${name}`}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </SectionBox>
    );
  }

  const readyStatus = getReadyStatus(service.status?.conditions);
  const url = service.status?.url;
  const latestRevision = service.status?.latestReadyRevisionName;
  const traffic = service.status?.traffic ?? [];
  const container = service.spec?.template?.spec?.containers?.[0];

  // Filter revisions belonging to this service
  const serviceRevisions = (revisions ?? []).filter(
    rev =>
      rev.metadata.ownerReferences?.some(
        ref => ref.kind === 'Service' && ref.name === name
      ) ||
      rev.metadata.labels?.['serving.knative.dev/service'] === name
  );

  return (
    <SectionBox title={`KNative Service: ${name}`}>
      <Box mb={2}>
        <Button
          variant="text"
          size="small"
          onClick={() => history.push('/knative/services')}
          sx={{ mb: 1 }}
        >
          ← Back to Services
        </Button>
      </Box>

      {/* Overview */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Box mt={0.5}>
              <ReadyChip status={readyStatus} />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Namespace
            </Typography>
            <Typography variant="body2">{service.metadata.namespace}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Age
            </Typography>
            <Typography variant="body2">
              {formatAge(service.metadata.creationTimestamp)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Latest Ready Revision
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {latestRevision ?? '—'}
            </Typography>
          </Grid>
          {url && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Service URL
              </Typography>
              <Box mt={0.5}>
                <Link
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontWeight: 500 }}
                >
                  {url}
                </Link>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Container Configuration */}
      {container && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Container Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Image
              </Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {container.image}
              </Typography>
            </Grid>
            {container.resources?.limits && (
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Resource Limits
                </Typography>
                {Object.entries(container.resources.limits).map(([k, v]) => (
                  <Typography key={k} variant="body2">
                    {k}: {v}
                  </Typography>
                ))}
              </Grid>
            )}
            {container.resources?.requests && (
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Resource Requests
                </Typography>
                {Object.entries(container.resources.requests).map(([k, v]) => (
                  <Typography key={k} variant="body2">
                    {k}: {v}
                  </Typography>
                ))}
              </Grid>
            )}
            {service.spec?.template?.spec?.containerConcurrency !== undefined && (
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Container Concurrency
                </Typography>
                <Typography variant="body2">
                  {service.spec.template.spec.containerConcurrency === 0
                    ? 'Unlimited'
                    : service.spec.template.spec.containerConcurrency}
                </Typography>
              </Grid>
            )}
            {service.spec?.template?.spec?.timeoutSeconds !== undefined && (
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Timeout
                </Typography>
                <Typography variant="body2">
                  {service.spec.template.spec.timeoutSeconds}s
                </Typography>
              </Grid>
            )}
          </Grid>
          {container.env && container.env.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Environment Variables
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Value</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {container.env.map((envVar, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {envVar.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {envVar.value ?? (envVar.valueFrom ? '(from source)' : '—')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}

      {/* Traffic Configuration */}
      {traffic.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Traffic Splits
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Revision</strong></TableCell>
                  <TableCell><strong>Traffic %</strong></TableCell>
                  <TableCell><strong>Tag</strong></TableCell>
                  <TableCell><strong>URL</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {traffic.map((t, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {t.latestRevision ? `${t.revisionName ?? 'latest'} (latest)` : (t.revisionName ?? '—')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={t.percent}
                          sx={{ width: 80, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="body2">{t.percent}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {t.tag ? (
                        <Chip label={t.tag} size="small" variant="outlined" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {t.url ? (
                        <Link href={t.url} target="_blank" rel="noopener noreferrer" underline="hover">
                          {t.url}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Conditions */}
      {service.status?.conditions && service.status.conditions.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Conditions
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Reason</strong></TableCell>
                  <TableCell><strong>Message</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {service.status.conditions.map((cond, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{cond.type}</TableCell>
                    <TableCell>
                      <Chip
                        label={cond.status}
                        color={cond.status === 'True' ? 'success' : cond.status === 'False' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{cond.reason ?? '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 400 }}>
                        {cond.message ?? '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Revisions */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Revisions
        </Typography>
        {revError && <Alert severity="warning">{revError}</Alert>}
        {revisions === null && !revError && <CircularProgress size={20} />}
        {revisions !== null && serviceRevisions.length === 0 && (
          <Typography color="text.secondary">No revisions found.</Typography>
        )}
        {serviceRevisions.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Image</strong></TableCell>
                  <TableCell><strong>Age</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serviceRevisions
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.metadata.creationTimestamp).getTime() -
                      new Date(a.metadata.creationTimestamp).getTime()
                  )
                  .map(rev => {
                    const revReady = getReadyStatus(rev.status?.conditions);
                    const revImage = rev.spec?.containers?.[0]?.image;
                    const isLatest = rev.metadata.name === latestRevision;
                    return (
                      <TableRow key={rev.metadata.uid} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontFamily="monospace">
                              {rev.metadata.name}
                            </Typography>
                            {isLatest && (
                              <Chip label="latest" size="small" color="primary" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <ReadyChip status={revReady} />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {revImage ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatAge(rev.metadata.creationTimestamp)}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </SectionBox>
  );
}
