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

import { request } from '../../lib/k8s/apiProxy';

/**
 * Normalises a subPath string and combines it with the Loki API base path.
 * Returns e.g. "my-prefix/loki" or just "loki" when subPath is empty.
 */
export function buildLokiBasePath(subPath: string | null | undefined): string {
  if (!subPath) return 'loki';
  const trimmed = subPath.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${trimmed}/loki` : 'loki';
}

const CUSTOM_HEADLAMP_LABEL = 'headlamp-loki=true';
const COMMON_LOKI_SERVICE_LABEL = 'app.kubernetes.io/name=loki';
const COMMON_LOKI_SERVICE_LABEL_LEGACY = 'app=loki';
const DEFAULT_LOKI_PORT = '3100';

export type KubernetesServiceListResponseItem = {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    ports?: [
      {
        name: string;
        port: number;
        protocol: string;
      }
    ];
  };
};

export type KubernetesServiceListResponse = {
  kind: 'ServiceList';
  items: KubernetesServiceListResponseItem[];
};

export type LokiEndpoint = {
  name: string | undefined;
  namespace: string | undefined;
  port: string | undefined;
  found: boolean;
};

function createLokiEndpoint(
  found = false,
  name: string | undefined = undefined,
  namespace: string | undefined = undefined,
  port: string | undefined = undefined
): LokiEndpoint {
  return { found, name, namespace, port };
}

export async function isLokiInstalled(): Promise<LokiEndpoint> {
  const specificResult = await searchServicesByLabel(CUSTOM_HEADLAMP_LABEL);
  if (specificResult.found) return specificResult;

  const commonResult = await searchServicesByLabel(COMMON_LOKI_SERVICE_LABEL);
  if (commonResult.found) return commonResult;

  const legacyResult = await searchServicesByLabel(COMMON_LOKI_SERVICE_LABEL_LEGACY);
  if (legacyResult.found) return legacyResult;

  return createLokiEndpoint();
}

async function searchServicesByLabel(labelSelector: string): Promise<LokiEndpoint> {
  const queryParams = new URLSearchParams();
  queryParams.append('labelSelector', labelSelector);

  const response = await request(`/api/v1/services?${queryParams}`, {
    method: 'GET',
  });

  if (response?.kind !== 'ServiceList' || !Array.isArray(response.items)) {
    console.debug('Loki: unexpected response from service search', response?.kind);
    return createLokiEndpoint();
  }

  const typed = response as KubernetesServiceListResponse;

  for (const item of typed.items) {
    const { name, namespace } = item.metadata;
    const ports: string[] = [];
    for (const p of item.spec.ports ?? []) {
      if (p.protocol === 'TCP') {
        ports.push(String(p.port));
      }
    }
    if (ports.length === 0) {
      ports.push(DEFAULT_LOKI_PORT);
    }

    for (const port of ports) {
      const ok = await testLokiReady(namespace, name, port);
      if (ok) {
        return createLokiEndpoint(true, name, namespace, port);
      }
    }
  }

  return createLokiEndpoint();
}

async function testLokiReady(
  namespace: string,
  name: string,
  port: string
): Promise<boolean> {
  try {
    const url = `/api/v1/namespaces/${namespace}/services/${name}:${port}/proxy/ready`;
    const response = await request(url, { method: 'GET', isJSON: false });
    return response.status === 200;
  } catch {
    return false;
  }
}

export type LokiStream = {
  stream: Record<string, string>;
  values: [string, string][]; // [nanosecond_timestamp, log_line]
};

export type LokiResponse = {
  data?: {
    result?: LokiStream[];
  };
};

export async function fetchLokiLogs(data: {
  prefix: string; // "namespace/services/name:port"
  query: string;  // LogQL query string
  start: number;  // unix seconds
  end: number;    // unix seconds
  limit?: number;
  subPath?: string;
}): Promise<LokiResponse> {
  const params = new URLSearchParams();
  params.append('query', data.query);
  params.append('start', String(data.start * 1_000_000_000)); // nanoseconds
  params.append('end', String(data.end * 1_000_000_000));
  params.append('limit', String(data.limit ?? 1000));
  params.append('direction', 'forward');

  const basePath = buildLokiBasePath(data.subPath);
  const url = `/api/v1/namespaces/${data.prefix}/proxy/${basePath}/api/v1/query_range?${params.toString()}`;

  const response = await request(url, { method: 'GET', isJSON: false });
  if (response.status === 200) {
    return response.json();
  }
  throw new Error(response.statusText);
}
