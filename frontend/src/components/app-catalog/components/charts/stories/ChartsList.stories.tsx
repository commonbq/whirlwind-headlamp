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
import { setCatalogConfig } from '../../../api/catalogConfig';
import { COMMUNITY_REPO, VANILLA_HELM_REPO } from '../../../constants/catalog';
import { ChartsList } from '../List';

const mockArtifactHubPackages = [
  {
    package_id: 'pkg-prometheus',
    name: 'prometheus',
    version: '25.8.0',
    description: 'Prometheus is a monitoring system and time series database.',
    logo_image_id: '',
    repository: {
      name: 'prometheus-community',
      url: 'https://prometheus-community.github.io/helm-charts',
      verified_publisher: true,
      official: false,
    },
    official: false,
    cncf: true,
  },
  {
    package_id: 'pkg-grafana',
    name: 'grafana',
    version: '7.3.3',
    description: 'Grafana is an open source metric analytics and visualization suite.',
    logo_image_id: '',
    repository: {
      name: 'grafana',
      url: 'https://grafana.github.io/helm-charts',
      verified_publisher: true,
      official: true,
    },
    official: true,
    cncf: false,
  },
  {
    package_id: 'pkg-nginx',
    name: 'ingress-nginx',
    version: '4.9.0',
    description: 'ingress-nginx is an Ingress controller for Kubernetes using NGINX.',
    logo_image_id: '',
    repository: {
      name: 'ingress-nginx',
      url: 'https://kubernetes.github.io/ingress-nginx',
      verified_publisher: true,
      official: false,
    },
    official: false,
    cncf: true,
  },
  {
    package_id: 'pkg-cert-manager',
    name: 'cert-manager',
    version: '1.13.3',
    description:
      'Cert Manager is a Kubernetes add-on to automate the management and issuance of TLS certificates.',
    logo_image_id: '',
    repository: {
      name: 'jetstack',
      url: 'https://charts.jetstack.io',
      verified_publisher: true,
      official: false,
    },
    official: false,
    cncf: false,
  },
  {
    package_id: 'pkg-redis',
    name: 'redis',
    version: '18.6.1',
    description:
      'Redis is an open source, advanced key-value store. It is often referred to as a data structure server.',
    logo_image_id: '',
    repository: {
      name: 'bitnami',
      url: 'https://charts.bitnami.com/bitnami',
      verified_publisher: true,
      official: false,
    },
    official: false,
    cncf: false,
  },
  {
    package_id: 'pkg-postgres',
    name: 'postgresql',
    version: '13.4.4',
    description:
      'PostgreSQL is an object-relational database management system (ORDBMS) with an emphasis on extensibility and on standards-compliance.',
    logo_image_id: '',
    repository: {
      name: 'bitnami',
      url: 'https://charts.bitnami.com/bitnami',
      verified_publisher: true,
      official: false,
    },
    official: false,
    cncf: false,
  },
];

export default {
  title: 'AppCatalog/Charts/ChartsList',
  component: ChartsList,
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
          // Mock ArtifactHub search endpoint (used in electron / desktop mode)
          http.get('https://artifacthub.io/api/v1/packages/search', () =>
            HttpResponse.json(
              { packages: mockArtifactHubPackages },
              {
                headers: { 'pagination-total-count': String(mockArtifactHubPackages.length) },
              }
            )
          ),
          // Intercept ArtifactHub latest-version lookups triggered from ReleaseList
          http.get('https://artifacthub.io/api/v1/packages/search', () =>
            HttpResponse.json({ packages: [] }, { headers: { 'pagination-total-count': '0' } })
          ),
        ],
      },
    },
  },
} as Meta;

const communityFetch = async (
  search: string,
  // eslint-disable-next-line no-unused-vars
  _verified: boolean,
  // eslint-disable-next-line no-unused-vars
  _category: { title: string; value: number },
  // eslint-disable-next-line no-unused-vars
  _page: number
) => ({
  data: {
    packages: mockArtifactHubPackages.filter(
      p => !search || p.name.includes(search) || p.description.includes(search)
    ),
  },
  total: String(mockArtifactHubPackages.length),
});

export const CommunityCharts: StoryFn = () => {
  setCatalogConfig({ chartProfile: COMMUNITY_REPO });
  return <ChartsList fetchCharts={communityFetch as any} />;
};
CommunityCharts.storyName = 'Community (ArtifactHub) Charts';

const vanillaEntries: Record<string, any[]> = {
  prometheus: [
    {
      name: 'prometheus',
      version: '25.8.0',
      description: 'Prometheus monitoring system and time series database.',
      icon: '',
      sources: ['https://github.com/prometheus/prometheus'],
    },
  ],
  grafana: [
    {
      name: 'grafana',
      version: '7.3.3',
      description: 'Grafana analytics and monitoring platform.',
      icon: '',
      sources: ['https://github.com/grafana/grafana'],
    },
  ],
  'ingress-nginx': [
    {
      name: 'ingress-nginx',
      version: '4.9.0',
      description: 'Ingress controller for Kubernetes using NGINX.',
      icon: '',
      sources: ['https://github.com/kubernetes/ingress-nginx'],
    },
  ],
};

const vanillaFetch = async (
  // eslint-disable-next-line no-unused-vars
  _search: string,
  // eslint-disable-next-line no-unused-vars
  _verified: boolean,
  // eslint-disable-next-line no-unused-vars
  _category: { title: string; value: number },
  // eslint-disable-next-line no-unused-vars
  _page: number
) => ({
  data: { entries: vanillaEntries },
  total: String(Object.keys(vanillaEntries).length),
});

export const VanillaHelmCharts: StoryFn = () => {
  setCatalogConfig({ chartProfile: VANILLA_HELM_REPO });
  return <ChartsList fetchCharts={vanillaFetch as any} />;
};
VanillaHelmCharts.storyName = 'Vanilla Helm Repository Charts';

export const EmptyCharts: StoryFn = () => {
  setCatalogConfig({ chartProfile: COMMUNITY_REPO });
  return (
    <ChartsList
      fetchCharts={async () => ({ data: { packages: [] }, total: '0' })}
    />
  );
};
EmptyCharts.storyName = 'Empty Charts List';
