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
import { makeCustomResourceClass } from '../../../lib/k8s/crd';
import Namespace from '../../../lib/k8s/namespace';
import { useAuthorization } from './useAuthorization';

const KNATIVE_OPERATOR_RELEASE_NAME = 'knative-operator';
const KNATIVE_OPERATOR_NAMESPACE = 'knative-operator';
const KNATIVE_OPERATOR_REPOSITORY_NAME = 'knative-operator';
const KNATIVE_OPERATOR_REPOSITORY_URL = 'https://knative.github.io/operator';
const KNATIVE_OPERATOR_CHART = `${KNATIVE_OPERATOR_REPOSITORY_NAME}/knative-operator`;

const KNATIVE_SERVING_NAME = 'knative-serving';
const KNATIVE_NAMESPACE = 'knative-serving';

const HELM_POLL_INTERVAL_MS = 5000;
const HELM_POLL_MAX_ATTEMPTS = 60;
const RESOURCE_POLL_INTERVAL_MS = 5000;
const OPERATOR_CRD_POLL_MAX_ATTEMPTS = 36;
const SERVING_READY_POLL_MAX_ATTEMPTS = 120;

const KNATIVE_SERVING_CRD_NAME = 'knativeservings.operator.knative.dev';

const KnativeServing = makeCustomResourceClass({
  apiInfo: [{ group: 'operator.knative.dev', version: 'v1beta1' }],
  kind: 'KnativeServing',
  pluralName: 'knativeservings',
  singularName: 'knativeserving',
  isNamespaced: true,
});

/**
 * The installation method that will be (or was) used:
 * - 'helm' – headlamp-server Helm controller installing the Knative Operator
 *   and then creating the KnativeServing custom resource.
 */
export type InstallMethod = 'helm';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Polls the headlamp-server Helm action-status endpoint until the named release
 * action completes or fails.
 *
 * @param cluster     - Target cluster name.
 * @param releaseName - Helm release name to poll.
 * @param action      - Helm action that was started.
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
            `Inspect the failure with: helm status ${releaseName} -n ${KNATIVE_NAMESPACE}`
      );
    }
    if (status !== 'processing') {
      throw new Error(`Unexpected Helm action status "${status}" for release "${releaseName}".`);
    }

    if (i < HELM_POLL_MAX_ATTEMPTS - 1) {
      await sleep(HELM_POLL_INTERVAL_MS);
    }
  }

  throw new Error('Knative installation timed out. Check the Helm release status in your cluster.');
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
      repo.name === KNATIVE_OPERATOR_REPOSITORY_NAME && repo.url === KNATIVE_OPERATOR_REPOSITORY_URL
  );

  if (hasRepository) {
    return;
  }

  await clusterRequest('/helm/repositories', {
    method: 'POST',
    body: JSON.stringify({
      name: KNATIVE_OPERATOR_REPOSITORY_NAME,
      url: KNATIVE_OPERATOR_REPOSITORY_URL,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });
}

async function ensureOperatorInstalled(cluster: string): Promise<void> {
  const existingRelease = await getHelmRelease(
    cluster,
    KNATIVE_OPERATOR_RELEASE_NAME,
    KNATIVE_OPERATOR_NAMESPACE
  );

  if (existingRelease) {
    return;
  }

  await clusterRequest('/helm/release/install', {
    method: 'POST',
    body: JSON.stringify({
      name: KNATIVE_OPERATOR_RELEASE_NAME,
      namespace: KNATIVE_OPERATOR_NAMESPACE,
      description: 'Knative Operator installation via Headlamp',
      chart: KNATIVE_OPERATOR_CHART,
      version: '',
      values: '',
      createNamespace: true,
      dependencyUpdate: false,
    }),
    headers: { ...JSON_HEADERS, ...getHeadlampAPIHeaders() },
    cluster,
  });

  await pollHelmStatus(cluster, KNATIVE_OPERATOR_RELEASE_NAME, 'install');
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

async function ensureNamespace(cluster: string, namespace: string): Promise<void> {
  try {
    await clusterRequest(`/api/v1/namespaces/${namespace}`, { cluster });
    return;
  } catch (err) {
    if ((err as { status?: number }).status !== 404) {
      throw err;
    }
  }

  try {
    await Namespace.apiEndpoint.post(
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: namespace },
      },
      {},
      cluster
    );
  } catch (err) {
    if ((err as { status?: number }).status !== 409) {
      throw err;
    }
  }
}

async function ensureKnativeServingResource(cluster: string): Promise<void> {
  try {
    await clusterRequest(
      `/apis/operator.knative.dev/v1beta1/namespaces/${KNATIVE_NAMESPACE}/knativeservings/${KNATIVE_SERVING_NAME}`,
      { cluster }
    );

    return;
  } catch (err) {
    if ((err as { status?: number }).status !== 404) {
      throw err;
    }
  }

  try {
    await KnativeServing.apiEndpoint.post(
      {
        apiVersion: 'operator.knative.dev/v1beta1',
        kind: 'KnativeServing',
        metadata: {
          name: KNATIVE_SERVING_NAME,
          namespace: KNATIVE_NAMESPACE,
        },
        spec: {
          ingress: {
            kourier: {
              enabled: true,
            },
          },
        },
      },
      {},
      cluster
    );
  } catch (err) {
    if ((err as { status?: number }).status !== 409) {
      throw err;
    }
  }
}

async function waitForKnativeServingReady(cluster: string): Promise<void> {
  for (let i = 0; i < SERVING_READY_POLL_MAX_ATTEMPTS; i++) {
    let serving:
      | {
          status?: {
            conditions?: Array<{
              type?: string;
              status?: string;
              reason?: string;
              message?: string;
            }>;
          };
        }
      | undefined;

    try {
      serving = (await clusterRequest(
        `/apis/operator.knative.dev/v1beta1/namespaces/${KNATIVE_NAMESPACE}/knativeservings/${KNATIVE_SERVING_NAME}`,
        { cluster }
      )) as {
        status?: {
          conditions?: Array<{ type?: string; status?: string; reason?: string; message?: string }>;
        };
      };
    } catch (err) {
      if ((err as { status?: number }).status !== 404) {
        throw err;
      }
    }

    const readyCondition = serving?.status?.conditions?.find(
      condition => condition.type === 'Ready'
    );

    if (readyCondition?.status === 'True') {
      return;
    }

    if (i < SERVING_READY_POLL_MAX_ATTEMPTS - 1) {
      await sleep(RESOURCE_POLL_INTERVAL_MS);
    } else {
      throw new Error(
        readyCondition?.message ||
          readyCondition?.reason ||
          'Timed out waiting for Knative Serving to become ready.'
      );
    }
  }
}

async function installViaHelm(cluster: string): Promise<void> {
  await ensureOperatorRepository(cluster);
  await ensureOperatorInstalled(cluster);
  await waitForCrd(cluster, KNATIVE_SERVING_CRD_NAME);
  await ensureNamespace(cluster, KNATIVE_NAMESPACE);
  await ensureKnativeServingResource(cluster);
  await waitForKnativeServingReady(cluster);
}

/**
 * Provides a one-click "Enable Service" flow for cluster-admins when Knative
 * Serving is not detected. Uses the headlamp-server Helm controller to install
 * the Knative Operator, then creates the KnativeServing resource and waits for
 * Serving to become ready.
 *
 * Exposes:
 * - `isClusterAdmin`        – true when the user can create ClusterRoleBindings
 * - `isCheckingPermissions` – true while the permission check is in flight
 * - `installMethod`         – always 'helm'; null while loading
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
  const { allowed: isClusterAdmin, isLoading: isCheckingPermissions } = useAuthorization({
    item: ClusterRoleBinding,
    authVerb: 'create',
    cluster,
  });

  const installMethod: InstallMethod | null = isCheckingPermissions ? null : 'helm';

  async function enableKnative() {
    if (!cluster) throw new Error('No cluster selected.');
    return installViaHelm(cluster);
  }

  return { isClusterAdmin, isCheckingPermissions, installMethod, enableKnative };
}
