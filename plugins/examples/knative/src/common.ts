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
export function getReadyStatus(
  conditions?: KNativeCondition[]
): 'Ready' | 'Not Ready' | 'Unknown' {
  if (!conditions || conditions.length === 0) return 'Unknown';
  const ready = conditions.find(c => c.type === 'Ready');
  if (!ready) return 'Unknown';
  if (ready.status === 'True') return 'Ready';
  if (ready.status === 'False') return 'Not Ready';
  return 'Unknown';
}

/** Fetch all KNative resources of a given type across all namespaces. */
export function useKNativeList<T>(
  apiPath: string
): { items: T[] | null; error: string | null; reload: () => void } {
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
              : (err?.message ?? String(err));
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
export function useKNativeResource<T>(
  apiPath: string
): { item: T | null; error: string | null; reload: () => void } {
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
