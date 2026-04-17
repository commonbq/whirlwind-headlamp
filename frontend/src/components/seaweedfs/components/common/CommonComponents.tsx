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

import { Box, Button, CircularProgress, Link as MuiLink, Typography } from '@mui/material';
import { useState } from 'react';
import { EditorDialog } from '../../../app-catalog/components/charts/EditorDialog';
import {
  SEAWEEDFS_OPERATOR_NAMESPACE,
  SEAWEEDFS_OPERATOR_RELEASE_NAME,
  SEAWEEDFS_OPERATOR_REPOSITORY_NAME,
  SEAWEEDFS_OPERATOR_REPOSITORY_URL,
  useEnableSeaweedFS,
} from '../../hooks/useEnableSeaweedFS';

/** Synthetic chart object used to open EditorDialog for SeaweedFS Operator installation. */
const SEAWEEDFS_CHART_FOR_EDITOR = {
  name: SEAWEEDFS_OPERATOR_RELEASE_NAME,
  repository: {
    name: SEAWEEDFS_OPERATOR_REPOSITORY_NAME,
    url: SEAWEEDFS_OPERATOR_REPOSITORY_URL,
  },
  version: '',
};

interface NotInstalledBannerProps {
  isLoading?: boolean;
  /**
   * The cluster(s) on which to check permissions and enable SeaweedFS.
   * When multiple clusters are provided, only the first one is used for the
   * cluster-admin check and installation target.
   */
  clusters?: string[];
}

export function NotInstalledBanner({ isLoading = false, clusters }: NotInstalledBannerProps) {
  const cluster = clusters && clusters.length > 0 ? clusters[0] : undefined;
  const { isClusterAdmin, isCheckingPermissions } = useEnableSeaweedFS(cluster);
  const [editorOpen, setEditorOpen] = useState(false);

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
          SeaweedFS Operator was not detected on your cluster. If you haven't already, please
          install it.
        </Typography>
        <Typography>
          Learn how to{' '}
          <MuiLink
            href="https://github.com/seaweedfs/seaweedfs-operator"
            target="_blank"
            rel="noopener noreferrer"
          >
            install
          </MuiLink>{' '}
          SeaweedFS Operator
        </Typography>

        {isClusterAdmin && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setEditorOpen(true)}
            disabled={isCheckingPermissions}
          >
            Enable Service
          </Button>
        )}
        <EditorDialog
          openEditor={editorOpen}
          chart={SEAWEEDFS_CHART_FOR_EDITOR}
          handleEditor={setEditorOpen}
          chartProfile="seaweedfs"
          initialReleaseName={SEAWEEDFS_OPERATOR_RELEASE_NAME}
          initialNamespace={SEAWEEDFS_OPERATOR_NAMESPACE}
        />
      </Box>
    </Box>
  );
}
