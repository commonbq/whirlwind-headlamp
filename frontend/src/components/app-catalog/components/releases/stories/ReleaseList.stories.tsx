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

import { Meta, StoryFn } from '@storybook/react';
import { http, HttpResponse } from 'msw';
import { TestContext } from '../../../../../test';
import ReleaseList from '../List';

const mockReleases = [
  {
    name: 'prometheus',
    namespace: 'monitoring',
    version: 3,
    info: {
      status: 'deployed',
      description: 'Upgrade complete',
      last_deployed: new Date(Date.now() - 7200_000).toISOString(),
    },
    chart: {
      metadata: {
        name: 'prometheus',
        version: '25.8.0',
        appVersion: 'v2.48.1',
        description: 'Prometheus is a monitoring system and time series database.',
        icon: '',
      },
      values: { server: { enabled: true } },
    },
    config: {},
  },
  {
    name: 'nginx-ingress',
    namespace: 'default',
    version: 1,
    info: {
      status: 'deployed',
      description: 'Install complete',
      last_deployed: new Date(Date.now() - 86400_000).toISOString(),
    },
    chart: {
      metadata: {
        name: 'ingress-nginx',
        version: '4.9.0',
        appVersion: '1.9.5',
        description: 'NGINX Ingress controller for Kubernetes.',
        icon: '',
      },
      values: { controller: { replicaCount: 2 } },
    },
    config: { controller: { replicaCount: 3 } },
  },
  {
    name: 'cert-manager',
    namespace: 'cert-manager',
    version: 2,
    info: {
      status: 'deployed',
      description: 'Upgrade complete',
      last_deployed: new Date(Date.now() - 3600_000).toISOString(),
    },
    chart: {
      metadata: {
        name: 'cert-manager',
        version: '1.13.3',
        appVersion: '1.13.3',
        description: 'Automated TLS certificate management.',
        icon: '',
      },
      values: { installCRDs: true },
    },
    config: {},
  },
  {
    name: 'redis-cache',
    namespace: 'default',
    version: 1,
    info: {
      status: 'failed',
      description: 'UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress',
      last_deployed: new Date(Date.now() - 1800_000).toISOString(),
    },
    chart: {
      metadata: {
        name: 'redis',
        version: '18.6.1',
        appVersion: '7.2.3',
        description: 'Redis open source in-memory data store.',
        icon: '',
      },
      values: { architecture: 'standalone' },
    },
    config: {},
  },
];

export default {
  title: 'AppCatalog/Releases/ReleaseList',
  component: ReleaseList,
  decorators: [
    (Story: any) => (
      <TestContext>
        <Story />
      </TestContext>
    ),
  ],
  parameters: {
    msw: {
      handlers: {
        story: [
          http.get('http://localhost:4466/helm/releases/list', () =>
            HttpResponse.json({ releases: mockReleases })
          ),
          // Suppress ArtifactHub calls for latest-version lookups
          http.get('https://artifacthub.io/api/v1/packages/search', () =>
            HttpResponse.json({ packages: [] }, { headers: { 'pagination-total-count': '0' } })
          ),
        ],
      },
    },
  },
} as Meta;

const mockFetch = async () => ({ releases: mockReleases });
const mockFetchEmpty = async () => ({ releases: [] });

export const WithReleases: StoryFn = () => <ReleaseList fetchReleases={mockFetch} />;
WithReleases.storyName = 'Installed Helm Releases';

export const EmptyReleases: StoryFn = () => <ReleaseList fetchReleases={mockFetchEmpty} />;
EmptyReleases.storyName = 'No Installed Releases';
