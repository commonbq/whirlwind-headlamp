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

export const SEAWEEDFS_OPERATOR_RELEASE_NAME = 'seaweedfs-operator';
export const SEAWEEDFS_OPERATOR_NAMESPACE = 'seaweedfs-operator';
export const SEAWEEDFS_OPERATOR_REPOSITORY_NAME = 'seaweedfs-operator';
export const SEAWEEDFS_OPERATOR_REPOSITORY_URL = 'https://seaweedfs.github.io/seaweedfs-operator';
const SEAWEEDFS_OPERATOR_CHART = `${SEAWEEDFS_OPERATOR_REPOSITORY_NAME}/seaweedfs-operator`;

const SEAWEEDFS_CRD_NAME = 'seaweedfs.seaweedfs.com';

const HELM_POLL_INTERVAL_MS = 5000;
const HELM_POLL_MAX_ATTEMPTS = 60;
const RESOURCE_POLL_INTERVAL_MS = 5000;
const OPERATOR_CRD_POLL_MAX_ATTEMPTS = 36;

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
            `Inspect the failure with: helm status ${releaseName} -n ${SEAWEEDFS_OPERATOR_NAMESPACE}`
      );
    }
    if (status !== 'processing') {
      throw new Error(`Unexpected Helm action status "${status}" for release "${releaseName}".`);
    }

    if (i < HELM_POLL_MAX_ATTEMPTS - 1) {
      await sleep(HELM_POLL_INTERVAL_MS);
    }
  }

  throw new Error(
    'SeaweedFS Operator installation timed out. Check the Helm release status in your cluster.'
  );
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

async function ensureOperatorRepository(cluster: string): Promise<void> {
  const response = (await clusterRequest('/helm/repositories', {
    cluster,
    headers: getHeadlampAPIHeaders(),
  })) as {
    repositories?: Array<{ name: string; url: string }>;
  };

  const hasRepository = response.repositories?.some(
    repo =>
      repo.name === SEAWEEDFS_OPERATOR_REPOSITORY_NAME &&
      repo.url === SEAWEEDFS_OPERATOR_REPOSITORY_URL
  );

  if (hasRepository) {
    return;
  }

  await clusterRequest('/helm/repositories', {
    method: 'POST',
    body: JSON.stringify({
      name: SEAWEEDFS_OPERATOR_REPOSITORY_NAME,
      url: SEAWEEDFS_OPERATOR_REPOSITORY_URL,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });
}

async function ensureOperatorInstalled(cluster: string): Promise<void> {
  const existingRelease = await getHelmRelease(
    cluster,
    SEAWEEDFS_OPERATOR_RELEASE_NAME,
    SEAWEEDFS_OPERATOR_NAMESPACE
  );

  if (existingRelease) {
    return;
  }

  await clusterRequest('/helm/release/install', {
    method: 'POST',
    body: JSON.stringify({
      name: SEAWEEDFS_OPERATOR_RELEASE_NAME,
      namespace: SEAWEEDFS_OPERATOR_NAMESPACE,
      description: 'SeaweedFS Operator installation via Headlamp',
      chart: SEAWEEDFS_OPERATOR_CHART,
      version: '',
      values: '',
      createNamespace: true,
      dependencyUpdate: false,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });

  await pollHelmStatus(cluster, SEAWEEDFS_OPERATOR_RELEASE_NAME, 'install');
}

async function waitForCrd(cluster: string, crdName: string): Promise<void> {
  for (let i = 0; i < OPERATOR_CRD_POLL_MAX_ATTEMPTS; i++) {
    try {
      await clusterRequest(`/apis/apiextensions.k8s.io/v1/customresourcedefinitions/${crdName}`, {
        cluster,
      });

      return;
    } catch (err) {
      if ((err as { status?: number }).status !== 404) {
        throw err;
      }
    }

    if (i < OPERATOR_CRD_POLL_MAX_ATTEMPTS - 1) {
      await sleep(RESOURCE_POLL_INTERVAL_MS);
    }
  }

  throw new Error(`Timed out waiting for CRD "${crdName}" to become available.`);
}

async function installViaHelm(cluster: string): Promise<void> {
  await ensureOperatorRepository(cluster);
  await ensureOperatorInstalled(cluster);
  await waitForCrd(cluster, SEAWEEDFS_CRD_NAME);
}

/**
 * Provides a one-click "Enable Service" flow for cluster-admins when SeaweedFS
 * Operator is not detected. Uses the headlamp-server Helm controller to install
 * the SeaweedFS Operator and waits for its CRDs to become available.
 *
 * Exposes:
 * - `isClusterAdmin`        – true when the user can create ClusterRoleBindings
 * - `isCheckingPermissions` – true while the permission check is in flight
 * - `enableSeaweedFS()`     – triggers the Helm installation and polls for completion
 *
 * @param cluster – The cluster to check permissions for and install SeaweedFS on.
 */
export function useEnableSeaweedFS(cluster?: string): {
  isClusterAdmin: boolean | null;
  isCheckingPermissions: boolean;
  enableSeaweedFS: () => Promise<void>;
} {
  const { allowed: isClusterAdmin, isLoading: isCheckingPermissions } = useAuthorization({
    item: ClusterRoleBinding,
    authVerb: 'create',
    cluster,
  });

  async function enableSeaweedFS() {
    if (!cluster) throw new Error('No cluster selected.');
    return installViaHelm(cluster);
  }

  return { isClusterAdmin, isCheckingPermissions, enableSeaweedFS };
}
