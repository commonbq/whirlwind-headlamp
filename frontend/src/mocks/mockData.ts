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

/**
 * Mock data for TEST mode. Provides realistic K8s resource data so the UI
 * can be exercised without a real cluster.
 */

export const TEST_CLUSTER_NAME = 'test-cluster';

const now = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

// ---------------------------------------------------------------------------
// Config / cluster list  (backend /config endpoint)
// ---------------------------------------------------------------------------

export const mockConfig = {
  clusters: [
    {
      name: TEST_CLUSTER_NAME,
      auth_type: '',
      server: 'https://test-cluster.example.com',
      meta_data: {
        namespace: 'default',
      },
    },
  ],
  isDynamicClusterEnabled: false,
};

// ---------------------------------------------------------------------------
// Headlamp version  (/version)
// ---------------------------------------------------------------------------

export const mockVersion = {
  major: '1',
  minor: '29',
  gitVersion: 'v1.29.0',
  gitCommit: 'abcdef1234567890',
  gitTreeState: 'clean',
  buildDate: '2024-01-01T00:00:00Z',
  goVersion: 'go1.21.0',
  compiler: 'gc',
  platform: 'linux/amd64',
};

// ---------------------------------------------------------------------------
// Kubernetes server version  (/clusters/:cluster/version)
// ---------------------------------------------------------------------------

export const mockClusterVersion = {
  major: '1',
  minor: '29',
  gitVersion: 'v1.29.0',
};

// ---------------------------------------------------------------------------
// Namespaces
// ---------------------------------------------------------------------------

export const mockNamespaces = {
  kind: 'NamespaceList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'Namespace',
      apiVersion: 'v1',
      metadata: {
        name: 'default',
        uid: 'ns-default-uid',
        resourceVersion: '100',
        creationTimestamp: oneDayAgo,
        labels: { 'kubernetes.io/metadata.name': 'default' },
      },
      spec: { finalizers: ['kubernetes'] },
      status: { phase: 'Active' },
    },
    {
      kind: 'Namespace',
      apiVersion: 'v1',
      metadata: {
        name: 'kube-system',
        uid: 'ns-kube-system-uid',
        resourceVersion: '101',
        creationTimestamp: oneDayAgo,
        labels: { 'kubernetes.io/metadata.name': 'kube-system' },
      },
      spec: { finalizers: ['kubernetes'] },
      status: { phase: 'Active' },
    },
    {
      kind: 'Namespace',
      apiVersion: 'v1',
      metadata: {
        name: 'monitoring',
        uid: 'ns-monitoring-uid',
        resourceVersion: '102',
        creationTimestamp: oneDayAgo,
        labels: {
          'kubernetes.io/metadata.name': 'monitoring',
          // This marks the namespace as belonging to the "demo-project" project
          'headlamp.dev/project-id': 'demo-project',
        },
      },
      spec: { finalizers: ['kubernetes'] },
      status: { phase: 'Active' },
    },
  ],
};

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export const mockNodes = {
  kind: 'NodeList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'Node',
      apiVersion: 'v1',
      metadata: {
        name: 'test-node-1',
        uid: 'node-1-uid',
        resourceVersion: '200',
        creationTimestamp: oneDayAgo,
        labels: {
          'beta.kubernetes.io/arch': 'amd64',
          'beta.kubernetes.io/os': 'linux',
          'kubernetes.io/hostname': 'test-node-1',
          'node-role.kubernetes.io/control-plane': '',
        },
      },
      spec: {
        podCIDR: '10.244.0.0/24',
        podCIDRs: ['10.244.0.0/24'],
        providerID: 'test://test-node-1',
        taints: [],
        unschedulable: false,
      },
      status: {
        addresses: [
          { type: 'InternalIP', address: '10.0.0.1' },
          { type: 'Hostname', address: 'test-node-1' },
        ],
        allocatable: {
          cpu: '4',
          'ephemeral-storage': '60Gi',
          memory: '8Gi',
          pods: '110',
        },
        capacity: {
          cpu: '4',
          'ephemeral-storage': '60Gi',
          memory: '8Gi',
          pods: '110',
        },
        conditions: [
          {
            type: 'Ready',
            status: 'True',
            lastHeartbeatTime: now,
            lastTransitionTime: oneDayAgo,
            reason: 'KubeletReady',
            message: 'kubelet is posting ready status',
          },
        ],
        nodeInfo: {
          architecture: 'amd64',
          bootID: 'boot-id-1',
          containerRuntimeVersion: 'containerd://1.7.0',
          kernelVersion: '5.15.0-91-generic',
          kubeProxyVersion: 'v1.29.0',
          kubeletVersion: 'v1.29.0',
          machineID: 'machine-id-1',
          operatingSystem: 'linux',
          osImage: 'Ubuntu 22.04.3 LTS',
          systemUUID: 'system-uuid-1',
        },
      },
    },
    {
      kind: 'Node',
      apiVersion: 'v1',
      metadata: {
        name: 'test-node-2',
        uid: 'node-2-uid',
        resourceVersion: '201',
        creationTimestamp: oneDayAgo,
        labels: {
          'beta.kubernetes.io/arch': 'amd64',
          'beta.kubernetes.io/os': 'linux',
          'kubernetes.io/hostname': 'test-node-2',
        },
      },
      spec: {
        podCIDR: '10.244.1.0/24',
        podCIDRs: ['10.244.1.0/24'],
        providerID: 'test://test-node-2',
        taints: [],
        unschedulable: false,
      },
      status: {
        addresses: [
          { type: 'InternalIP', address: '10.0.0.2' },
          { type: 'Hostname', address: 'test-node-2' },
        ],
        allocatable: {
          cpu: '4',
          'ephemeral-storage': '60Gi',
          memory: '8Gi',
          pods: '110',
        },
        capacity: {
          cpu: '4',
          'ephemeral-storage': '60Gi',
          memory: '8Gi',
          pods: '110',
        },
        conditions: [
          {
            type: 'Ready',
            status: 'True',
            lastHeartbeatTime: now,
            lastTransitionTime: oneDayAgo,
            reason: 'KubeletReady',
            message: 'kubelet is posting ready status',
          },
        ],
        nodeInfo: {
          architecture: 'amd64',
          bootID: 'boot-id-2',
          containerRuntimeVersion: 'containerd://1.7.0',
          kernelVersion: '5.15.0-91-generic',
          kubeProxyVersion: 'v1.29.0',
          kubeletVersion: 'v1.29.0',
          machineID: 'machine-id-2',
          operatingSystem: 'linux',
          osImage: 'Ubuntu 22.04.3 LTS',
          systemUUID: 'system-uuid-2',
        },
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Pods
// ---------------------------------------------------------------------------

function makePod(
  name: string,
  namespace: string,
  uid: string,
  labels: Record<string, string>,
  phase: string,
  nodeName: string,
  containerName: string,
  image: string,
  ready: boolean
) {
  return {
    kind: 'Pod',
    apiVersion: 'v1',
    metadata: {
      name,
      namespace,
      uid,
      resourceVersion: '300',
      creationTimestamp: oneHourAgo,
      labels,
    },
    spec: {
      nodeName,
      containers: [
        {
          name: containerName,
          image,
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '500m', memory: '512Mi' },
          },
        },
      ],
      restartPolicy: 'Always',
    },
    status: {
      phase,
      hostIP: nodeName === 'test-node-1' ? '10.0.0.1' : '10.0.0.2',
      podIP: '10.244.0.10',
      startTime: oneHourAgo,
      conditions: [
        { type: 'Ready', status: ready ? 'True' : 'False' },
        { type: 'ContainersReady', status: ready ? 'True' : 'False' },
        { type: 'PodScheduled', status: 'True' },
      ],
      containerStatuses: [
        {
          name: containerName,
          image,
          ready,
          restartCount: 0,
          state: ready
            ? { running: { startedAt: oneHourAgo } }
            : { waiting: { reason: 'CrashLoopBackOff' } },
        },
      ],
    },
  };
}

export const mockPodsDefault = {
  kind: 'PodList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    makePod(
      'nginx-deployment-abc12-1',
      'default',
      'pod-1-uid',
      { app: 'nginx', 'pod-template-hash': 'abc12' },
      'Running',
      'test-node-1',
      'nginx',
      'nginx:1.25',
      true
    ),
    makePod(
      'nginx-deployment-abc12-2',
      'default',
      'pod-2-uid',
      { app: 'nginx', 'pod-template-hash': 'abc12' },
      'Running',
      'test-node-2',
      'nginx',
      'nginx:1.25',
      true
    ),
    makePod(
      'backend-deploy-xyz99-1',
      'default',
      'pod-3-uid',
      { app: 'backend', 'pod-template-hash': 'xyz99' },
      'Running',
      'test-node-1',
      'backend',
      'myapp/backend:v1.2.3',
      true
    ),
    makePod(
      'failing-app-111aa-1',
      'default',
      'pod-4-uid',
      { app: 'failing-app', 'pod-template-hash': '111aa' },
      'Pending',
      'test-node-2',
      'failing-app',
      'myapp/failing:v0.1',
      false
    ),
  ],
};

export const mockPodsMonitoring = {
  kind: 'PodList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    makePod(
      'prometheus-0',
      'monitoring',
      'pod-5-uid',
      { app: 'prometheus' },
      'Running',
      'test-node-1',
      'prometheus',
      'prom/prometheus:v2.48.0',
      true
    ),
    makePod(
      'grafana-deploy-aaa11-1',
      'monitoring',
      'pod-6-uid',
      { app: 'grafana', 'pod-template-hash': 'aaa11' },
      'Running',
      'test-node-2',
      'grafana',
      'grafana/grafana:10.2.0',
      true
    ),
  ],
};

export const mockPodsAll = {
  kind: 'PodList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [...mockPodsDefault.items, ...mockPodsMonitoring.items],
};

// ---------------------------------------------------------------------------
// Deployments
// ---------------------------------------------------------------------------

function makeDeployment(
  name: string,
  namespace: string,
  uid: string,
  replicas: number,
  readyReplicas: number,
  image: string
) {
  return {
    kind: 'Deployment',
    apiVersion: 'apps/v1',
    metadata: {
      name,
      namespace,
      uid,
      resourceVersion: '400',
      creationTimestamp: oneDayAgo,
      labels: { app: name },
      annotations: { 'deployment.kubernetes.io/revision': '1' },
    },
    spec: {
      replicas,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [
            {
              name,
              image,
              resources: {
                requests: { cpu: '100m', memory: '128Mi' },
                limits: { cpu: '500m', memory: '512Mi' },
              },
            },
          ],
        },
      },
      strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } },
    },
    status: {
      observedGeneration: 1,
      replicas,
      updatedReplicas: replicas,
      readyReplicas,
      availableReplicas: readyReplicas,
      conditions: [
        {
          type: 'Available',
          status: readyReplicas === replicas ? 'True' : 'False',
          lastUpdateTime: now,
          lastTransitionTime: oneDayAgo,
          reason:
            readyReplicas === replicas ? 'MinimumReplicasAvailable' : 'MinimumReplicasUnavailable',
          message:
            readyReplicas === replicas
              ? 'Deployment has minimum availability.'
              : 'Deployment does not have minimum availability.',
        },
        {
          type: 'Progressing',
          status: 'True',
          lastUpdateTime: now,
          lastTransitionTime: oneDayAgo,
          reason: 'NewReplicaSetAvailable',
          message: `ReplicaSet "${name}-abc12" has successfully progressed.`,
        },
      ],
    },
  };
}

export const mockDeploymentsDefault = {
  kind: 'DeploymentList',
  apiVersion: 'apps/v1',
  metadata: { resourceVersion: '1000' },
  items: [
    makeDeployment('nginx-deployment', 'default', 'deploy-1-uid', 2, 2, 'nginx:1.25'),
    makeDeployment('backend-deploy', 'default', 'deploy-2-uid', 1, 1, 'myapp/backend:v1.2.3'),
    makeDeployment('failing-app', 'default', 'deploy-3-uid', 1, 0, 'myapp/failing:v0.1'),
  ],
};

export const mockDeploymentsMonitoring = {
  kind: 'DeploymentList',
  apiVersion: 'apps/v1',
  metadata: { resourceVersion: '1000' },
  items: [
    makeDeployment('grafana-deploy', 'monitoring', 'deploy-4-uid', 1, 1, 'grafana/grafana:10.2.0'),
  ],
};

export const mockDeploymentsAll = {
  kind: 'DeploymentList',
  apiVersion: 'apps/v1',
  metadata: { resourceVersion: '1000' },
  items: [...mockDeploymentsDefault.items, ...mockDeploymentsMonitoring.items],
};

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export const mockServicesDefault = {
  kind: 'ServiceList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'Service',
      apiVersion: 'v1',
      metadata: {
        name: 'kubernetes',
        namespace: 'default',
        uid: 'svc-k8s-uid',
        resourceVersion: '500',
        creationTimestamp: oneDayAgo,
        labels: { component: 'apiserver', provider: 'kubernetes' },
      },
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.96.0.1',
        ports: [{ name: 'https', port: 443, protocol: 'TCP', targetPort: 6443 }],
        selector: {},
        sessionAffinity: 'None',
      },
      status: { loadBalancer: {} },
    },
    {
      kind: 'Service',
      apiVersion: 'v1',
      metadata: {
        name: 'nginx-service',
        namespace: 'default',
        uid: 'svc-nginx-uid',
        resourceVersion: '501',
        creationTimestamp: oneDayAgo,
        labels: { app: 'nginx' },
      },
      spec: {
        type: 'LoadBalancer',
        clusterIP: '10.96.1.10',
        ports: [{ name: 'http', port: 80, protocol: 'TCP', targetPort: 80 }],
        selector: { app: 'nginx' },
        sessionAffinity: 'None',
      },
      status: {
        loadBalancer: {
          ingress: [{ ip: '1.2.3.4' }],
        },
      },
    },
    {
      kind: 'Service',
      apiVersion: 'v1',
      metadata: {
        name: 'backend-service',
        namespace: 'default',
        uid: 'svc-backend-uid',
        resourceVersion: '502',
        creationTimestamp: oneDayAgo,
        labels: { app: 'backend' },
      },
      spec: {
        type: 'ClusterIP',
        clusterIP: '10.96.1.20',
        ports: [{ name: 'http', port: 8080, protocol: 'TCP', targetPort: 8080 }],
        selector: { app: 'backend' },
        sessionAffinity: 'None',
      },
      status: { loadBalancer: {} },
    },
  ],
};

// ---------------------------------------------------------------------------
// ConfigMaps
// ---------------------------------------------------------------------------

export const mockConfigMapsDefault = {
  kind: 'ConfigMapList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'ConfigMap',
      apiVersion: 'v1',
      metadata: {
        name: 'app-config',
        namespace: 'default',
        uid: 'cm-1-uid',
        resourceVersion: '600',
        creationTimestamp: oneDayAgo,
      },
      data: {
        'app.env': 'production',
        'log.level': 'info',
        'max.connections': '100',
      },
    },
    {
      kind: 'ConfigMap',
      apiVersion: 'v1',
      metadata: {
        name: 'kube-root-ca.crt',
        namespace: 'default',
        uid: 'cm-2-uid',
        resourceVersion: '601',
        creationTimestamp: oneDayAgo,
      },
      data: {
        'ca.crt': '-----BEGIN CERTIFICATE-----\n(mock)\n-----END CERTIFICATE-----\n',
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

export const mockSecretsDefault = {
  kind: 'SecretList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {
        name: 'app-secret',
        namespace: 'default',
        uid: 'secret-1-uid',
        resourceVersion: '700',
        creationTimestamp: oneDayAgo,
      },
      type: 'Opaque',
      data: {
        username: 'dGVzdC11c2Vy',
        password: 'dGVzdC1wYXNz',
      },
    },
    {
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {
        name: 'default-token',
        namespace: 'default',
        uid: 'secret-2-uid',
        resourceVersion: '701',
        creationTimestamp: oneDayAgo,
      },
      type: 'kubernetes.io/service-account-token',
      data: {},
    },
  ],
};

// ---------------------------------------------------------------------------
// StatefulSets
// ---------------------------------------------------------------------------

export const mockStatefulSetsMonitoring = {
  kind: 'StatefulSetList',
  apiVersion: 'apps/v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'StatefulSet',
      apiVersion: 'apps/v1',
      metadata: {
        name: 'prometheus',
        namespace: 'monitoring',
        uid: 'sts-1-uid',
        resourceVersion: '800',
        creationTimestamp: oneDayAgo,
        labels: { app: 'prometheus' },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: 'prometheus' } },
        serviceName: 'prometheus',
        template: {
          metadata: { labels: { app: 'prometheus' } },
          spec: {
            containers: [
              {
                name: 'prometheus',
                image: 'prom/prometheus:v2.48.0',
                resources: {
                  requests: { cpu: '200m', memory: '256Mi' },
                  limits: { cpu: '1', memory: '1Gi' },
                },
              },
            ],
          },
        },
      },
      status: {
        observedGeneration: 1,
        replicas: 1,
        readyReplicas: 1,
        currentReplicas: 1,
        updatedReplicas: 1,
        currentRevision: 'prometheus-abc',
        updateRevision: 'prometheus-abc',
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const mockEventsDefault = {
  kind: 'EventList',
  apiVersion: 'v1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'Event',
      apiVersion: 'v1',
      metadata: {
        name: 'nginx-deployment-abc12.1234567890',
        namespace: 'default',
        uid: 'event-1-uid',
        resourceVersion: '900',
        creationTimestamp: oneHourAgo,
      },
      involvedObject: {
        kind: 'Pod',
        name: 'nginx-deployment-abc12-1',
        namespace: 'default',
        uid: 'pod-1-uid',
      },
      reason: 'Started',
      message: 'Started container nginx',
      source: { component: 'kubelet', host: 'test-node-1' },
      firstTimestamp: oneHourAgo,
      lastTimestamp: oneHourAgo,
      count: 1,
      type: 'Normal',
    },
    {
      kind: 'Event',
      apiVersion: 'v1',
      metadata: {
        name: 'failing-app-111aa.1234567891',
        namespace: 'default',
        uid: 'event-2-uid',
        resourceVersion: '901',
        creationTimestamp: oneHourAgo,
      },
      involvedObject: {
        kind: 'Pod',
        name: 'failing-app-111aa-1',
        namespace: 'default',
        uid: 'pod-4-uid',
      },
      reason: 'BackOff',
      message: 'Back-off restarting failed container failing-app in pod failing-app-111aa-1',
      source: { component: 'kubelet', host: 'test-node-2' },
      firstTimestamp: oneHourAgo,
      lastTimestamp: now,
      count: 5,
      type: 'Warning',
    },
  ],
};

// ---------------------------------------------------------------------------
// Node metrics
// ---------------------------------------------------------------------------

export const mockNodeMetrics = {
  kind: 'NodeMetricsList',
  apiVersion: 'metrics.k8s.io/v1beta1',
  metadata: { resourceVersion: '1000' },
  items: [
    {
      kind: 'NodeMetrics',
      apiVersion: 'metrics.k8s.io/v1beta1',
      metadata: { name: 'test-node-1', creationTimestamp: now },
      timestamp: now,
      window: '30s',
      usage: { cpu: '450m', memory: '2048Mi' },
    },
    {
      kind: 'NodeMetrics',
      apiVersion: 'metrics.k8s.io/v1beta1',
      metadata: { name: 'test-node-2', creationTimestamp: now },
      timestamp: now,
      window: '30s',
      usage: { cpu: '600m', memory: '3072Mi' },
    },
  ],
};

// ---------------------------------------------------------------------------
// Self-subject access review (RBAC – allow everything)
// ---------------------------------------------------------------------------

export const mockSelfSubjectAccessReviewAllowed = {
  kind: 'SelfSubjectAccessReview',
  apiVersion: 'authorization.k8s.io/v1',
  metadata: {},
  spec: {},
  status: { allowed: true, reason: 'test mode: all allowed', code: 200 },
};

// ---------------------------------------------------------------------------
// CRDs (empty list)
// ---------------------------------------------------------------------------

export const mockCRDs = {
  kind: 'CustomResourceDefinitionList',
  apiVersion: 'apiextensions.k8s.io/v1',
  metadata: { resourceVersion: '1000' },
  items: [],
};

// ---------------------------------------------------------------------------
// Plugins (none)
// ---------------------------------------------------------------------------

export const mockPlugins: string[] = [];

// ---------------------------------------------------------------------------
// API resources discovery
// ---------------------------------------------------------------------------

export const mockAPIResourcesV1 = {
  kind: 'APIResourceList',
  apiVersion: 'v1',
  groupVersion: 'v1',
  resources: [
    {
      name: 'namespaces',
      singularName: '',
      namespaced: false,
      kind: 'Namespace',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'pods',
      singularName: '',
      namespaced: true,
      kind: 'Pod',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'services',
      singularName: '',
      namespaced: true,
      kind: 'Service',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'nodes',
      singularName: '',
      namespaced: false,
      kind: 'Node',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'configmaps',
      singularName: '',
      namespaced: true,
      kind: 'ConfigMap',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'secrets',
      singularName: '',
      namespaced: true,
      kind: 'Secret',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'events',
      singularName: '',
      namespaced: true,
      kind: 'Event',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'serviceaccounts',
      singularName: '',
      namespaced: true,
      kind: 'ServiceAccount',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'persistentvolumeclaims',
      singularName: '',
      namespaced: true,
      kind: 'PersistentVolumeClaim',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'persistentvolumes',
      singularName: '',
      namespaced: false,
      kind: 'PersistentVolume',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'endpoints',
      singularName: '',
      namespaced: true,
      kind: 'Endpoints',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'resourcequotas',
      singularName: '',
      namespaced: true,
      kind: 'ResourceQuota',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'limitranges',
      singularName: '',
      namespaced: true,
      kind: 'LimitRange',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
  ],
};

export const mockAPIResourcesAppsV1 = {
  kind: 'APIResourceList',
  apiVersion: 'v1',
  groupVersion: 'apps/v1',
  resources: [
    {
      name: 'deployments',
      singularName: '',
      namespaced: true,
      kind: 'Deployment',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'statefulsets',
      singularName: '',
      namespaced: true,
      kind: 'StatefulSet',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'daemonsets',
      singularName: '',
      namespaced: true,
      kind: 'DaemonSet',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
    {
      name: 'replicasets',
      singularName: '',
      namespaced: true,
      kind: 'ReplicaSet',
      verbs: ['create', 'delete', 'get', 'list', 'patch', 'update', 'watch'],
    },
  ],
};
