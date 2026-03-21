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

import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { useEffect, useState } from 'react';

export interface KNativeCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface KNativeTrafficTarget {
  revisionName?: string;
  latestRevision?: boolean;
  percent: number;
  tag?: string;
  url?: string;
}

export interface KNativeServiceSpec {
  template?: {
    metadata?: {
      name?: string;
      labels?: Record<string, string>;
      annotations?: Record<string, string>;
    };
    spec?: {
      containers?: KNativeContainer[];
      containerConcurrency?: number;
      timeoutSeconds?: number;
      serviceAccountName?: string;
    };
  };
  traffic?: KNativeTrafficTarget[];
}

export interface KNativeContainer {
  name?: string;
  image: string;
  env?: { name: string; value?: string; valueFrom?: any }[];
  resources?: {
    limits?: Record<string, string>;
    requests?: Record<string, string>;
  };
  ports?: { containerPort: number; name?: string; protocol?: string }[];
  readinessProbe?: any;
  livenessProbe?: any;
}

export interface KNativeServiceStatus {
  observedGeneration?: number;
  conditions?: KNativeCondition[];
  url?: string;
  address?: { url?: string };
  latestCreatedRevisionName?: string;
  latestReadyRevisionName?: string;
  traffic?: KNativeTrafficTarget[];
}

export interface KNativeService {
  apiVersion: string;
  kind: 'Service';
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    generation?: number;
  };
  spec: KNativeServiceSpec;
  status: KNativeServiceStatus;
}

export interface KNativeRevisionSpec {
  containers?: KNativeContainer[];
  containerConcurrency?: number;
  timeoutSeconds?: number;
  serviceAccountName?: string;
}

export interface KNativeRevision {
  apiVersion: string;
  kind: 'Revision';
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    ownerReferences?: { name: string; kind: string }[];
  };
  spec: KNativeRevisionSpec;
  status: {
    conditions?: KNativeCondition[];
    observedGeneration?: number;
    logUrl?: string;
    containerStatuses?: any[];
  };
}

export interface KNativeBroker {
  apiVersion: string;
  kind: 'Broker';
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    config?: any;
    delivery?: any;
  };
  status: {
    conditions?: KNativeCondition[];
    address?: { url?: string };
  };
}

export interface KNativeTrigger {
  apiVersion: string;
  kind: 'Trigger';
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    broker: string;
    filter?: { attributes?: Record<string, string> };
    subscriber: { ref?: { apiVersion: string; kind: string; name: string }; uri?: string };
  };
  status: {
    conditions?: KNativeCondition[];
    subscriberUri?: string;
  };
}

/** Returns true when all Ready conditions are True, false when any is False, null when unknown/missing. */
export function getReadyStatus(conditions?: KNativeCondition[]): 'Ready' | 'Not Ready' | 'Unknown' {
  if (!conditions || conditions.length === 0) return 'Unknown';
  const ready = conditions.find(c => c.type === 'Ready');
  if (!ready) return 'Unknown';
  if (ready.status === 'True') return 'Ready';
  if (ready.status === 'False') return 'Not Ready';
  return 'Unknown';
}

/** Fetch all KNative resources of a given type across all namespaces. */
export function useKNativeList<T>(apiPath: string): {
  items: T[] | null;
  error: string | null;
  reload: () => void;
} {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    ApiProxy.request(apiPath)
      .then((data: any) => {
        if (!cancelled) {
          setItems(data.items || []);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          const msg: string =
            err?.status === 404
              ? 'KNative CRDs not found. Is KNative installed in this cluster?'
              : err?.message ?? String(err);
          setError(msg);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiPath, tick]);

  return { items, error, reload: () => setTick(t => t + 1) };
}

/** Fetch a single KNative resource by namespace and name. */
export function useKNativeResource<T>(apiPath: string): {
  item: T | null;
  error: string | null;
  reload: () => void;
} {
  const [item, setItem] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    setError(null);
    ApiProxy.request(apiPath)
      .then((data: any) => {
        if (!cancelled) {
          setItem(data as T);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message ?? String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiPath, tick]);

  return { item, error, reload: () => setTick(t => t + 1) };
}

/** Returns true when the error indicates KNative CRDs are not installed (HTTP 404). */
export function isKNativeNotInstalled(error: string | null): boolean {
  return error !== null && error.includes('KNative CRDs not found');
}

/** The version of the KNative Operator to install. */
export const KNATIVE_OPERATOR_VERSION = 'v1.14.1';

/** The installer namespace used to run the one-shot installation Job. */
const INSTALLER_NAMESPACE = 'knative-installer';
const INSTALLER_JOB_NAME = 'knative-operator-installer';
const INSTALLER_SA_NAME = 'knative-installer';
const INSTALLER_CRB_NAME = 'knative-installer-cluster-admin';

/** Map a Kubernetes Kind to its plural resource-name string. */
function kindToResourceName(kind: string): string {
  const mappings: Record<string, string> = {
    Namespace: 'namespaces',
    ServiceAccount: 'serviceaccounts',
    ClusterRole: 'clusterroles',
    ClusterRoleBinding: 'clusterrolebindings',
    Job: 'jobs',
    KnativeServing: 'knativeservings',
    KnativeEventing: 'knativeeventings',
  };
  return mappings[kind] ?? kind.toLowerCase() + 's';
}

/** Build the API endpoint path for a given resource. */
function resourceApiPath(apiVersion: string, kind: string, namespace?: string): string {
  const hasGroup = apiVersion.includes('/');
  const basePath = hasGroup ? `/apis/${apiVersion}` : `/api/${apiVersion}`;
  const resourceName = kindToResourceName(kind);
  if (namespace) {
    return `${basePath}/namespaces/${namespace}/${resourceName}`;
  }
  return `${basePath}/${resourceName}`;
}

/** Apply (create-or-skip-if-exists) a single Kubernetes resource object. */
async function applyResource(resource: {
  apiVersion: string;
  kind: string;
  metadata: { name: string; namespace?: string; [k: string]: any };
  [k: string]: any;
}): Promise<void> {
  const { apiVersion, kind, metadata } = resource;
  const path = resourceApiPath(apiVersion, kind, metadata.namespace);
  try {
    await ApiProxy.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    } as any);
  } catch (err: any) {
    // 409 Conflict → resource already exists; treat as success
    if (err?.status === 409) return;
    throw err;
  }
}

/** Poll a Job until it succeeds or fails (max ~5 minutes). */
async function waitForJob(namespace: string, name: string): Promise<void> {
  const maxAttempts = 60;
  const intervalMs = 5000;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const job: any = await ApiProxy.request(`/apis/batch/v1/namespaces/${namespace}/jobs/${name}`);
    if (job?.status?.succeeded && job.status.succeeded > 0) return;
    if (job?.status?.failed && job.status.failed > 0) {
      throw new Error(
        'KNative operator installer Job failed. ' +
          'Check pod logs with: kubectl logs -n knative-installer job/knative-operator-installer'
      );
    }
  }
  throw new Error('Timed out waiting for KNative operator installer Job to complete.');
}

/**
 * Install the KNative Operator into the cluster and then configure Serving and
 * Eventing.  Progress is reported via the `onStep` callback so a React component
 * can display live status updates.
 *
 * Steps executed:
 *  1. Create the `knative-installer` namespace.
 *  2. Create a ServiceAccount + cluster-admin ClusterRoleBinding in that namespace.
 *  3. Launch a one-shot kubectl Job that applies the official operator manifest.
 *  4. Wait for the Job to succeed.
 *  5. Create the `knative-serving` and `knative-eventing` namespaces.
 *  6. Create KnativeServing and KnativeEventing custom resources so the operator
 *     installs Serving and Eventing.
 */
export async function installKNativeOperator(onStep: (step: string) => void): Promise<void> {
  // Step 1: create installer namespace
  onStep('Creating installer namespace…');
  await applyResource({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: INSTALLER_NAMESPACE },
  });

  // Step 2: ServiceAccount + cluster-admin binding
  onStep('Creating installer ServiceAccount and RBAC…');
  await applyResource({
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: { name: INSTALLER_SA_NAME, namespace: INSTALLER_NAMESPACE },
  });
  await applyResource({
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRoleBinding',
    metadata: { name: INSTALLER_CRB_NAME },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'cluster-admin',
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: INSTALLER_SA_NAME,
        namespace: INSTALLER_NAMESPACE,
      },
    ],
  });

  // Step 3: launch installer Job
  onStep('Launching KNative Operator installer Job…');
  const manifestUrl = `https://github.com/knative/operator/releases/download/knative-${KNATIVE_OPERATOR_VERSION}/operator.yaml`;
  await applyResource({
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: { name: INSTALLER_JOB_NAME, namespace: INSTALLER_NAMESPACE },
    spec: {
      ttlSecondsAfterFinished: 600,
      template: {
        spec: {
          serviceAccountName: INSTALLER_SA_NAME,
          restartPolicy: 'OnFailure',
          containers: [
            {
              name: 'installer',
              image: 'bitnami/kubectl:1.29',
              command: ['/bin/sh', '-c', `kubectl apply -f ${manifestUrl}`],
            },
          ],
        },
      },
    },
  });

  // Step 4: wait for the Job to finish
  onStep('Waiting for KNative Operator to be installed (this may take a few minutes)…');
  await waitForJob(INSTALLER_NAMESPACE, INSTALLER_JOB_NAME);

  // Step 5: create knative-serving and knative-eventing namespaces
  onStep('Creating knative-serving namespace…');
  await applyResource({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: 'knative-serving' },
  });
  onStep('Creating knative-eventing namespace…');
  await applyResource({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: 'knative-eventing' },
  });

  // Step 6: create KnativeServing and KnativeEventing CRs
  onStep('Configuring KNative Serving…');
  await applyResource({
    apiVersion: 'operator.knative.dev/v1beta1',
    kind: 'KnativeServing',
    metadata: { name: 'knative-serving', namespace: 'knative-serving' },
    spec: {},
  });
  onStep('Configuring KNative Eventing…');
  await applyResource({
    apiVersion: 'operator.knative.dev/v1beta1',
    kind: 'KnativeEventing',
    metadata: { name: 'knative-eventing', namespace: 'knative-eventing' },
    spec: {},
  });

  onStep('KNative installation complete!');
}

/** Format age from a creationTimestamp string. */
export function formatAge(creationTimestamp: string): string {
  if (!creationTimestamp) return '-';
  const created = new Date(creationTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return `${diffSeconds}s`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}
