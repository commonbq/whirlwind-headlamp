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
  isKNativeNotInstalled,
  KNativeBroker,
  KNativeTrigger,
  useKNativeList,
} from './common';
import KNativeInstaller from './knative-installer';
import { ReadyChip } from './knative-services';

export default function KNativeEventing() {
  const {
    items: brokers,
    error: brokersError,
    reload: reloadBrokers,
  } = useKNativeList<KNativeBroker>('/apis/eventing.knative.dev/v1/brokers');
  const {
    items: triggers,
    error: triggersError,
    reload: reloadTriggers,
  } = useKNativeList<KNativeTrigger>('/apis/eventing.knative.dev/v1/triggers');

  // Show the installer when Eventing CRDs are missing.
  if (isKNativeNotInstalled(brokersError) || isKNativeNotInstalled(triggersError)) {
    return (
      <KNativeInstaller
        onInstalled={() => {
          reloadBrokers();
          reloadTriggers();
        }}
      />
    );
  }

  return (
    <SectionBox title="KNative Eventing">
      {/* Brokers */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Brokers
      </Typography>
      {brokersError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {brokersError}
        </Alert>
      )}
      {!brokersError && brokers === null && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      )}
      {!brokersError && brokers !== null && brokers.length === 0 && (
        <Box mb={3} p={2} textAlign="center">
          <Typography color="text.secondary">No brokers found.</Typography>
        </Box>
      )}
      {!brokersError && brokers !== null && brokers.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Namespace</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell>
                  <strong>Address URL</strong>
                </TableCell>
                <TableCell>
                  <strong>Age</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {brokers.map(broker => {
                const readyStatus = getReadyStatus(broker.status?.conditions);
                const addressUrl = broker.status?.address?.url;
                return (
                  <TableRow key={broker.metadata.uid} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {broker.metadata.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{broker.metadata.namespace}</TableCell>
                    <TableCell>
                      <ReadyChip status={readyStatus} />
                    </TableCell>
                    <TableCell>
                      {addressUrl ? (
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          sx={{ wordBreak: 'break-all' }}
                        >
                          {addressUrl}
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{formatAge(broker.metadata.creationTimestamp)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Triggers */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Triggers
      </Typography>
      {triggersError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {triggersError}
        </Alert>
      )}
      {!triggersError && triggers === null && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      )}
      {!triggersError && triggers !== null && triggers.length === 0 && (
        <Box mb={3} p={2} textAlign="center">
          <Typography color="text.secondary">No triggers found.</Typography>
        </Box>
      )}
      {!triggersError && triggers !== null && triggers.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Namespace</strong>
                </TableCell>
                <TableCell>
                  <strong>Broker</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell>
                  <strong>Subscriber</strong>
                </TableCell>
                <TableCell>
                  <strong>Filter</strong>
                </TableCell>
                <TableCell>
                  <strong>Age</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {triggers.map(trigger => {
                const readyStatus = getReadyStatus(trigger.status?.conditions);
                const subscriber = trigger.spec?.subscriber?.ref
                  ? `${trigger.spec.subscriber.ref.kind}/${trigger.spec.subscriber.ref.name}`
                  : trigger.spec?.subscriber?.uri ?? '—';
                const filterAttrs = trigger.spec?.filter?.attributes;
                return (
                  <TableRow key={trigger.metadata.uid} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {trigger.metadata.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{trigger.metadata.namespace}</TableCell>
                    <TableCell>
                      <Chip label={trigger.spec?.broker ?? '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <ReadyChip status={readyStatus} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {subscriber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {filterAttrs ? (
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {Object.entries(filterAttrs).map(([k, v]) => (
                            <Chip key={k} label={`${k}: ${v}`} size="small" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          (any)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatAge(trigger.metadata.creationTimestamp)}</TableCell>
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
