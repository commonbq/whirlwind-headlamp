import { ConfigStore } from '../../plugin/configStore';
import { KarpenterDisruptionChart } from './components/Chart/KarpenterDisruptionChart/KarpenterDisruptionChart';
import { NodeClaimCreationChart } from './components/Chart/KarpenterNodeClaimCreationChart/KarpenterNodeClaimCreationChart';
import { KarpenterNodeClaimsProvisionChart } from './components/Chart/KarpenterNodeClaimProvisionChart/KarpenterNodeClaimProvisionChart';
import { KarpenterNodePoolResourceChart } from './components/Chart/KarpenterNodePoolResourceChart/KarpenterNodePoolResourceChart';
import { KarpenterPendingPods } from './components/Chart/KarpenterPendingPods/KarpenterPendingPods';
import { isPrometheusInstalled, KubernetesType } from './request';

export const PLUGIN_NAME = 'prometheus';

type ClusterData = {
  autoDetect?: boolean;
  isMetricsEnabled?: boolean;
  address?: string;
  subPath?: string;
  defaultTimespan?: string;
  defaultResolution?: string;
};

type Conf = {
  [cluster: string]: ClusterData;
};

export function getConfigStore(): ConfigStore<Conf> {
  return new ConfigStore<Conf>(PLUGIN_NAME);
}

export function getClusterConfig(cluster: string): ClusterData | null {
  const configStore = getConfigStore();
  const conf = configStore.get();
  if (!cluster || !conf) {
    return null;
  }
  return conf[cluster] || null;
}

export function enableMetrics(cluster: string) {
  const store = getConfigStore();
  const config = store.get() || {};
  const clusterConfig = config[cluster] || { autoDetect: true };
  store.update({
    ...config,
    [cluster]: {
      ...clusterConfig,
      isMetricsEnabled: true,
    },
  });
}

export function disableMetrics(cluster: string) {
  const store = getConfigStore();
  const config = store.get() || {};
  const clusterConfig = config[cluster] || { autoDetect: true };
  store.update({
    ...config,
    [cluster]: {
      ...clusterConfig,
      isMetricsEnabled: false,
    },
  });
}

export function isMetricsEnabled(cluster: string): boolean {
  const clusterData = getClusterConfig(cluster);
  return clusterData?.isMetricsEnabled ?? false;
}

export async function getPrometheusPrefix(cluster: string): Promise<string | null> {
  const clusterData = getClusterConfig(cluster);
  if (clusterData?.autoDetect) {
    const prometheusEndpoint = await isPrometheusInstalled();
    if (prometheusEndpoint.type === KubernetesType.none) {
      return null;
    }
    const prometheusPortStr = prometheusEndpoint.port ? `:${prometheusEndpoint.port}` : '';
    return `${prometheusEndpoint.namespace}/${prometheusEndpoint.type}/${prometheusEndpoint.name}${prometheusPortStr}`;
  }

  if (clusterData?.address) {
    const [namespace, service] = clusterData?.address.split('/');
    return `${namespace}/services/${service}`;
  }
  return null;
}

export function getPrometheusSubPath(cluster: string): string | null {
  const clusterData = getClusterConfig(cluster);
  return !clusterData?.subPath || clusterData.subPath === '' ? null : clusterData.subPath;
}

export function getPrometheusInterval(cluster: string): string {
  const clusterData = getClusterConfig(cluster);
  return clusterData?.defaultTimespan ?? '24h';
}

export function getPrometheusResolution(cluster: string): string {
  const clusterData = getClusterConfig(cluster);
  return clusterData?.defaultResolution ?? 'medium';
}

export const ChartEnabledKinds = [
  'Pod',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'ReplicaSet',
  'Job',
  'CronJob',
  'PersistentVolumeClaim',
  'ScaledObject',
  'ScaledJob',
  'NodePool',
  'NodeClaim',
];

export function createTickTimestampFormatter(interval: string) {
  let prevRenderedTimestamp: string | null = null;

  return function (timestamp: number) {
    const date = new Date(timestamp * 1000);
    let format: string;

    switch (interval) {
      case '10m':
      case '30m':
      case '1h':
      case '3h':
      case '6h':
      case '12h':
      case '24h':
      case '48h':
        format = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        break;
      case 'today':
      case 'yesterday':
        format = `${date.getHours()}:00`;
        break;
      case 'week':
      case 'lastweek':
      case '7d':
      case '14d':
        format = `${date.getMonth() + 1}/${date.getDate()}`;
        break;
      default:
        format = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    const shouldRenderDate = format !== prevRenderedTimestamp;
    prevRenderedTimestamp = format;
    return shouldRenderDate ? format : '';
  };
}

export type PrometheusValue = [number, string];
export type PrometheusResult = {
  metric?: Record<string, string>;
  values: PrometheusValue[];
};
export type PrometheusResponse = {
  data?: {
    result?: PrometheusResult[];
  };
};
export type ChartDataPoint = { timestamp: number; y: number };

function extractChartData(values: PrometheusValue[] = []): ChartDataPoint[] {
  return values.map(([timestamp, value]) => ({
    timestamp,
    y: Number(value),
  }));
}

export function dataProcessor(response: PrometheusResponse): ChartDataPoint[] {
  const values = response?.data?.result?.[0]?.values;
  return extractChartData(values);
}

export function createDataProcessor(
  selectedIndex: number
): (response: PrometheusResponse) => ChartDataPoint[] {
  return function (response: PrometheusResponse): ChartDataPoint[] {
    const values = response?.data?.result?.[selectedIndex]?.values;
    return extractChartData(values);
  };
}

export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + units[i];
}

const DAY_IN_SECONDS = 86400;

const TIME_INTERVALS: Record<string, number> = {
  '1m': 60,
  '10m': 600,
  '30m': 1800,
  '1h': 3600,
  '3h': 10800,
  '6h': 21600,
  '12h': 43200,
  '24h': DAY_IN_SECONDS,
  '48h': 2 * DAY_IN_SECONDS,
  '7d': 7 * DAY_IN_SECONDS,
  '14d': 14 * DAY_IN_SECONDS,
};

const FIXED_STEPS: Record<string, number> = {
  '10s': 10,
  '30s': 30,
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
};

const RESOLUTION_FACTORS: Record<string, number> = {
  low: 100,
  medium: 250,
  high: 750,
};

export function getTimeRangeAndStepSize(
  interval: string,
  resolution: string
): { from: number; to: number; step: number } {
  const now = Math.floor(Date.now() / 1000);

  let from: number;
  let to: number = now;

  switch (interval) {
    case 'today':
      from = now - (now % DAY_IN_SECONDS);
      break;
    case 'yesterday':
      from = now - (now % DAY_IN_SECONDS) - DAY_IN_SECONDS;
      to = now - (now % DAY_IN_SECONDS);
      break;
    case 'week':
      from = now - 7 * DAY_IN_SECONDS;
      break;
    case 'lastweek':
      from = now - 14 * DAY_IN_SECONDS;
      to = now - 7 * DAY_IN_SECONDS;
      break;
    default: {
      const duration = TIME_INTERVALS[interval] || 600;
      from = now - duration;
      break;
    }
  }

  let step: number;

  if (resolution in FIXED_STEPS) {
    step = FIXED_STEPS[resolution];
  } else {
    const rangeMs = (to - from) * 1000;
    const factor = RESOLUTION_FACTORS[resolution] || RESOLUTION_FACTORS.medium;
    step = Math.max(Math.floor(rangeMs / factor / 1000), 1);
  }

  return { from, to, step };
}

export const getNodePoolChartConfigs = (name: string) => [
  {
    key: 'usage',
    label: 'Resource Usage',
    icon: 'mdi:chart-bar',
    queries: {
      usageQuery: `karpenter_nodepools_usage{nodepool='${name}'}`,
      limitQuery: `karpenter_nodepools_limit{nodepool='${name}'}`,
    },
    component: KarpenterNodePoolResourceChart,
  },
  {
    key: 'nodes',
    label: 'Allowed Disruptions',
    icon: 'mdi:chip',
    queries: {
      activeNodesQuery: `karpenter_nodepools_allowed_disruptions{nodepool='${name}'}`,
    },
    component: KarpenterDisruptionChart,
  },
  {
    key: 'pending-pods',
    label: 'Pending Pods',
    icon: 'mdi:clock-outline',
    queries: {
      pendingPodsQuery: `sum(karpenter_pods_state{phase='Pending'}) by (reason)`,
    },
    component: KarpenterPendingPods,
  },
];

export const getNodeClaimChartConfigs = (name: string, nodepool?: string) => [
  {
    key: 'creation-rate',
    label: 'Creation Rate',
    icon: 'mdi:chart-line-variant',
    queries: {
      nodeClaimCreationQuery: `sum(rate(karpenter_nodeclaims_created_total{nodepool="${
        nodepool || 'all'
      }"}[5m]))`,
    },
    component: NodeClaimCreationChart,
  },
  {
    key: 'provisioning-duration',
    label: 'Provisioning Duration',
    icon: 'mdi:clock-time-four',
    queries: {
      provisioningDurationQuery: `avg(rate(operator_nodeclaim_status_condition_transition_seconds_sum[5m])) / 
avg(rate(operator_nodeclaim_status_condition_transition_seconds_count[5m]))`,
    },
    component: KarpenterNodeClaimsProvisionChart,
  },
];
