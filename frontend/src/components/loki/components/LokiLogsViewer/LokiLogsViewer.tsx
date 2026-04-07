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

import { Icon } from '@iconify/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCluster } from '../../../../lib/k8s';
import { KubeObject } from '../../../../lib/k8s/KubeObject';
import { Loader, SectionBox } from '../../../common';
import { useEnableLoki } from '../../hooks/useEnableLoki';
import { fetchLokiLogs, LokiResponse, LokiStream } from '../../request';
import {
  getConfigStore,
  getLokiLimit,
  getLokiPrefix,
  getLokiSubPath,
  getLokiTimespan,
} from '../../util';

interface LokiLogsViewerProps {
  resource: KubeObject;
}

const TIME_INTERVALS: Record<string, number> = {
  '10m': 600,
  '30m': 1800,
  '1h': 3600,
  '3h': 10800,
  '6h': 21600,
  '12h': 43200,
  '24h': 86400,
};

function buildLogQLQuery(resource: KubeObject): string {
  const namespace = resource.jsonData.metadata.namespace;
  const name = resource.jsonData.metadata.name;
  const kind = resource.kind;

  if (kind === 'Pod') {
    return `{namespace="${namespace}", pod="${name}"}`;
  }
  if (kind === 'Job' || kind === 'CronJob') {
    return `{namespace="${namespace}", pod=~"${name}-.*"}`;
  }
  // Deployment, StatefulSet, DaemonSet, ReplicaSet
  return `{namespace="${namespace}", pod=~"${name}-.*"}`;
}

function formatLogLines(streams: LokiStream[]): string[] {
  const lines: [number, string][] = [];
  for (const stream of streams) {
    for (const [ts, line] of stream.values) {
      lines.push([Number(ts), line]);
    }
  }
  lines.sort((a, b) => a[0] - b[0]);
  return lines.map(([ts, line]) => {
    const date = new Date(ts / 1_000_000);
    return `${date.toISOString()} ${line}`;
  });
}

enum LokiState {
  LOADING,
  INSTALLED,
  NOT_FOUND,
  ERROR,
  DISABLED,
}

export function LokiLogsViewer({ resource }: LokiLogsViewerProps) {
  const { t } = useTranslation();
  const clusterName = useCluster();
  const cluster = clusterName ?? '';
  const configStore = getConfigStore();
  const useClusterConfig = configStore.useConfig();
  const clusterConfig = useClusterConfig();

  const { isClusterAdmin, isCheckingPermissions, enableLoki } = useEnableLoki(
    clusterName ?? undefined
  );
  const [isEnablingLoki, setIsEnablingLoki] = useState(false);
  const [enableLokiError, setEnableLokiError] = useState<string | null>(null);
  const [enableLokiSuccess, setEnableLokiSuccess] = useState(false);

  const [lokiState, setLokiState] = useState<LokiState>(LokiState.LOADING);
  const [lokiPrefix, setLokiPrefix] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const defaultTimespan = getLokiTimespan(cluster);
  const defaultLimit = getLokiLimit(cluster);
  const [timespan, setTimespan] = useState(defaultTimespan);
  const [limit, setLimit] = useState(defaultLimit);

  const logBoxRef = useRef<HTMLDivElement | null>(null);

  // Check if Loki is enabled and auto-detect or use manual address
  useEffect(() => {
    const isEnabled = clusterConfig?.[cluster]?.isLogsEnabled ?? false;
    if (!isEnabled) {
      setLokiState(LokiState.DISABLED);
      setLokiPrefix(null);
      return;
    }

    setLokiState(LokiState.LOADING);
    (async () => {
      try {
        const prefix = await getLokiPrefix(cluster);
        if (prefix) {
          setLokiPrefix(prefix);
          setLokiState(LokiState.INSTALLED);
        } else {
          setLokiState(LokiState.NOT_FOUND);
        }
      } catch {
        setLokiState(LokiState.ERROR);
      }
    })();
  }, [clusterConfig, cluster]);

  // Fetch logs whenever lokiPrefix or query params change
  const resourceNamespace = resource.jsonData.metadata.namespace;
  const resourceName = resource.jsonData.metadata.name;
  useEffect(() => {
    if (lokiState !== LokiState.INSTALLED || !lokiPrefix) return;

    const now = Math.floor(Date.now() / 1000);
    const duration = TIME_INTERVALS[timespan] ?? 3600;
    const start = now - duration;
    const query = buildLogQLQuery(resource);
    const subPath = getLokiSubPath(cluster);

    setIsFetching(true);
    setFetchError(null);

    fetchLokiLogs({
      prefix: lokiPrefix,
      query,
      start,
      end: now,
      limit,
      subPath: subPath ?? undefined,
    })
      .then((response: LokiResponse) => {
        const streams = response?.data?.result ?? [];
        setLogLines(formatLogLines(streams));
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [lokiState, lokiPrefix, timespan, limit, resourceNamespace, resourceName, refreshTick]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logLines]);

  if (lokiState === LokiState.DISABLED) {
    return null;
  }

  return (
    <SectionBox title={t('Loki Logs')}>
      <Paper variant="outlined" sx={{ p: 1 }}>
        {lokiState === LokiState.INSTALLED && (
          <Box display="flex" gap={1} justifyContent="flex-end" mb={1} flexWrap="wrap">
            <Tooltip title={t('Refresh logs')}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setRefreshTick(t => t + 1)}
                startIcon={<Icon icon="mdi:refresh" />}
                disabled={isFetching}
                sx={{ filter: 'grayscale(1.0)' }}
              >
                {t('Refresh')}
              </Button>
            </Tooltip>
            <Select
              variant="outlined"
              size="small"
              value={timespan}
              onChange={e => setTimespan(e.target.value)}
            >
              <MenuItem value={'10m'}>{t('10 minutes')}</MenuItem>
              <MenuItem value={'30m'}>{t('30 minutes')}</MenuItem>
              <MenuItem value={'1h'}>{t('1 hour')}</MenuItem>
              <MenuItem value={'3h'}>{t('3 hours')}</MenuItem>
              <MenuItem value={'6h'}>{t('6 hours')}</MenuItem>
              <MenuItem value={'12h'}>{t('12 hours')}</MenuItem>
              <MenuItem value={'24h'}>{t('24 hours')}</MenuItem>
            </Select>
            <Select
              variant="outlined"
              size="small"
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
            >
              <MenuItem value={100}>100 {t('lines')}</MenuItem>
              <MenuItem value={500}>500 {t('lines')}</MenuItem>
              <MenuItem value={1000}>1000 {t('lines')}</MenuItem>
              <MenuItem value={2500}>2500 {t('lines')}</MenuItem>
              <MenuItem value={5000}>5000 {t('lines')}</MenuItem>
            </Select>
          </Box>
        )}

        {lokiState === LokiState.LOADING && (
          <Box m={2}>
            <Loader title={t('Loading Loki info')} />
          </Box>
        )}

        {lokiState === LokiState.ERROR && (
          <Alert severity="warning">{t('Error connecting to Loki')}</Alert>
        )}

        {lokiState === LokiState.NOT_FOUND && (
          <Box display="flex" flexDirection="column" gap={1}>
            <Alert severity="info">
              {t(
                "Loki was not detected in your cluster. Enable Loki logs in the plugin settings and provide the service address."
              )}
            </Alert>
            {enableLokiSuccess && (
              <Alert severity="success">
                {t('Loki has been installed and is ready to use.')}
              </Alert>
            )}
            {enableLokiError && <Alert severity="error">{enableLokiError}</Alert>}
            {isClusterAdmin && !enableLokiSuccess && (
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={isEnablingLoki || isCheckingPermissions}
                  onClick={async () => {
                    setIsEnablingLoki(true);
                    setEnableLokiError(null);
                    try {
                      await enableLoki();
                      setEnableLokiSuccess(true);
                    } catch (err) {
                      setEnableLokiError(
                        err instanceof Error
                          ? err.message
                          : t('An error occurred while enabling Loki.')
                      );
                    } finally {
                      setIsEnablingLoki(false);
                    }
                  }}
                >
                  {isEnablingLoki ? (
                    <CircularProgress size={20} color="inherit" aria-label={t('Enabling service')} />
                  ) : (
                    t('Enable Service')
                  )}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {lokiState === LokiState.INSTALLED && (
          <>
            {fetchError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {t('Failed to fetch logs: {{ error }}', { error: fetchError })}
              </Alert>
            )}
            {isFetching && (
              <Box m={2}>
                <Loader title={t('Fetching logs')} />
              </Box>
            )}
            {!isFetching && logLines.length === 0 && !fetchError && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                {t('No log entries found for the selected time range.')}
              </Typography>
            )}
            {!isFetching && logLines.length > 0 && (
              <Box
                ref={logBoxRef}
                component="pre"
                sx={{
                  m: 0,
                  p: 1,
                  maxHeight: '400px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                }}
              >
                {logLines.join('\n')}
              </Box>
            )}
          </>
        )}
      </Paper>
    </SectionBox>
  );
}
