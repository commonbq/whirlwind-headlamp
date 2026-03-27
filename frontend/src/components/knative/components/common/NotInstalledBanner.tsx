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

import { Alert, Box, Button, CircularProgress, Link as MuiLink, Typography } from '@mui/material';
import React from 'react';
import { useEnableKnative } from '../../hooks/useEnableKnative';

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

const SUCCESS_MESSAGE =
  'Knative Serving has been installed through the Knative Operator flow and is ready to use.';

export function NotInstalledBanner({ isLoading = false, clusters }: NotInstalledBannerProps) {
  const cluster = clusters && clusters.length > 0 ? clusters[0] : undefined;
  const { isClusterAdmin, isCheckingPermissions, enableKnative } = useEnableKnative(cluster);

  const [isEnabling, setIsEnabling] = React.useState(false);
  const [enableError, setEnableError] = React.useState<string | null>(null);
  const [enableSuccess, setEnableSuccess] = React.useState(false);
  async function handleEnableService() {
    setIsEnabling(true);
    setEnableError(null);
    try {
      await enableKnative();
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
          <MuiLink
            href="https://knative.dev/docs/install/"
            target="_blank"
            rel="noopener noreferrer"
          >
            install
          </MuiLink>{' '}
          Knative
        </Typography>

        {/* Outcome messages */}
        {enableSuccess && <Alert severity="success">{SUCCESS_MESSAGE}</Alert>}
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
