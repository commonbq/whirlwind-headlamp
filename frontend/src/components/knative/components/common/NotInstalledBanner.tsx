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

import { Alert, Box, Button, Chip, CircularProgress, Link as MuiLink, Typography } from '@mui/material';
import React from 'react';
import { type InstallMethod, useEnableKnative } from '../../hooks/useEnableKnative';

interface NotInstalledBannerProps {
  isLoading?: boolean;
  /**
   * The cluster(s) on which to check permissions and enable Knative.
   * When multiple clusters are provided, only the first one is used for the
   * cluster-admin check and installation target. Multi-cluster installation
   * is not currently supported from this UI.
   */
  clusters?: string[];
}

/** Human-readable label and colour for each install method. */
interface MethodInfo {
  label: string;
  color: 'primary' | 'secondary' | 'default';
  successMsg: string;
}

const METHOD_INFO: Record<InstallMethod, MethodInfo> = {
  helm: {
    label: 'Helm Controller',
    color: 'primary',
    successMsg:
      'Knative Serving installation has been initiated via the Headlamp Helm Controller. ' +
      'It may take a few minutes for the installation to complete.',
  },
  manifest: {
    label: 'Manifest Apply',
    color: 'default',
    successMsg:
      'A Kubernetes Job has been created to install Knative Serving by applying the official manifests. ' +
      'It may take a few minutes for the Job to complete and Knative to become available.',
  },
};

export function NotInstalledBanner({ isLoading = false, clusters }: NotInstalledBannerProps) {
  const cluster = clusters && clusters.length > 0 ? clusters[0] : undefined;
  const { isClusterAdmin, isCheckingPermissions, installMethod, enableKnative } =
    useEnableKnative(cluster);

  const [isEnabling, setIsEnabling] = React.useState(false);
  const [enableError, setEnableError] = React.useState<string | null>(null);
  const [enableSuccess, setEnableSuccess] = React.useState(false);
  const [usedMethod, setUsedMethod] = React.useState<InstallMethod | null>(null);

  async function handleEnableService() {
    setIsEnabling(true);
    setEnableError(null);
    try {
      await enableKnative();
      setUsedMethod(installMethod);
      setEnableSuccess(true);
    } catch (err) {
      setEnableError(
        err instanceof Error ? err.message : 'An error occurred while enabling Knative.'
      );
    } finally {
      setIsEnabling(false);
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2} minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  const resolvedMethod = usedMethod ?? installMethod;
  const methodInfo: MethodInfo | null = resolvedMethod ? METHOD_INFO[resolvedMethod] : null;

  return (
    <Box display="flex" justifyContent="center" alignItems="center" p={2} minHeight="200px">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          width: '100%',
          maxWidth: 900,
          textAlign: 'center',
        }}
      >
        <Typography variant="h5">
          Knative was not detected on your cluster. If you haven't already, please install it.
        </Typography>
        <Typography>
          Learn how to{' '}
          <MuiLink href="https://knative.dev/docs/install/" target="_blank" rel="noopener noreferrer">
            install
          </MuiLink>{' '}
          Knative
        </Typography>

        {/* Show which install method will be used, once resolved */}
        {isClusterAdmin && !enableSuccess && methodInfo && !isCheckingPermissions && (
          <Typography variant="body2" color="text.secondary">
            Install method:{' '}
            <Chip
              label={methodInfo.label}
              color={methodInfo.color}
              size="small"
              sx={{ verticalAlign: 'middle' }}
            />
          </Typography>
        )}

        {/* Outcome messages */}
        {enableSuccess && methodInfo && (
          <Alert severity="success">{methodInfo.successMsg}</Alert>
        )}
        {enableError && <Alert severity="error">{enableError}</Alert>}

        {/* Action button — visible only to cluster-admins before success */}
        {isClusterAdmin && !enableSuccess && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleEnableService}
            disabled={isEnabling || isCheckingPermissions}
          >
            {isEnabling ? (
              <CircularProgress size={20} color="inherit" aria-label="Enabling service" />
            ) : (
              'Enable Service'
            )}
          </Button>
        )}
      </Box>
    </Box>
  );
}
