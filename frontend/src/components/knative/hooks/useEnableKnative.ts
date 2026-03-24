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

import { apiFactoryWithNamespace } from '../../../lib/k8s/apiProxy';
import ClusterRoleBinding from '../../../lib/k8s/clusterRoleBinding';
import CRD from '../../../lib/k8s/crd';
import { useAuthorization } from './useAuthorization';

const KNATIVE_HELM_NAMESPACE = 'flux-system';
const KNATIVE_HELM_REPO_NAME = 'knative';
const KNATIVE_HELM_RELEASE_NAME = 'knative-serving';
const KNATIVE_HELM_CHART = 'knative-serving';
const KNATIVE_HELM_REPO_URL = 'https://charts.knative.dev';

/** CRD name that indicates the Flux Helm Controller is installed. */
const FLUX_HELM_RELEASE_CRD_NAME = 'helmreleases.helm.toolkit.fluxcd.io';

/**
 * Checks whether the Flux Helm Controller is installed on the cluster by
 * looking for its HelmRelease CRD.
 */
function checkFluxInstalled(cluster: string): Promise<boolean> {
  return new Promise(resolve => {
    let cancelFn: (() => void) | null = null;
    let settled = false;

    function settle(result: boolean) {
      if (settled) return;
      settled = true;
      resolve(result);
      if (cancelFn) cancelFn();
    }

    const request = CRD.apiGet(
      () => settle(true),
      FLUX_HELM_RELEASE_CRD_NAME,
      undefined,
      () => settle(false),
      { cluster }
    );

    request()
      .then(cancel => {
        cancelFn = cancel;
      })
      .catch(() => settle(false));
  });
}

/**
 * Applies the Flux HelmRepository and HelmRelease resources needed to install
 * Knative Serving via the Flux Helm Controller.
 *
 * Uses apiFactoryWithNamespace directly (bypassing resourceDefToApiFactory's
 * API-discovery request) so that no 404 is triggered against the Flux API
 * group discovery endpoint. Tries the stable v1/v2 APIs first (Flux ≥ 2.3),
 * and automatically falls back to v1beta2/v2beta2 for older Flux installations.
 *
 * @param cluster - The cluster to install Knative on.
 */
async function enableKnativeViaHelmController(cluster?: string): Promise<void> {
  if (!cluster) {
    throw new Error('No cluster selected.');
  }

  const fluxAvailable = await checkFluxInstalled(cluster);
  if (!fluxAvailable) {
    throw new Error(
      'Flux Helm Controller is not installed on this cluster. ' +
        'Please install Flux first (https://fluxcd.io/flux/installation/), ' +
        'then click "Enable Service" again.'
    );
  }

  // Build API clients that try the stable API (Flux ≥ 2.3) first, then fall
  // back to the beta APIs automatically on 404.
  // The as any cast mirrors the same pattern used in KubeObject.apiEndpoint for
  // classes with multiple apiVersion values (e.g. CRD, GatewayClass).
  const helmRepoVersionArgs = [
    ['source.toolkit.fluxcd.io', 'v1', 'helmrepositories'],
    ['source.toolkit.fluxcd.io', 'v1beta2', 'helmrepositories'],
  ];
  const helmReleaseVersionArgs = [
    ['helm.toolkit.fluxcd.io', 'v2', 'helmreleases'],
    ['helm.toolkit.fluxcd.io', 'v2beta2', 'helmreleases'],
  ];

  const helmRepoApi = apiFactoryWithNamespace(...(helmRepoVersionArgs as any));
  const helmReleaseApi = apiFactoryWithNamespace(...(helmReleaseVersionArgs as any));

  await helmRepoApi.post(
    {
      apiVersion: 'source.toolkit.fluxcd.io/v1',
      kind: 'HelmRepository',
      metadata: {
        name: KNATIVE_HELM_REPO_NAME,
        namespace: KNATIVE_HELM_NAMESPACE,
      },
      spec: {
        interval: '10m',
        url: KNATIVE_HELM_REPO_URL,
      },
    },
    {},
    cluster
  );

  await helmReleaseApi.post(
    {
      apiVersion: 'helm.toolkit.fluxcd.io/v2',
      kind: 'HelmRelease',
      metadata: {
        name: KNATIVE_HELM_RELEASE_NAME,
        namespace: KNATIVE_HELM_NAMESPACE,
      },
      spec: {
        interval: '10m',
        chart: {
          spec: {
            chart: KNATIVE_HELM_CHART,
            version: '>=0.1.0',
            sourceRef: {
              kind: 'HelmRepository',
              name: KNATIVE_HELM_REPO_NAME,
              namespace: KNATIVE_HELM_NAMESPACE,
            },
          },
        },
      },
    },
    {},
    cluster
  );
}

/**
 * Hook that checks whether the current user has cluster-admin level permissions
 * (by checking if they can create ClusterRoleBindings) and provides a function
 * to enable Knative Serving on the cluster via the Flux Helm Controller.
 *
 * @param cluster - The cluster to check permissions for and install Knative on.
 * @returns An object with:
 *   - `isClusterAdmin`: true if the user has cluster-admin permissions, false/null otherwise
 *   - `isCheckingPermissions`: true while the permission check is in progress
 *   - `enableKnative`: async function that installs Knative via the Helm controller
 */
export function useEnableKnative(cluster?: string): {
  isClusterAdmin: boolean | null;
  isCheckingPermissions: boolean;
  enableKnative: () => Promise<void>;
} {
  const { allowed: isClusterAdmin, isLoading: isCheckingPermissions } = useAuthorization({
    item: ClusterRoleBinding,
    authVerb: 'create',
    cluster,
  });

  async function enableKnative() {
    await enableKnativeViaHelmController(cluster);
  }

  return { isClusterAdmin, isCheckingPermissions, enableKnative };
}
