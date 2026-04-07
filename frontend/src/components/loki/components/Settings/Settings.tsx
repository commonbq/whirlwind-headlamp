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

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClustersConf } from '../../../../lib/k8s';
import { request } from '../../../../lib/k8s/apiProxy';
import { NameValueTable } from '../../../common';
import { buildLokiBasePath } from '../../request';

function isValidAddress(address: string): boolean {
  const regex = /^[a-z0-9-]+\/[a-z0-9-]+:[0-9]+$/;
  return regex.test(address);
}

interface SettingsProps {
  readonly data?: { [key: string]: any };
  onDataChange?: (newData: { [key: string]: any }) => void;
}

export function Settings(props: SettingsProps) {
  const { t } = useTranslation();
  const { data, onDataChange } = props;
  const handleDataChange = onDataChange ?? (() => {});
  const [selectedCluster, setSelectedCluster] = useState('');
  const [addressError, setAddressError] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const clusters = useClustersConf() || {};

  useEffect(() => {
    if (Object.keys(clusters).length > 0 && !selectedCluster) {
      setSelectedCluster(Object.keys(clusters)[0]);
    }
  }, [clusters, selectedCluster]);

  useEffect(() => {
    if (selectedCluster && !data?.[selectedCluster]) {
      handleDataChange({
        ...data,
        [selectedCluster]: {
          isLogsEnabled: false,
          autoDetect: true,
          defaultTimespan: '1h',
          limit: 1000,
        },
      });
    }
  }, [selectedCluster, data, handleDataChange]);

  const selectedClusterData = data?.[selectedCluster] || {};
  const isLogsEnabled = selectedClusterData.isLogsEnabled ?? false;
  const isAutoDetectEnabled = isLogsEnabled && (selectedClusterData.autoDetect ?? true);
  const isAddressFieldEnabled = isLogsEnabled && !isAutoDetectEnabled;

  useEffect(() => {
    if (selectedClusterData.address) {
      setAddressError(!isValidAddress(selectedClusterData.address));
      setTestStatus('idle');
      setTestMessage('');
    } else {
      setAddressError(false);
    }
  }, [selectedClusterData.address]);

  const handleTestConnection = async () => {
    if (!selectedClusterData.address || !isValidAddress(selectedClusterData.address)) {
      setAddressError(true);
      setTestMessage(t('Invalid Address Format'));
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    setTestMessage(t('Testing Connection'));

    try {
      const [namespace, serviceAndPort] = selectedClusterData.address.split('/');
      const [service, port] = serviceAndPort.split(':');

      const basePath = buildLokiBasePath(selectedClusterData.subPath);
      const proxyUrl = `/clusters/${selectedCluster}/api/v1/namespaces/${namespace}/services/${service}:${port}/proxy/${basePath}/ready`;
      await request(proxyUrl, { method: 'GET', isJSON: false });

      setTestStatus('success');
      setTestMessage(t('Connection successful!'));
    } catch (err) {
      setTestStatus('error');
      const errorMessage = err instanceof Error ? err.message : String(err);
      setTestMessage(t('Connection failed: {{ errorMessage }}', { errorMessage }));
      console.error(err);
    }
  };

  const settingsRows = [
    {
      name: t('Enable Logs'),
      value: (
        <Switch
          checked={isLogsEnabled}
          onChange={e => {
            const newEnabled = e.target.checked;
            handleDataChange({
              ...(data || {}),
              [selectedCluster]: {
                ...((data || {})[selectedCluster] || {}),
                isLogsEnabled: newEnabled,
                autoDetect: newEnabled ? (data?.[selectedCluster]?.autoDetect ?? true) : false,
              },
            });
          }}
        />
      ),
    },
    {
      name: t('Auto detect'),
      value: (
        <Switch
          disabled={!isLogsEnabled}
          checked={isAutoDetectEnabled}
          onChange={e =>
            handleDataChange({
              ...(data || {}),
              [selectedCluster]: {
                ...((data || {})[selectedCluster] || {}),
                autoDetect: e.target.checked,
              },
            })
          }
        />
      ),
    },
    {
      name: t('Loki Service Address'),
      value: (
        <Box display="flex" flexDirection="column" width="100%">
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              disabled={!isAddressFieldEnabled}
              helperText={
                addressError
                  ? t('Invalid format. Use: namespace/service-name:port')
                  : t(
                      'Address of the Loki Service, only used when auto-detection is disabled. Format: namespace/service-name:port'
                    )
              }
              error={addressError}
              value={selectedClusterData.address || ''}
              onChange={e => {
                const newAddress = e.target.value;
                handleDataChange({
                  ...(data || {}),
                  [selectedCluster]: {
                    ...((data || {})[selectedCluster] || {}),
                    address: newAddress,
                  },
                });
                setAddressError(!isValidAddress(newAddress));
              }}
            />
            <Button
              variant="contained"
              disabled={
                !isAddressFieldEnabled ||
                addressError ||
                !selectedClusterData.address ||
                testStatus === 'testing'
              }
              onClick={handleTestConnection}
              sx={{ mt: 1, minWidth: '100px' }}
            >
              {t('Test Connection')}
            </Button>
          </Box>
          {testStatus !== 'idle' && testMessage && (
            <Alert
              severity={testStatus === 'success' ? 'success' : 'error'}
              sx={{ mt: 2, width: 'fit-content' }}
            >
              {testMessage}
            </Alert>
          )}
        </Box>
      ),
    },
    {
      name: t('Loki Service Subpath'),
      value: (
        <TextField
          value={selectedClusterData.subPath || ''}
          disabled={!isAddressFieldEnabled}
          helperText={t(
            "Optional subpath to the Loki Service endpoint. Only used when auto-detection is disabled. Example: 'loki-gateway'."
          )}
          onChange={e => {
            const newSubPath = e.target.value;
            handleDataChange({
              ...(data || {}),
              [selectedCluster]: {
                ...((data || {})[selectedCluster] || {}),
                subPath: newSubPath,
              },
            });
          }}
        />
      ),
    },
    {
      name: t('Default Timespan'),
      value: (
        <Select
          disabled={!isLogsEnabled}
          value={selectedClusterData.defaultTimespan || '1h'}
          onChange={e =>
            handleDataChange({
              ...(data || {}),
              [selectedCluster]: {
                ...((data || {})[selectedCluster] || {}),
                defaultTimespan: e.target.value,
              },
            })
          }
        >
          <MenuItem value={'10m'}>{t('10 minutes')}</MenuItem>
          <MenuItem value={'30m'}>{t('30 minutes')}</MenuItem>
          <MenuItem value={'1h'}>{t('1 hour')}</MenuItem>
          <MenuItem value={'3h'}>{t('3 hours')}</MenuItem>
          <MenuItem value={'6h'}>{t('6 hours')}</MenuItem>
          <MenuItem value={'12h'}>{t('12 hours')}</MenuItem>
          <MenuItem value={'24h'}>{t('24 hours')}</MenuItem>
        </Select>
      ),
    },
    {
      name: t('Log Limit'),
      value: (
        <Select
          disabled={!isLogsEnabled}
          value={selectedClusterData.limit ?? 1000}
          onChange={e =>
            handleDataChange({
              ...(data || {}),
              [selectedCluster]: {
                ...((data || {})[selectedCluster] || {}),
                limit: Number(e.target.value),
              },
            })
          }
        >
          <MenuItem value={100}>100</MenuItem>
          <MenuItem value={500}>500</MenuItem>
          <MenuItem value={1000}>1000</MenuItem>
          <MenuItem value={2500}>2500</MenuItem>
          <MenuItem value={5000}>5000</MenuItem>
        </Select>
      ),
    },
  ];

  return (
    <Box width={'80%'}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">{t('Select Cluster')}</Typography>
        <Select value={selectedCluster} onChange={e => setSelectedCluster(e.target.value)}>
          {Object.keys(clusters).map(clusterName => (
            <MenuItem key={clusterName} value={clusterName}>
              {clusterName}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <NameValueTable rows={settingsRows} />
    </Box>
  );
}
