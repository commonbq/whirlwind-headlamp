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
import { useAuthorization } from '../../knative/hooks/useAuthorization';

const LOKI_RELEASE_NAME = 'loki';
const LOKI_NAMESPACE = 'loki';
const LOKI_REPOSITORY_NAME = 'grafana';
const LOKI_REPOSITORY_URL = 'https://grafana.github.io/helm-charts';
const LOKI_CHART = `${LOKI_REPOSITORY_NAME}/loki`;

const HELM_POLL_INTERVAL_MS = 5000;
const HELM_POLL_MAX_ATTEMPTS = 60;

// Minimal values for a single-binary Loki deployment without authentication.
const LOKI_HELM_VALUES = `loki:
  auth_enabled: false
deploymentMode: SingleBinary
singleBinary:
  replicas: 1
backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0
`;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Polls the headlamp-server Helm action-status endpoint until the named release
 * action completes or fails.
 */
async function pollHelmStatus(cluster: string, releaseName: string, action: string): Promise<void> {
  const query = new URLSearchParams({ name: releaseName, action }).toString();

  for (let i = 0; i < HELM_POLL_MAX_ATTEMPTS; i++) {
    const result = await clusterRequest(`/helm/action/status?${query}`, {
      cluster,
      headers: getHeadlampAPIHeaders(),
    });

    const status: string | undefined = result?.status;

    if (status === 'success') return;
    if (status === 'failed') {
      throw new Error(
        result.message ||
          `Helm installation failed for release "${releaseName}". ` +
            `Inspect the failure with: helm status ${releaseName} -n ${LOKI_NAMESPACE}`
      );
    }
    if (status !== 'processing') {
      throw new Error(`Unexpected Helm action status "${status}" for release "${releaseName}".`);
    }

    if (i < HELM_POLL_MAX_ATTEMPTS - 1) {
      await sleep(HELM_POLL_INTERVAL_MS);
    }
  }

  throw new Error('Loki installation timed out. Check the Helm release status in your cluster.');
}

async function getHelmRelease(
  cluster: string,
  name: string,
  namespace: string
): Promise<any | null> {
  const query = new URLSearchParams({ name, namespace }).toString();

  try {
    return await clusterRequest(`/helm/releases?${query}`, {
      cluster,
      headers: getHeadlampAPIHeaders(),
    });
  } catch (err) {
    if ((err as { status?: number }).status === 404) {
      return null;
    }

    throw err;
  }
}

async function ensureLokiRepository(cluster: string): Promise<void> {
  const response = (await clusterRequest('/helm/repositories', {
    cluster,
    headers: getHeadlampAPIHeaders(),
  })) as {
    repositories?: Array<{ name: string; url: string }>;
  };

  const hasRepository = response.repositories?.some(
    repo => repo.name === LOKI_REPOSITORY_NAME && repo.url === LOKI_REPOSITORY_URL
  );

  if (hasRepository) {
    return;
  }

  await clusterRequest('/helm/repositories', {
    method: 'POST',
    body: JSON.stringify({
      name: LOKI_REPOSITORY_NAME,
      url: LOKI_REPOSITORY_URL,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });
}

async function ensureLokiInstalled(cluster: string): Promise<void> {
  const existingRelease = await getHelmRelease(cluster, LOKI_RELEASE_NAME, LOKI_NAMESPACE);

  if (existingRelease) {
    return;
  }

  await clusterRequest('/helm/release/install', {
    method: 'POST',
    body: JSON.stringify({
      name: LOKI_RELEASE_NAME,
      namespace: LOKI_NAMESPACE,
      description: 'Loki installation via Headlamp',
      chart: LOKI_CHART,
      version: '',
      values: LOKI_HELM_VALUES,
      createNamespace: true,
      dependencyUpdate: false,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });

  await pollHelmStatus(cluster, LOKI_RELEASE_NAME, 'install');
}

async function installViaHelm(cluster: string): Promise<void> {
  await ensureLokiRepository(cluster);
  await ensureLokiInstalled(cluster);
}

/**
 * Provides a one-click "Enable Service" flow for cluster-admins when Loki
 * is not detected. Uses the headlamp-server Helm controller to install
 * Loki in single-binary mode.
 *
 * Exposes:
 * - `isClusterAdmin`        – true when the user can create ClusterRoleBindings
 * - `isCheckingPermissions` – true while the permission check is in flight
 * - `enableLoki()`          – triggers the Helm installation and polls for completion
 *
 * @param cluster – The cluster to check permissions for and install Loki on.
 */
export function useEnableLoki(cluster?: string): {
  isClusterAdmin: boolean | null;
  isCheckingPermissions: boolean;
  enableLoki: () => Promise<void>;
} {
  const { allowed: isClusterAdmin, isLoading: isCheckingPermissions } = useAuthorization({
    item: ClusterRoleBinding,
    authVerb: 'create',
    cluster,
  });

  async function enableLoki() {
    if (!cluster) throw new Error('No cluster selected.');
    return installViaHelm(cluster);
  }

  return { isClusterAdmin, isCheckingPermissions, enableLoki };
}
