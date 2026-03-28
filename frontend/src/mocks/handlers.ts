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
 * MSW request handlers for TEST mode.
 * Intercepts Headlamp backend and Kubernetes API calls and returns mock data.
 */

import { http, HttpResponse } from 'msw';
import {
  mockAPIResourcesAppsV1,
  mockAPIResourcesNetworkingInternalKnativeDevV1alpha1,
  mockAPIResourcesServingKnativeDevV1,
  mockAPIResourcesServingKnativeDevV1beta1,
  mockAPIResourcesV1,
  mockClusterDomainClaims,
  mockClusterVersion,
  mockConfig,
  mockConfigMapsDefault,
  mockCRDs,
  mockDeploymentsAll,
  mockDeploymentsDefault,
  mockDeploymentsMonitoring,
  mockEventsDefault,
  mockKnativeCRDs,
  mockKnativeDomainMappings,
  mockKnativeServingConfigMaps,
  mockKRevisionsDefault,
  mockKServicesDefault,
  mockNamespaces,
  mockNodeMetrics,
  mockNodes,
  mockPlugins,
  mockPodsAll,
  mockPodsDefault,
  mockPodsMonitoring,
  mockSecretsDefault,
  mockSelfSubjectAccessReviewAllowed,
  mockServicesDefault,
  mockStatefulSetsMonitoring,
  mockVersion,
  TEST_CLUSTER_NAME,
} from './mockData';

// Base URL used in dev mode (matches getAppUrl() when isDevMode() is true).
// MSW intercepts fetch() calls before they reach the network, so no real
// backend is required when TEST mode is active.
const BASE = 'http://localhost:4466';
const C = `${BASE}/clusters/${TEST_CLUSTER_NAME}`;

/**
 * Helper: return an empty list response for list requests we don't have data for.
 */
function emptyList(kind: string, apiVersion = 'v1') {
  return HttpResponse.json({
    kind: `${kind}List`,
    apiVersion,
    metadata: { resourceVersion: '1' },
    items: [],
  });
}

/**
 * Helper: pick items for a specific namespace or return all items when no
 * namespace is specified in the URL.
 */
function listByNamespace(
  allItems: { metadata: { namespace?: string } }[],
  namespace: string | undefined
) {
  if (!namespace) return allItems;
  return allItems.filter(item => item.metadata.namespace === namespace);
}

export const handlers = [
  // -------------------------------------------------------------------------
  // Headlamp backend endpoints
  // -------------------------------------------------------------------------

  /** Cluster/config list */
  http.get(`${BASE}/config`, () => HttpResponse.json(mockConfig)),

  /** Headlamp version */
  http.get(`${BASE}/version`, () => HttpResponse.json(mockVersion)),

  /** Plugins list */
  http.get(`${BASE}/plugins`, () => HttpResponse.json(mockPlugins)),
  http.get(`${BASE}/plugins/list`, () => HttpResponse.json(mockPlugins)),

  /** WebSocket multiplexer – return a network error so the app falls back to
   *  individual HTTP requests (which are all mocked below). */
  http.get(`${BASE}/wsMultiplexer`, () => HttpResponse.error()),

  // -------------------------------------------------------------------------
  // Cluster health – authchooser and other components call /healthz to verify
  // the cluster is reachable before proceeding.
  // -------------------------------------------------------------------------

  http.get(`${C}/healthz`, () => new HttpResponse('ok', { status: 200 })),

  // -------------------------------------------------------------------------
  // Kubernetes cluster version
  // -------------------------------------------------------------------------

  http.get(`${C}/version`, () => HttpResponse.json(mockClusterVersion)),

  // -------------------------------------------------------------------------
  // API discovery
  // -------------------------------------------------------------------------

  http.get(`${C}/api`, () =>
    HttpResponse.json({ kind: 'APIVersions', versions: ['v1'], serverAddressByClientCIDRs: [] })
  ),

  http.get(`${C}/api/v1`, () => HttpResponse.json(mockAPIResourcesV1)),

  http.get(`${C}/apis`, () =>
    HttpResponse.json({
      kind: 'APIGroupList',
      apiVersion: 'v1',
      groups: [
        {
          name: 'apps',
          versions: [{ groupVersion: 'apps/v1', version: 'v1' }],
          preferredVersion: { groupVersion: 'apps/v1', version: 'v1' },
        },
        {
          name: 'authorization.k8s.io',
          versions: [{ groupVersion: 'authorization.k8s.io/v1', version: 'v1' }],
          preferredVersion: { groupVersion: 'authorization.k8s.io/v1', version: 'v1' },
        },
        {
          name: 'metrics.k8s.io',
          versions: [{ groupVersion: 'metrics.k8s.io/v1beta1', version: 'v1beta1' }],
          preferredVersion: { groupVersion: 'metrics.k8s.io/v1beta1', version: 'v1beta1' },
        },
        {
          name: 'apiextensions.k8s.io',
          versions: [{ groupVersion: 'apiextensions.k8s.io/v1', version: 'v1' }],
          preferredVersion: { groupVersion: 'apiextensions.k8s.io/v1', version: 'v1' },
        },
        {
          name: 'serving.knative.dev',
          versions: [
            { groupVersion: 'serving.knative.dev/v1', version: 'v1' },
            { groupVersion: 'serving.knative.dev/v1beta1', version: 'v1beta1' },
          ],
          preferredVersion: { groupVersion: 'serving.knative.dev/v1', version: 'v1' },
        },
        {
          name: 'networking.internal.knative.dev',
          versions: [
            {
              groupVersion: 'networking.internal.knative.dev/v1alpha1',
              version: 'v1alpha1',
            },
          ],
          preferredVersion: {
            groupVersion: 'networking.internal.knative.dev/v1alpha1',
            version: 'v1alpha1',
          },
        },
      ],
    })
  ),

  http.get(`${C}/apis/apps/v1`, () => HttpResponse.json(mockAPIResourcesAppsV1)),

  // -------------------------------------------------------------------------
  // RBAC
  // -------------------------------------------------------------------------

  http.post(`${C}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, () =>
    HttpResponse.json(mockSelfSubjectAccessReviewAllowed)
  ),
  http.post(`${BASE}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`, () =>
    HttpResponse.json(mockSelfSubjectAccessReviewAllowed)
  ),

  /** testAuth() calls selfsubjectrulesreviews to check cluster permissions */
  http.post(`${C}/apis/authorization.k8s.io/v1/selfsubjectrulesreviews`, () =>
    HttpResponse.json({
      kind: 'SelfSubjectRulesReview',
      apiVersion: 'authorization.k8s.io/v1',
      metadata: {},
      spec: { namespace: 'default' },
      status: {
        resourceRules: [
          {
            verbs: ['*'],
            apiGroups: ['*'],
            resources: ['*'],
          },
        ],
        nonResourceRules: [{ verbs: ['*'], nonResourceURLs: ['*'] }],
        incomplete: false,
      },
    })
  ),

  /** getClusterUserInfo() calls selfsubjectreviews to get user info */
  http.post(`${C}/apis/authentication.k8s.io/v1/selfsubjectreviews`, () =>
    HttpResponse.json({
      kind: 'SelfSubjectReview',
      apiVersion: 'authentication.k8s.io/v1',
      metadata: {},
      status: {
        userInfo: {
          username: 'test-user',
          uid: 'test-uid',
          groups: ['system:masters'],
        },
      },
    })
  ),

  // -------------------------------------------------------------------------
  // Namespaces
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/namespaces`, () => HttpResponse.json(mockNamespaces)),

  // -------------------------------------------------------------------------
  // Nodes
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/nodes`, () => HttpResponse.json(mockNodes)),

  // -------------------------------------------------------------------------
  // Pods – cluster-wide and per-namespace
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/pods`, () => HttpResponse.json(mockPodsAll)),

  http.get(`${C}/api/v1/namespaces/:namespace/pods`, ({ params }) => {
    const { namespace } = params;
    const filtered = listByNamespace(
      [...mockPodsDefault.items, ...mockPodsMonitoring.items],
      namespace as string
    );
    return HttpResponse.json({ ...mockPodsAll, items: filtered });
  }),

  // -------------------------------------------------------------------------
  // Deployments
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/apps/v1/deployments`, () => HttpResponse.json(mockDeploymentsAll)),

  http.get(`${C}/apis/apps/v1/namespaces/:namespace/deployments`, ({ params }) => {
    const { namespace } = params;
    const items =
      namespace === 'monitoring'
        ? mockDeploymentsMonitoring.items
        : namespace === 'default'
        ? mockDeploymentsDefault.items
        : [];
    return HttpResponse.json({ ...mockDeploymentsAll, items });
  }),

  // -------------------------------------------------------------------------
  // StatefulSets
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/apps/v1/statefulsets`, () => HttpResponse.json(mockStatefulSetsMonitoring)),

  http.get(`${C}/apis/apps/v1/namespaces/:namespace/statefulsets`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'monitoring' ? mockStatefulSetsMonitoring.items : [];
    return HttpResponse.json({ ...mockStatefulSetsMonitoring, items });
  }),

  // -------------------------------------------------------------------------
  // DaemonSets, ReplicaSets (empty)
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/apps/v1/daemonsets`, () => emptyList('DaemonSet', 'apps/v1')),
  http.get(`${C}/apis/apps/v1/namespaces/:namespace/daemonsets`, () =>
    emptyList('DaemonSet', 'apps/v1')
  ),

  http.get(`${C}/apis/apps/v1/replicasets`, () => emptyList('ReplicaSet', 'apps/v1')),
  http.get(`${C}/apis/apps/v1/namespaces/:namespace/replicasets`, () =>
    emptyList('ReplicaSet', 'apps/v1')
  ),

  // -------------------------------------------------------------------------
  // Services
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/services`, () => HttpResponse.json(mockServicesDefault)),

  http.get(`${C}/api/v1/namespaces/:namespace/services`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'default' ? mockServicesDefault.items : [];
    return HttpResponse.json({ ...mockServicesDefault, items });
  }),

  // -------------------------------------------------------------------------
  // ConfigMaps
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/configmaps`, () => HttpResponse.json(mockConfigMapsDefault)),

  http.get(`${C}/api/v1/namespaces/:namespace/configmaps`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'default' ? mockConfigMapsDefault.items : [];
    return HttpResponse.json({ ...mockConfigMapsDefault, items });
  }),

  // -------------------------------------------------------------------------
  // Secrets
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/secrets`, () => HttpResponse.json(mockSecretsDefault)),

  http.get(`${C}/api/v1/namespaces/:namespace/secrets`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'default' ? mockSecretsDefault.items : [];
    return HttpResponse.json({ ...mockSecretsDefault, items });
  }),

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/events`, () => HttpResponse.json(mockEventsDefault)),

  http.get(`${C}/api/v1/namespaces/:namespace/events`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'default' ? mockEventsDefault.items : [];
    return HttpResponse.json({ ...mockEventsDefault, items });
  }),

  http.get(`${BASE}/api/v1/events`, () => HttpResponse.json(mockEventsDefault)),

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/metrics.k8s.io/v1beta1/nodes`, () => HttpResponse.json(mockNodeMetrics)),

  http.get(`${C}/apis/metrics.k8s.io/v1beta1/namespaces/:namespace/pods`, () =>
    HttpResponse.json({ kind: 'PodMetricsList', apiVersion: 'metrics.k8s.io/v1beta1', items: [] })
  ),

  // -------------------------------------------------------------------------
  // CRDs
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/apiextensions.k8s.io/v1/customresourcedefinitions`, () =>
    HttpResponse.json(mockCRDs)
  ),
  http.get(`${C}/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions`, () =>
    HttpResponse.json(mockCRDs)
  ),
  http.get(`${BASE}/apis/apiextensions.k8s.io/v1/customresourcedefinitions`, () =>
    HttpResponse.json(mockCRDs)
  ),

  // -------------------------------------------------------------------------
  // Service accounts, endpoints, PVs / PVCs, jobs, cronjobs,
  // network policies, ingresses, roles, role bindings (all empty)
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/serviceaccounts`, () => emptyList('ServiceAccount')),
  http.get(`${C}/api/v1/namespaces/:namespace/serviceaccounts`, () => emptyList('ServiceAccount')),

  http.get(`${C}/api/v1/endpoints`, () => emptyList('Endpoints')),
  http.get(`${C}/api/v1/namespaces/:namespace/endpoints`, () => emptyList('Endpoints')),

  http.get(`${C}/api/v1/persistentvolumes`, () => emptyList('PersistentVolume')),
  http.get(`${C}/api/v1/persistentvolumeclaims`, () => emptyList('PersistentVolumeClaim')),
  http.get(`${C}/api/v1/namespaces/:namespace/persistentvolumeclaims`, () =>
    emptyList('PersistentVolumeClaim')
  ),

  http.get(`${C}/api/v1/resourcequotas`, () => emptyList('ResourceQuota')),
  http.get(`${C}/api/v1/namespaces/:namespace/resourcequotas`, () => emptyList('ResourceQuota')),

  http.get(`${C}/api/v1/limitranges`, () => emptyList('LimitRange')),
  http.get(`${C}/api/v1/namespaces/:namespace/limitranges`, () => emptyList('LimitRange')),

  http.get(`${C}/apis/batch/v1/jobs`, () => emptyList('Job', 'batch/v1')),
  http.get(`${C}/apis/batch/v1/namespaces/:namespace/jobs`, () => emptyList('Job', 'batch/v1')),

  http.get(`${C}/apis/batch/v1/cronjobs`, () => emptyList('CronJob', 'batch/v1')),
  http.get(`${C}/apis/batch/v1/namespaces/:namespace/cronjobs`, () =>
    emptyList('CronJob', 'batch/v1')
  ),

  http.get(`${C}/apis/networking.k8s.io/v1/ingresses`, () =>
    emptyList('Ingress', 'networking.k8s.io/v1')
  ),
  http.get(`${C}/apis/networking.k8s.io/v1/namespaces/:namespace/ingresses`, () =>
    emptyList('Ingress', 'networking.k8s.io/v1')
  ),

  http.get(`${C}/apis/networking.k8s.io/v1/networkpolicies`, () =>
    emptyList('NetworkPolicy', 'networking.k8s.io/v1')
  ),
  http.get(`${C}/apis/networking.k8s.io/v1/namespaces/:namespace/networkpolicies`, () =>
    emptyList('NetworkPolicy', 'networking.k8s.io/v1')
  ),

  http.get(`${C}/apis/rbac.authorization.k8s.io/v1/roles`, () =>
    emptyList('Role', 'rbac.authorization.k8s.io/v1')
  ),
  http.get(`${C}/apis/rbac.authorization.k8s.io/v1/namespaces/:namespace/roles`, () =>
    emptyList('Role', 'rbac.authorization.k8s.io/v1')
  ),

  http.get(`${C}/apis/rbac.authorization.k8s.io/v1/rolebindings`, () =>
    emptyList('RoleBinding', 'rbac.authorization.k8s.io/v1')
  ),
  http.get(`${C}/apis/rbac.authorization.k8s.io/v1/namespaces/:namespace/rolebindings`, () =>
    emptyList('RoleBinding', 'rbac.authorization.k8s.io/v1')
  ),

  http.get(`${C}/apis/rbac.authorization.k8s.io/v1/clusterroles`, () =>
    emptyList('ClusterRole', 'rbac.authorization.k8s.io/v1')
  ),
  http.get(`${C}/apis/rbac.authorization.k8s.io/v1/clusterrolebindings`, () =>
    emptyList('ClusterRoleBinding', 'rbac.authorization.k8s.io/v1')
  ),

  http.get(`${C}/apis/discovery.k8s.io/v1/endpointslices`, () =>
    emptyList('EndpointSlice', 'discovery.k8s.io/v1')
  ),
  http.get(`${C}/apis/discovery.k8s.io/v1/namespaces/:namespace/endpointslices`, () =>
    emptyList('EndpointSlice', 'discovery.k8s.io/v1')
  ),

  http.get(`${C}/apis/autoscaling/v2/horizontalpodautoscalers`, () =>
    emptyList('HorizontalPodAutoscaler', 'autoscaling/v2')
  ),
  http.get(`${C}/apis/autoscaling/v2/namespaces/:namespace/horizontalpodautoscalers`, () =>
    emptyList('HorizontalPodAutoscaler', 'autoscaling/v2')
  ),

  http.get(`${C}/apis/policy/v1/poddisruptionbudgets`, () =>
    emptyList('PodDisruptionBudget', 'policy/v1')
  ),
  http.get(`${C}/apis/policy/v1/namespaces/:namespace/poddisruptionbudgets`, () =>
    emptyList('PodDisruptionBudget', 'policy/v1')
  ),

  http.get(`${C}/apis/scheduling.k8s.io/v1/priorityclasses`, () =>
    emptyList('PriorityClass', 'scheduling.k8s.io/v1')
  ),

  http.get(`${C}/apis/storage.k8s.io/v1/storageclasses`, () =>
    emptyList('StorageClass', 'storage.k8s.io/v1')
  ),

  http.get(`${C}/apis/coordination.k8s.io/v1/leases`, () =>
    emptyList('Lease', 'coordination.k8s.io/v1')
  ),
  http.get(`${C}/apis/coordination.k8s.io/v1/namespaces/:namespace/leases`, () =>
    emptyList('Lease', 'coordination.k8s.io/v1')
  ),

  http.get(`${C}/apis/admissionregistration.k8s.io/v1/mutatingwebhookconfigurations`, () =>
    emptyList('MutatingWebhookConfiguration', 'admissionregistration.k8s.io/v1')
  ),
  http.get(`${C}/apis/admissionregistration.k8s.io/v1/validatingwebhookconfigurations`, () =>
    emptyList('ValidatingWebhookConfiguration', 'admissionregistration.k8s.io/v1')
  ),

  http.get(`${C}/apis/node.k8s.io/v1/runtimeclasses`, () =>
    emptyList('RuntimeClass', 'node.k8s.io/v1')
  ),

  // Iconify CDN – return empty JSON so icon rendering doesn't break
  http.get('https://api.iconify.design/mdi.json', () => HttpResponse.json({})),

  // -------------------------------------------------------------------------
  // KNative – API discovery
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/serving.knative.dev/v1`, () =>
    HttpResponse.json(mockAPIResourcesServingKnativeDevV1)
  ),

  http.get(`${C}/apis/serving.knative.dev/v1beta1`, () =>
    HttpResponse.json(mockAPIResourcesServingKnativeDevV1beta1)
  ),

  http.get(`${C}/apis/networking.internal.knative.dev/v1alpha1`, () =>
    HttpResponse.json(mockAPIResourcesNetworkingInternalKnativeDevV1alpha1)
  ),

  // -------------------------------------------------------------------------
  // KNative – individual CRD lookup (used by isKnativeInstalled)
  // -------------------------------------------------------------------------

  http.get(
    `${C}/apis/apiextensions.k8s.io/v1/customresourcedefinitions/:crdName`,
    ({ params }) => {
      const { crdName } = params;
      const crd = mockKnativeCRDs.find(c => c.metadata.name === crdName);
      if (crd) {
        return HttpResponse.json(crd);
      }
      return new HttpResponse(null, { status: 404 });
    }
  ),

  // -------------------------------------------------------------------------
  // KNative – KServices
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/serving.knative.dev/v1/services`, () =>
    HttpResponse.json(mockKServicesDefault)
  ),

  http.get(`${C}/apis/serving.knative.dev/v1/namespaces/:namespace/services`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'default' ? mockKServicesDefault.items : [];
    return HttpResponse.json({ ...mockKServicesDefault, items });
  }),

  // -------------------------------------------------------------------------
  // KNative – Revisions
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/serving.knative.dev/v1/revisions`, () =>
    HttpResponse.json(mockKRevisionsDefault)
  ),

  http.get(`${C}/apis/serving.knative.dev/v1/namespaces/:namespace/revisions`, ({ params }) => {
    const { namespace } = params;
    const items = namespace === 'default' ? mockKRevisionsDefault.items : [];
    return HttpResponse.json({ ...mockKRevisionsDefault, items });
  }),

  // -------------------------------------------------------------------------
  // KNative – DomainMappings
  // -------------------------------------------------------------------------

  http.get(`${C}/apis/serving.knative.dev/v1beta1/domainmappings`, () =>
    HttpResponse.json(mockKnativeDomainMappings)
  ),

  http.get(
    `${C}/apis/serving.knative.dev/v1beta1/namespaces/:namespace/domainmappings`,
    ({ params }) => {
      const { namespace } = params;
      const items = namespace === 'default' ? mockKnativeDomainMappings.items : [];
      return HttpResponse.json({ ...mockKnativeDomainMappings, items });
    }
  ),

  // -------------------------------------------------------------------------
  // KNative – ClusterDomainClaims (cluster-scoped)
  // -------------------------------------------------------------------------

  http.get(
    `${C}/apis/networking.internal.knative.dev/v1alpha1/clusterdomainclaims`,
    () => HttpResponse.json(mockClusterDomainClaims)
  ),

  // -------------------------------------------------------------------------
  // knative-serving namespace ConfigMaps
  // -------------------------------------------------------------------------

  http.get(`${C}/api/v1/namespaces/knative-serving/configmaps`, () =>
    HttpResponse.json(mockKnativeServingConfigMaps)
  ),

  http.get(
    `${C}/api/v1/namespaces/knative-serving/configmaps/:name`,
    ({ params }) => {
      const { name } = params;
      const cm = mockKnativeServingConfigMaps.items.find(c => c.metadata.name === name);
      if (cm) {
        return HttpResponse.json(cm);
      }
      return new HttpResponse(null, { status: 404 });
    }
  ),
];
