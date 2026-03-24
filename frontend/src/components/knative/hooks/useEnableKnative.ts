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

import { apply } from '../../../lib/k8s/api/v1/apply';
import ClusterRoleBinding from '../../../lib/k8s/clusterRoleBinding';
import type { KubeObjectInterfaceCreate } from '../../../lib/k8s/KubeObject';
import { useAuthorization } from './useAuthorization';

const KNATIVE_HELM_NAMESPACE = 'flux-system';
const KNATIVE_HELM_REPO_NAME = 'knative';
const KNATIVE_HELM_RELEASE_NAME = 'knative-serving';
const KNATIVE_HELM_CHART = 'knative-serving';
const KNATIVE_HELM_REPO_URL = 'https://charts.knative.dev';

interface FluxHelmRepository extends KubeObjectInterfaceCreate {
  apiVersion: 'source.toolkit.fluxcd.io/v1beta2';
  kind: 'HelmRepository';
  spec: {
    interval: string;
    url: string;
  };
}

interface FluxHelmRelease extends KubeObjectInterfaceCreate {
  apiVersion: 'helm.toolkit.fluxcd.io/v2beta2';
  kind: 'HelmRelease';
  spec: {
    interval: string;
    chart: {
      spec: {
        chart: string;
        version: string;
        sourceRef: {
          kind: 'HelmRepository';
          name: string;
          namespace: string;
        };
      };
    };
  };
}

/**
 * Applies the Flux HelmRepository and HelmRelease resources needed to install
 * Knative Serving via the Flux Helm Controller.
 *
 * @param cluster - The cluster to install Knative on.
 */
async function enableKnativeViaHelmController(cluster?: string): Promise<void> {
  const helmRepo: FluxHelmRepository = {
    apiVersion: 'source.toolkit.fluxcd.io/v1beta2',
    kind: 'HelmRepository',
    metadata: {
      name: KNATIVE_HELM_REPO_NAME,
      namespace: KNATIVE_HELM_NAMESPACE,
    },
    spec: {
      interval: '10m',
      url: KNATIVE_HELM_REPO_URL,
    },
  };

  const helmRelease: FluxHelmRelease = {
    apiVersion: 'helm.toolkit.fluxcd.io/v2beta2',
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
  };

  await apply(helmRepo, cluster);
  await apply(helmRelease, cluster);
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
