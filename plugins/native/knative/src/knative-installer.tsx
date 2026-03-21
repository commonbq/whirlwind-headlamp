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
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import { installKNativeOperator, KNATIVE_OPERATOR_VERSION } from './common';

/** Milliseconds to show the success message before triggering the parent reload. */
const RELOAD_DELAY_MS = 2000;

type InstallState = 'idle' | 'installing' | 'done' | 'error';

interface KNativeInstallerProps {
  /** Called when installation finishes successfully so the parent can reload its data. */
  onInstalled: () => void;
}

/**
 * Shown in place of the normal KNative views when the Serving/Eventing CRDs are
 * not present (HTTP 404).  The component lets the user kick off a one-click
 * installation of the KNative Operator and then configure Serving and Eventing.
 */
export default function KNativeInstaller({ onInstalled }: KNativeInstallerProps) {
  const [state, setState] = useState<InstallState>('idle');
  const [currentStep, setCurrentStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleInstall() {
    setState('installing');
    setErrorMsg('');
    try {
      await installKNativeOperator(step => setCurrentStep(step));
      setState('done');
      // Give the user a moment to read the success message, then trigger a reload.
      setTimeout(onInstalled, RELOAD_DELAY_MS);
    } catch (err: any) {
      setErrorMsg(err?.message ?? String(err));
      setState('error');
    }
  }

  return (
    <SectionBox title="KNative Not Installed">
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 700 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CloudOutlinedIcon color="action" sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h6">KNative is not installed in this cluster</Typography>
            <Typography variant="body2" color="text.secondary">
              KNative Serving and Eventing CRDs were not found. You can install the KNative Operator
              ({KNATIVE_OPERATOR_VERSION}) automatically, or follow the manual steps below.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ── Live progress ─────────────────────────────────────────────── */}
        {state === 'installing' && (
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <CircularProgress size={20} />
            <Typography variant="body2">{currentStep}</Typography>
          </Box>
        )}

        {state === 'done' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            KNative installed successfully! Reloading…
          </Alert>
        )}

        {state === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* ── Install button ────────────────────────────────────────────── */}
        {state !== 'done' && (
          <Button
            variant="contained"
            disabled={state === 'installing'}
            onClick={handleInstall}
            sx={{ mb: 3 }}
          >
            {state === 'installing' ? 'Installing…' : 'Install KNative Operator'}
          </Button>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ── Manual installation steps ─────────────────────────────────── */}
        <Typography variant="subtitle2" gutterBottom>
          Manual installation (alternative)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Run the following commands against your cluster, then refresh this page:
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 1,
            p: 2,
            fontSize: '0.8rem',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {`# Install the KNative Operator
kubectl apply -f https://github.com/knative/operator/releases/download/knative-${KNATIVE_OPERATOR_VERSION}/operator.yaml

# Create namespaces
kubectl create namespace knative-serving
kubectl create namespace knative-eventing

# Configure Serving
kubectl apply -f - <<EOF
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
spec: {}
EOF

# Configure Eventing
kubectl apply -f - <<EOF
apiVersion: operator.knative.dev/v1beta1
kind: KnativeEventing
metadata:
  name: knative-eventing
  namespace: knative-eventing
spec: {}
EOF`}
        </Box>
      </Paper>
    </SectionBox>
  );
}
