import { request } from '../../lib/k8s/apiProxy';

const CUSTOM_HEADLAMP_LABEL = 'headlamp-prometheus=true';
// Both pods and services are queried with the same standard label; kept as separate
// constants to make the intent at each call site explicit.
const COMMON_PROMETHEUS_POD_LABEL = 'app.kubernetes.io/name=prometheus';
const COMMON_PROMETHEUS_SERVICE_LABEL = 'app.kubernetes.io/name=prometheus';
// Older Prometheus Helm chart versions and some custom deployments use the
// non-namespaced `app` label instead of `app.kubernetes.io/name`.
const COMMON_PROMETHEUS_SERVICE_LABEL_LEGACY = 'app=prometheus';
// The Prometheus Operator (used by kube-prometheus-stack) creates a service named
// `prometheus-operated` with this label when it reconciles a Prometheus CR.
const OPERATOR_PROMETHEUS_SERVICE_LABEL = 'operated-prometheus=true';
const DEFAULT_PROMETHEUS_PORT = '9090';

export type KubernetesPodListResponseItem = {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    containers: [
      {
        name: string;
        image: string;
        ports?: [
          {
            name: string;
            containerPort: number;
            protocol: string;
          }
        ];
      }
    ];
  };
};

export type KubernetesPodListResponse = {
  kind: 'PodList';
  items: KubernetesPodListResponseItem[];
};

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

export type KubernetesSearchResponse = KubernetesPodListResponse | KubernetesServiceListResponse;

export enum KubernetesType {
  none = 'none',
  pods = 'pods',
  services = 'services',
}

export type PrometheusEndpoint = {
  type: KubernetesType;
  name: string | undefined;
  namespace: string | undefined;
  port: string | undefined;
};

export function createPrometheusEndpoint(
  type: KubernetesType = KubernetesType.none,
  name: string | undefined = undefined,
  namespace: string | undefined = undefined,
  port: string | undefined = undefined
): PrometheusEndpoint {
  return {
    type,
    name,
    namespace,
    port,
  };
}

export async function isPrometheusInstalled(): Promise<PrometheusEndpoint> {
  const podSearchSpecificResponse = await searchKubernetesByLabel(
    KubernetesType.pods,
    CUSTOM_HEADLAMP_LABEL
  );
  if (podSearchSpecificResponse.type !== KubernetesType.none) {
    return podSearchSpecificResponse;
  }

  const serviceSearchSpecificResponse = await searchKubernetesByLabel(
    KubernetesType.services,
    CUSTOM_HEADLAMP_LABEL
  );
  if (serviceSearchSpecificResponse.type !== KubernetesType.none) {
    return serviceSearchSpecificResponse;
  }

  const podSearchResponse = await searchKubernetesByLabel(
    KubernetesType.pods,
    COMMON_PROMETHEUS_POD_LABEL
  );
  if (podSearchResponse.type !== KubernetesType.none) {
    return podSearchResponse;
  }

  const serviceSearchResponse = await searchKubernetesByLabel(
    KubernetesType.services,
    COMMON_PROMETHEUS_SERVICE_LABEL
  );
  if (serviceSearchResponse.type !== KubernetesType.none) {
    return serviceSearchResponse;
  }

  const serviceSearchLegacyResponse = await searchKubernetesByLabel(
    KubernetesType.services,
    COMMON_PROMETHEUS_SERVICE_LABEL_LEGACY
  );
  if (serviceSearchLegacyResponse.type !== KubernetesType.none) {
    return serviceSearchLegacyResponse;
  }

  // The Prometheus Operator (used by kube-prometheus-stack) creates a service named
  // `prometheus-operated` that is accessible via the Kubernetes API proxy.
  const serviceSearchOperatorResponse = await searchKubernetesByLabel(
    KubernetesType.services,
    OPERATOR_PROMETHEUS_SERVICE_LABEL
  );
  if (serviceSearchOperatorResponse.type !== KubernetesType.none) {
    return serviceSearchOperatorResponse;
  }

  return createPrometheusEndpoint();
}

async function searchKubernetesByLabel(
  kubernetesType: KubernetesType,
  labelSelector: string
): Promise<PrometheusEndpoint> {
  if (kubernetesType === KubernetesType.none) {
    return createPrometheusEndpoint();
  }

  const queryParams = new URLSearchParams();
  queryParams.append('labelSelector', labelSelector);

  const searchResponse = await request(`/api/v1/${kubernetesType}?${queryParams}`, {
    method: 'GET',
  });

  if (!searchResponse?.kind || ['PodList', 'ServiceList'].indexOf(searchResponse.kind) === -1) {
    return createPrometheusEndpoint();
  }

  const searchResponseTyped = searchResponse as KubernetesSearchResponse;

  if (searchResponseTyped.items?.length > 0) {
    for (const item of searchResponseTyped.items) {
      const metadata = item.metadata;
      if (!metadata) {
        continue;
      }

      const prometheusName = metadata.name;
      const prometheusNamespace = metadata.namespace;
      const prometheusPorts = getPrometheusPortsFromItem(searchResponseTyped.kind, item);

      const testResults = await Promise.all(
        prometheusPorts.map(async prometheusPort => {
          const testSuccess = await testPrometheusQuery(
            kubernetesType,
            prometheusName,
            prometheusNamespace,
            prometheusPort
          );
          return {
            prometheusPort,
            testSuccess,
          };
        })
      );

      for (const result of testResults) {
        if (result.testSuccess) {
          return createPrometheusEndpoint(
            kubernetesType,
            prometheusName,
            prometheusNamespace,
            result.prometheusPort
          );
        }
      }
    }
  }

  return createPrometheusEndpoint();
}

function getPrometheusPortsFromItem(
  kind: KubernetesSearchResponse['kind'],
  item: KubernetesSearchResponse['items'][number]
): string[] {
  const ports: string[] = [];
  if (kind === 'PodList') {
    const podItem = item as KubernetesPodListResponseItem;
    for (const container of podItem.spec.containers) {
      for (const port of container.ports ?? []) {
        if (port.protocol === 'TCP') {
          ports.push(String(port.containerPort));
        }
      }
    }
  } else if (kind === 'ServiceList') {
    const serviceItem = item as KubernetesServiceListResponseItem;
    for (const port of serviceItem.spec.ports ?? []) {
      if (port.protocol === 'TCP') {
        ports.push(String(port.port));
      }
    }
  }

  if (ports.length === 0) {
    ports.push(DEFAULT_PROMETHEUS_PORT);
  }

  return ports;
}

async function testPrometheusQuery(
  kubernetesType: KubernetesType,
  prometheusName: string,
  prometheusNamespace: string,
  prometheusPort: string
): Promise<boolean> {
  const testSuccess = await fetchMetrics({
    prefix: `${prometheusNamespace}/${kubernetesType}/${prometheusName}${
      prometheusPort ? `:${prometheusPort}` : ''
    }`,
    query: 'up',
    from: Math.floor(Date.now() / 1000) - 86400,
    to: Math.floor(Date.now() / 1000),
    step: 300,
  })
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });

  return testSuccess;
}

export async function fetchMetrics(data: {
  prefix: string;
  query: string;
  from: number;
  to: number;
  step: number;
  subPath?: string;
}): Promise<object> {
  const params = new URLSearchParams();
  if (data.from) {
    params.append('start', data.from.toString());
  }
  if (data.to) {
    params.append('end', data.to.toString());
  }
  if (data.step) {
    params.append('step', data.step.toString());
  }
  if (data.query) {
    params.append('query', data.query);
  }
  let url = `/api/v1/namespaces/${data.prefix}/proxy/api/v1/query_range?${params.toString()}`;
  if (data.subPath && data.subPath !== '') {
    if (data.subPath.startsWith('/')) {
      data.subPath = data.subPath.slice(1);
    }
    if (data.subPath.endsWith('/')) {
      data.subPath = data.subPath.slice(0, -1);
    }
    url = `/api/v1/namespaces/${data.prefix}/proxy/${
      data.subPath
    }/api/v1/query_range?${params.toString()}`;
  }

  const response = await request(url, {
    method: 'GET',
    isJSON: false,
  });
  if (response.status === 200) {
    return response.json();
  } else {
    const error = new Error(response.statusText);
    return Promise.reject(error);
  }
}
