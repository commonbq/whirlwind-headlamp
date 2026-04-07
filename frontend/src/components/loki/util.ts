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

import { ConfigStore } from '../../plugin/configStore';
import { isLokiInstalled } from './request';

export const PLUGIN_NAME = 'loki';

export type ClusterData = {
  isLogsEnabled?: boolean;
  autoDetect?: boolean;
  address?: string;
  subPath?: string;
  defaultTimespan?: string;
  limit?: number;
};

type Conf = {
  [cluster: string]: ClusterData;
};

export function getConfigStore(): ConfigStore<Conf> {
  return new ConfigStore<Conf>(PLUGIN_NAME);
}

export function getClusterConfig(cluster: string): ClusterData | null {
  const conf = getConfigStore().get();
  if (!cluster || !conf) return null;
  return conf[cluster] || null;
}

export function enableLogs(cluster: string) {
  const store = getConfigStore();
  const config = store.get() || {};
  store.update({
    ...config,
    [cluster]: {
      ...(config[cluster] || { autoDetect: true }),
      isLogsEnabled: true,
    },
  });
}

export function disableLogs(cluster: string) {
  const store = getConfigStore();
  const config = store.get() || {};
  store.update({
    ...config,
    [cluster]: {
      ...(config[cluster] || { autoDetect: true }),
      isLogsEnabled: false,
    },
  });
}

export function isLogsEnabled(cluster: string): boolean {
  return getClusterConfig(cluster)?.isLogsEnabled ?? false;
}

export async function getLokiPrefix(cluster: string): Promise<string | null> {
  const clusterData = getClusterConfig(cluster);

  if (clusterData?.autoDetect !== false) {
    const endpoint = await isLokiInstalled();
    if (endpoint.found) {
      const portStr = endpoint.port ? `:${endpoint.port}` : '';
      return `${endpoint.namespace}/services/${endpoint.name}${portStr}`;
    }
    return null;
  }

  if (clusterData?.address) {
    const [namespace, service] = clusterData.address.split('/');
    return `${namespace}/services/${service}`;
  }
  return null;
}

export function getLokiSubPath(cluster: string): string | null {
  const data = getClusterConfig(cluster);
  return !data?.subPath || data.subPath === '' ? null : data.subPath;
}

export function getLokiTimespan(cluster: string): string {
  return getClusterConfig(cluster)?.defaultTimespan ?? '1h';
}

export function getLokiLimit(cluster: string): number {
  return getClusterConfig(cluster)?.limit ?? 1000;
}

export const LogEnabledKinds = [
  'Pod',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'ReplicaSet',
  'Job',
  'CronJob',
];
