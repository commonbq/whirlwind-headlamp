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

import { useState, useEffect } from 'react';
import { apply } from '../../../lib/k8s/api/v1/apply';
import { apiFactoryWithNamespace } from '../../../lib/k8s/apiProxy';
import ClusterRoleBinding from '../../../lib/k8s/clusterRoleBinding';
import CRD from '../../../lib/k8s/crd';
import Job from '../../../lib/k8s/job';
import { useAuthorization } from './useAuthorization';

// ─── Flux constants ───────────────────────────────────────────────────────────
const FLUX_NAMESPACE = 'flux-system';
/** CRD that confirms the Flux Kustomize Controller is installed. */
const FLUX_KUSTOMIZATION_CRD = 'kustomizations.kustomize.toolkit.fluxcd.io';
const KNATIVE_GIT_REPO_NAME = 'knative-serving';
const KNATIVE_KUSTOMIZATION_NAME = 'knative-serving';
const KNATIVE_GIT_URL = 'https://github.com/knative/serving';
/** Path inside the knative/serving repo that contains the core serving config. */
const KNATIVE_GIT_PATH = './config/core';

// ─── Helm CLI constants ───────────────────────────────────────────────────────
/**
 * Community OCI Helm chart for Knative Serving (tried first by the Helm Job).
 * Falls back to official release manifests if the chart is unavailable.
 * Knative does not publish official Helm charts to a traditional chart repo;
 * `https://charts.knative.dev` is not a valid index.
 */
const KNATIVE_HELM_OCI_CHART = 'oci://ghcr.io/knative-extensions/helm-charts/knative-serving';
const KNATIVE_HELM_RELEASE_NAME = 'knative-serving';
const KNATIVE_HELM_NAMESPACE = 'knative-serving';

// ─── Shared installer Job constants ───────────────────────────────────────────
const INSTALLER_NAMESPACE = 'default';
const INSTALLER_SA_NAME = 'knative-installer';
const INSTALLER_CRB_NAME = 'knative-installer-admin';
const INSTALLER_JOB_NAME = 'install-knative-serving';

// ─── Manifest fallback constants ──────────────────────────────────────────────
/**
 * Knative Serving version to install when using the Helm or manifest methods.
 * Update this constant when a newer Knative version should be used by default.
 */
const KNATIVE_VERSION = 'knative-v1.14.1';
const KNATIVE_CRDS_URL = `https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving-crds.yaml`;
const KNATIVE_CORE_URL = `https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving-core.yaml`;

/**
 * The installation method that will be (or was) used:
 * - 'flux'     – Flux GitOps (GitRepository + Kustomization from official GitHub)
 * - 'helm'     – One-shot Kubernetes Job: tries OCI Helm chart, falls back to kubectl apply
 * - 'manifest' – One-shot Kubernetes Job running `kubectl apply -f <urls>`
 */
export type InstallMethod = 'flux' | 'helm' | 'manifest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the Flux Kustomize Controller CRD is present on the cluster. */
function checkFluxInstalled(cluster: string): Promise<boolean> {
  return new Promise(resolve => {
    let cancelFn: (() => void) | null = null;
    let settled = false;

    function settle(value: boolean) {
      if (settled) return;
      settled = true;
      resolve(value);
      if (cancelFn) cancelFn();
    }

    const request = CRD.apiGet(
      () => settle(true),
      FLUX_KUSTOMIZATION_CRD,
      undefined,
      () => settle(false),
      { cluster }
    );

    request()
      .then(cancel => { cancelFn = cancel; })
      .catch(() => settle(false));
  });
}

/** Creates a shared ServiceAccount + ClusterRoleBinding for the installer Job. */
async function createInstallerRBAC(cluster: string): Promise<void> {
  await apply(
    {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: { name: INSTALLER_SA_NAME, namespace: INSTALLER_NAMESPACE },
    },
    cluster
  );

  await apply(
    {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'ClusterRoleBinding',
      metadata: { name: INSTALLER_CRB_NAME },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'cluster-admin',
      },
      subjects: [
        { kind: 'ServiceAccount', name: INSTALLER_SA_NAME, namespace: INSTALLER_NAMESPACE },
      ],
    },
    cluster
  );
}

// ─── Installation strategies ──────────────────────────────────────────────────

/**
 * Method 1 – Flux GitOps (GitRepository + Kustomization).
 * Creates a GitRepository pointing to the official Knative serving GitHub repo
 * at the pinned release tag, then a Kustomization that applies the core serving
 * config directly from that repo — no Helm chart repository needed.
 *
 * Uses apiFactoryWithNamespace directly (bypasses resourceDefToApiFactory's
 * API-discovery call) with the stable v1 APIs for both source and kustomize.
 */
async function installViaFlux(cluster: string): Promise<void> {
  const gitRepoApi = apiFactoryWithNamespace(
    'source.toolkit.fluxcd.io', 'v1', 'gitrepositories'
  );
  const kustomizationApi = apiFactoryWithNamespace(
    'kustomize.toolkit.fluxcd.io', 'v1', 'kustomizations'
  );

  await gitRepoApi.post(
    {
      apiVersion: 'source.toolkit.fluxcd.io/v1',
      kind: 'GitRepository',
      metadata: { name: KNATIVE_GIT_REPO_NAME, namespace: FLUX_NAMESPACE },
      spec: {
        interval: '10m0s',
        url: KNATIVE_GIT_URL,
        ref: { tag: KNATIVE_VERSION },
      },
    },
    {},
    cluster
  );

  await kustomizationApi.post(
    {
      apiVersion: 'kustomize.toolkit.fluxcd.io/v1',
      kind: 'Kustomization',
      metadata: { name: KNATIVE_KUSTOMIZATION_NAME, namespace: FLUX_NAMESPACE },
      spec: {
        interval: '10m0s',
        path: KNATIVE_GIT_PATH,
        prune: true,
        sourceRef: {
          kind: 'GitRepository',
          name: KNATIVE_GIT_REPO_NAME,
        },
        wait: true,
        timeout: '10m0s',
      },
    },
    {},
    cluster
  );
}

/**
 * Method 2 – Direct Helm CLI via a one-shot Kubernetes Job.
 * Uses `dtzar/helm-kubectl` (ships both helm and kubectl).
 *
 * Attempts `helm upgrade --install` from a community OCI chart first.
 * If the OCI chart is unavailable the Job automatically falls back to
 * applying the official Knative release manifests via kubectl.
 *
 * All values interpolated into the shell command are module-level compile-time
 * constants (no runtime user input), so there is no shell-injection risk.
 */
async function installViaHelm(cluster: string): Promise<void> {
  await createInstallerRBAC(cluster);

  // Try OCI Helm chart; on failure fall back to manifest apply.
  // Helm errors are printed before the fallback so they remain visible in Job logs.
  const cmd =
    `helm upgrade --install ${KNATIVE_HELM_RELEASE_NAME} ${KNATIVE_HELM_OCI_CHART}` +
    ` --namespace ${KNATIVE_HELM_NAMESPACE} --create-namespace --wait` +
    ` || { kubectl apply -f ${KNATIVE_CRDS_URL} && kubectl apply -f ${KNATIVE_CORE_URL}; }`;

  await apply(
    {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: INSTALLER_JOB_NAME, namespace: INSTALLER_NAMESPACE },
      spec: {
        ttlSecondsAfterFinished: 600,
        backoffLimit: 2,
        template: {
          spec: {
            serviceAccountName: INSTALLER_SA_NAME,
            restartPolicy: 'Never',
            containers: [{ name: 'helm-installer', image: 'dtzar/helm-kubectl:3.16', command: ['sh', '-c', cmd] }],
          },
        },
      },
    },
    cluster
  );
}

/**
 * Method 3 – Direct manifest apply via a one-shot Kubernetes Job.
 * Pulls `bitnami/kubectl:latest` and applies the official Knative release
 * manifests from GitHub.
 *
 * All values interpolated into the shell command are module-level compile-time
 * constants (no runtime user input), so there is no shell-injection risk.
 */
async function installViaManifests(cluster: string): Promise<void> {
  await createInstallerRBAC(cluster);

  const cmd = [
    `kubectl apply -f ${KNATIVE_CRDS_URL}`,
    `kubectl apply -f ${KNATIVE_CORE_URL}`,
  ].join(' && ');

  await apply(
    {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: INSTALLER_JOB_NAME, namespace: INSTALLER_NAMESPACE },
      spec: {
        ttlSecondsAfterFinished: 600,
        backoffLimit: 2,
        template: {
          spec: {
            serviceAccountName: INSTALLER_SA_NAME,
            restartPolicy: 'Never',
            containers: [{ name: 'manifest-installer', image: 'bitnami/kubectl:latest', command: ['sh', '-c', cmd] }],
          },
        },
      },
    },
    cluster
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Determines the best available installation method in priority order:
 *   1. Flux GitOps      (GitRepository + Kustomization from official Knative GitHub)
 *   2. Direct Helm CLI  (Kubernetes Job: OCI chart, falls back to manifest apply)
 *   3. Manifest apply   (Kubernetes Job running `kubectl apply -f <urls>`)
 *
 * Exposes:
 * - `isClusterAdmin`       – true when the user can create ClusterRoleBindings
 * - `isCheckingPermissions`– true while any permission check is in flight
 * - `installMethod`        – the resolved method ('flux' | 'helm' | 'manifest' | null while loading)
 * - `enableKnative()`      – runs the selected installation strategy
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
  const { allowed: isClusterAdmin, isLoading: isCheckingAdmin } = useAuthorization({
    item: ClusterRoleBinding,
    authVerb: 'create',
    cluster,
  });

  // Permission: can run installer Jobs
  const { allowed: canCreateJobs, isLoading: isCheckingJobs } = useAuthorization({
    item: Job,
    authVerb: 'create',
    cluster,
  });

  // Async Flux CRD presence check
  const [fluxInstalled, setFluxInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!cluster) {
      setFluxInstalled(false);
      return;
    }
    let cancelled = false;
    setFluxInstalled(null);
    checkFluxInstalled(cluster).then(result => {
      if (!cancelled) setFluxInstalled(result);
    });
    return () => { cancelled = true; };
  }, [cluster]);

  const isCheckingFlux = fluxInstalled === null;
  const isCheckingPermissions = isCheckingAdmin || isCheckingJobs || isCheckingFlux;

  // Resolve the install method once all checks are complete
  const installMethod: InstallMethod | null = isCheckingPermissions
    ? null
    : fluxInstalled
    ? 'flux'
    : canCreateJobs
    ? 'helm'
    : 'manifest';

  async function enableKnative() {
    if (!cluster) throw new Error('No cluster selected.');
    switch (installMethod) {
      case 'flux':
        return installViaFlux(cluster);
      case 'helm':
        return installViaHelm(cluster);
      default:
        return installViaManifests(cluster);
    }
  }

  return { isClusterAdmin, isCheckingPermissions, installMethod, enableKnative };
}
