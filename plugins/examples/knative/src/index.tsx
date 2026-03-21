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

import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import React from 'react';
import KNativeEventing from './knative-eventing';
import KNativeRevisionsList from './knative-revisions';
import KNativeServiceDetail from './knative-service-detail';
import KNativeServicesList from './knative-services';

// ─── Sidebar entries ──────────────────────────────────────────────────────────

// Top-level "KNative" sidebar entry
registerSidebarEntry({
  parent: null,
  name: 'knative',
  label: 'KNative',
  url: '/knative/services',
  icon: 'mdi:cloud-braces',
});

// Serving sub-menu
registerSidebarEntry({
  parent: 'knative',
  name: 'knative-serving',
  label: 'Serving',
  url: '/knative/services',
  icon: 'mdi:server-network',
});

registerSidebarEntry({
  parent: 'knative-serving',
  name: 'knative-services',
  label: 'Services',
  url: '/knative/services',
  icon: 'mdi:application-cog',
});

registerSidebarEntry({
  parent: 'knative-serving',
  name: 'knative-revisions',
  label: 'Revisions',
  url: '/knative/revisions',
  icon: 'mdi:history',
});

// Eventing sub-menu
registerSidebarEntry({
  parent: 'knative',
  name: 'knative-eventing',
  label: 'Eventing',
  url: '/knative/eventing',
  icon: 'mdi:lightning-bolt',
});

// ─── Routes ───────────────────────────────────────────────────────────────────

registerRoute({
  path: '/knative/services',
  sidebar: 'knative-services',
  name: 'knative-services',
  exact: true,
  component: () => <KNativeServicesList />,
});

registerRoute({
  path: '/knative/services/:namespace/:name',
  sidebar: 'knative-services',
  name: 'knative-service-detail',
  exact: true,
  component: () => <KNativeServiceDetail />,
});

registerRoute({
  path: '/knative/revisions',
  sidebar: 'knative-revisions',
  name: 'knative-revisions',
  exact: true,
  component: () => <KNativeRevisionsList />,
});

registerRoute({
  path: '/knative/eventing',
  sidebar: 'knative-eventing',
  name: 'knative-eventing',
  exact: true,
  component: () => <KNativeEventing />,
});
