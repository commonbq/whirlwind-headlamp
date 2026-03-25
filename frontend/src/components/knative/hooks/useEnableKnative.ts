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

import { getHeadlampAPIHeaders } from '../../../helpers/getHeadlampAPIHeaders';
import { JSON_HEADERS } from '../../../lib/k8s/api/v1/constants';
import { clusterRequest } from '../../../lib/k8s/apiProxy';
import ClusterRoleBinding from '../../../lib/k8s/clusterRoleBinding';
import { useAuthorization } from './useAuthorization';

// ─── Helm controller constants ────────────────────────────────────────────────
/**
 * Community OCI Helm chart for Knative Serving, installed via the headlamp-server
 * Helm controller (the same mechanism used by the App Catalog).
 * Knative does not publish an official Helm chart to a traditional chart repo;
 * `https://charts.knative.dev` is not a valid index.
 */
const KNATIVE_RELEASE_NAME = 'knative-serving';
const KNATIVE_NAMESPACE = 'knative-serving';
const KNATIVE_OCI_CHART = 'oci://ghcr.io/knative-extensions/helm-charts/knative-serving';
/**
 * Version of the Knative Serving Helm chart to install.
 * Update this constant when a newer release should be used by default.
 */
const KNATIVE_CHART_VERSION = '1.14.1';

// ─── Polling constants ────────────────────────────────────────────────────────
const HELM_POLL_INTERVAL_MS = 5000;
/** 5-minute timeout (60 × 5 s) for the headlamp-server helm controller to complete. */
const HELM_POLL_MAX_ATTEMPTS = 60;

/**
 * The installation method that will be (or was) used:
 * - 'helm'     – headlamp-server Helm controller (OCI chart, same as App Catalog)
 * - 'manifest' – reserved for future manifest-apply fallback
 */
export type InstallMethod = 'helm' | 'manifest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Polls the headlamp-server Helm action-status endpoint until the named release
 * action completes or fails.
 *
 * @param cluster     - Target cluster name.
 * @param releaseName - Helm release name to poll.
 * @param action      - Helm action that was started: 'install', 'upgrade',
 *                      'uninstall', or 'rollback'.
 *
 * Throws when:
 * - `status` is `'failed'`
 * - `status` is an unexpected value (not 'processing', 'success', or 'failed')
 * - The maximum number of poll attempts is exceeded
 */
async function pollHelmStatus(
  cluster: string,
  releaseName: string,
  action: string
): Promise<void> {
  for (let i = 0; i < HELM_POLL_MAX_ATTEMPTS; i++) {
    const result = await clusterRequest(
      '/helm/action/status',
      { cluster, headers: getHeadlampAPIHeaders() },
      { name: releaseName, action }
    );

    const status: string | undefined = result?.status;

    if (status === 'success') return;
    if (status === 'failed') {
      throw new Error(
        result.message ||
          `Helm installation failed for release "${releaseName}". ` +
            `Inspect the failure with: helm status ${releaseName} -n ${KNATIVE_NAMESPACE}`
      );
    }
    if (status !== 'processing') {
      throw new Error(
        `Unexpected Helm action status "${status}" for release "${releaseName}".`
      );
    }

    // Still processing – skip the sleep on the last attempt to avoid an
    // unnecessary delay just before throwing the timeout error.
    if (i < HELM_POLL_MAX_ATTEMPTS - 1) {
      await new Promise<void>(resolve => setTimeout(resolve, HELM_POLL_INTERVAL_MS));
    }
  }

  throw new Error(
    'Knative installation timed out. Check the Helm release status in your cluster.'
  );
}

// ─── Installation strategy ────────────────────────────────────────────────────

/**
 * Installs Knative Serving via the headlamp-server Helm controller, mirroring
 * the flow used by the App Catalog:
 *   1. POST /helm/release/install → headlamp-server starts async installation
 *   2. Poll  /helm/action/status  → wait for 'success' or 'failed'
 */
async function installViaHelm(cluster: string): Promise<void> {
  await clusterRequest('/helm/release/install', {
    method: 'POST',
    body: JSON.stringify({
      name: KNATIVE_RELEASE_NAME,
      namespace: KNATIVE_NAMESPACE,
      description: 'Knative Serving installation via Headlamp',
      chart: KNATIVE_OCI_CHART,
      version: KNATIVE_CHART_VERSION,
      values: '',
      createNamespace: true,
      dependencyUpdate: false,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });

  await pollHelmStatus(cluster, KNATIVE_RELEASE_NAME, 'install');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Provides a one-click "Enable Service" flow for cluster-admins when Knative
 * Serving is not detected.  Uses the headlamp-server Helm controller (the same
 * mechanism as the App Catalog) to install Knative Serving.
 *
 * Exposes:
 * - `isClusterAdmin`        – true when the user can create ClusterRoleBindings
 * - `isCheckingPermissions` – true while the permission check is in flight
 * - `installMethod`         – always 'helm' (headlamp-server controller); null while loading
 * - `enableKnative()`       – triggers the Helm installation and polls for completion
 *
 * @param cluster – The cluster to check permissions for and install Knative on.
 */
export function useEnableKnative(cluster?: string): {
  isClusterAdmin: boolean | null;
  isCheckingPermissions: boolean;
  installMethod: InstallMethod | null;
  enableKnative: () => Promise<void>;
} {
  // Permission: cluster-admin proxy (can create ClusterRoleBindings)
  const { allowed: isClusterAdmin, isLoading: isCheckingPermissions } = useAuthorization({
    item: ClusterRoleBinding,
    authVerb: 'create',
    cluster,
  });

  // The headlamp-server Helm controller is always available; no additional
  // capability detection is required.
  const installMethod: InstallMethod | null = isCheckingPermissions ? null : 'helm';

  async function enableKnative() {
    if (!cluster) throw new Error('No cluster selected.');
    return installViaHelm(cluster);
  }

  return { isClusterAdmin, isCheckingPermissions, installMethod, enableKnative };
}
