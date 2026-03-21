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
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import React from 'react';
import {
  formatAge,
  getReadyStatus,
  KNativeRevision,
  useKNativeList,
} from './common';
import { ReadyChip } from './knative-services';

export default function KNativeRevisionsList() {
  const { items: revisions, error } = useKNativeList<KNativeRevision>(
    '/apis/serving.knative.dev/v1/revisions'
  );

  if (error) {
    return (
      <SectionBox title="KNative Revisions">
        <Alert severity="warning">{error}</Alert>
      </SectionBox>
    );
  }

  if (revisions === null) {
    return (
      <SectionBox title="KNative Revisions">
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </SectionBox>
    );
  }

  // Sort newest first
  const sorted = revisions.slice().sort(
    (a, b) =>
      new Date(b.metadata.creationTimestamp).getTime() -
      new Date(a.metadata.creationTimestamp).getTime()
  );

  return (
    <SectionBox title="KNative Revisions">
      {sorted.length === 0 ? (
        <Box p={4} textAlign="center">
          <Typography color="text.secondary">
            No KNative revisions found.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Namespace</strong></TableCell>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Image</strong></TableCell>
                <TableCell><strong>Concurrency</strong></TableCell>
                <TableCell><strong>Age</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map(rev => {
                const readyStatus = getReadyStatus(rev.status?.conditions);
                const image = rev.spec?.containers?.[0]?.image;
                const serviceName =
                  rev.metadata.labels?.['serving.knative.dev/service'] ??
                  rev.metadata.ownerReferences?.find(r => r.kind === 'Service')?.name;
                const concurrency = rev.spec?.containerConcurrency;

                return (
                  <TableRow key={rev.metadata.uid} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {rev.metadata.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{rev.metadata.namespace}</TableCell>
                    <TableCell>
                      {serviceName ? (
                        <Chip label={serviceName} size="small" variant="outlined" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <ReadyChip status={readyStatus} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{
                          maxWidth: 260,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={image}
                      >
                        {image ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {concurrency === undefined ? '—' : concurrency === 0 ? 'Unlimited' : concurrency}
                    </TableCell>
                    <TableCell>{formatAge(rev.metadata.creationTimestamp)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionBox>
  );
}
