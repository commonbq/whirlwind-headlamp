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
import Refresh from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useHistory } from 'react-router';
import {
  formatAge,
  getReadyStatus,
  KNativeService,
  useKNativeList,
} from './common';

function getServiceDetailPath(namespace: string, name: string): string {
  return `/knative/services/${namespace}/${name}`;
}

export default function KNativeServicesList() {
  const history = useHistory();
  const { items: services, error, reload } = useKNativeList<KNativeService>(
    '/apis/serving.knative.dev/v1/services'
  );

  if (error) {
    return (
      <SectionBox title="KNative Services">
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </SectionBox>
    );
  }

  if (services === null) {
    return (
      <SectionBox title="KNative Services">
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </SectionBox>
    );
  }

  return (
    <SectionBox
      title="KNative Services"
      headerProps={{
        actions: [
          <Tooltip title="Refresh" key="refresh">
            <IconButton onClick={reload} size="small" aria-label="Refresh">
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>,
        ],
      }}
    >
      {services.length === 0 ? (
        <Box p={4} textAlign="center">
          <Typography color="text.secondary">
            No KNative services found. Deploy your first serverless service to get started.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Namespace</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>URL</strong></TableCell>
                <TableCell><strong>Latest Revision</strong></TableCell>
                <TableCell><strong>Age</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map(svc => {
                const readyStatus = getReadyStatus(svc.status?.conditions);
                const url = svc.status?.url;
                const latestRevision = svc.status?.latestReadyRevisionName ?? svc.status?.latestCreatedRevisionName;
                const detailUrl = getServiceDetailPath(svc.metadata.namespace, svc.metadata.name);

                return (
                  <TableRow key={svc.metadata.uid} hover>
                    <TableCell>
                      <Link
                        href={detailUrl}
                        underline="hover"
                        sx={{ fontWeight: 500, cursor: 'pointer' }}
                        onClick={e => {
                          e.preventDefault();
                          history.push(detailUrl);
                        }}
                      >
                        {svc.metadata.name}
                      </Link>
                    </TableCell>
                    <TableCell>{svc.metadata.namespace}</TableCell>
                    <TableCell>
                      <ReadyChip status={readyStatus} />
                    </TableCell>
                    <TableCell>
                      {url ? (
                        <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover">
                          {url}
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {latestRevision ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatAge(svc.metadata.creationTimestamp)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box mt={2}>
        <Button
          variant="contained"
          size="small"
          onClick={() => window.open('https://knative.dev/docs/serving/services/', '_blank')}
        >
          KNative Docs
        </Button>
      </Box>
    </SectionBox>
  );
}

export function ReadyChip({ status }: { status: 'Ready' | 'Not Ready' | 'Unknown' }) {
  const color = status === 'Ready' ? 'success' : status === 'Not Ready' ? 'error' : 'default';
  return <Chip label={status} color={color as any} size="small" />;
}
