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

import { isElectron } from '../../../helpers/isElectron';
import { request } from '../../../lib/k8s/apiProxy';
import {
  COMMUNITY_REPO,
  CUSTOM_CHART_VALUES_PREFIX,
  PAGE_OFFSET_COUNT_FOR_CHARTS,
  VANILLA_HELM_REPO,
} from '../constants/catalog';
import { yamlToJSON } from '../helpers';
import { getCatalogConfig, setChartValuesPrefix } from './catalogConfig';

const SERVICE_PROXY = '/serviceproxy';

const getURLSearchParams = (url: string) => {
  return new URLSearchParams({ request: url }).toString();
};

export async function fetchChartsFromArtifact(
  search: string = '',
  verified: boolean,
  category: { title: string; value: number },
  page: number,
  limit: number = PAGE_OFFSET_COUNT_FOR_CHARTS
) {
  if (!isElectron()) {
    const chartCfg = getCatalogConfig();
    if (chartCfg.chartProfile === VANILLA_HELM_REPO) {
      const url =
        `${SERVICE_PROXY}/${chartCfg.catalogNamespace}/${chartCfg.catalogName}?` +
        getURLSearchParams(`charts/index.yaml`);

      const dataResponse = await request(url, { isJSON: false }, true, true, {});
      const yamlResponse = (await dataResponse?.text()) ?? '';
      const jsonResponse = yamlToJSON(yamlResponse) as Record<string, unknown>;
      const total = Object.keys(jsonResponse.entries ?? {}).length;
      return { data: jsonResponse, total };
    } else if (chartCfg.chartProfile === COMMUNITY_REPO) {
      let requestParam = '';
      if (!category || category.value === 0) {
        requestParam = `api/v1/packages/search?kind=0&ts_query_web=${search}&sort=relevance&facets=true&limit=${limit}&offset=${
          (page - 1) * limit
        }`;
      } else {
        requestParam = `api/v1/packages/search?kind=0&ts_query_web=${search}&category=${
          category.value
        }&sort=relevance&facets=true&limit=${limit}&offset=${(page - 1) * limit}`;
      }

      const url =
        `${SERVICE_PROXY}/${chartCfg.catalogNamespace}/${chartCfg.catalogName}?` +
        getURLSearchParams(requestParam);
      const dataResponse = await request(url, {}, true, true, {}).then(response => response);
      const total = dataResponse?.headers?.get('pagination-total-count') ?? 0;
      return { data: dataResponse, total };
    }
  }

  // Desktop version using artifacthub.io
  const url = new URL('https://artifacthub.io/api/v1/packages/search');
  url.searchParams.set('offset', ((page - 1) * limit).toString());
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('facets', 'true');
  url.searchParams.set('kind', '0');
  url.searchParams.set('ts_query_web', search);
  if (category.value) {
    url.searchParams.set('category', category.value.toString());
  }
  url.searchParams.set('sort', 'relevance');
  url.searchParams.set('deprecated', 'false');
  url.searchParams.set('verified_publisher', verified.toString());

  const response = await fetch(url.toString());
  const total = response.headers?.get('pagination-total-count') ?? 0;
  const jsonResponse = await response.json();
  return { data: jsonResponse, total };
}

export function fetchChartDetailFromArtifact(chartName: string, repoName: string) {
  const chartCfg = getCatalogConfig();
  if (!isElectron() && chartCfg.chartProfile === COMMUNITY_REPO) {
    const url =
      `${SERVICE_PROXY}/${chartCfg.catalogNamespace}/${chartCfg.catalogName}?` +
      getURLSearchParams(`api/v1/packages/helm/${repoName}/${chartName}`);
    return request(url, {}, true, true, {}).then(response => response);
  }

  return fetch(`http://localhost:4466/externalproxy`, {
    headers: {
      'Forward-To': `https://artifacthub.io/api/v1/packages/helm/${repoName}/${chartName}`,
    },
  }).then(response => response.json());
}

export function fetchChartValues(packageID: string, packageVersion: string) {
  const chartCfg = getCatalogConfig();
  if (!isElectron()) {
    let requestParam = '';
    if (chartCfg.chartProfile === VANILLA_HELM_REPO) {
      if (CUSTOM_CHART_VALUES_PREFIX !== 'CUSTOM_CHART_VALUES_PREFIX') {
        setChartValuesPrefix(`${CUSTOM_CHART_VALUES_PREFIX}`);
      }
      requestParam = `${chartCfg.chartValuesPrefix}/${packageID}/${packageVersion}/values.yaml`;
    } else if (chartCfg.chartProfile === COMMUNITY_REPO) {
      requestParam = `api/v1/packages/${packageID}/${packageVersion}/values`;
    }
    const url =
      `${SERVICE_PROXY}/${chartCfg.catalogNamespace}/${chartCfg.catalogName}?` +
      getURLSearchParams(requestParam);

    return request(url, { isJSON: false }, true, true, {}).then((response: any) => response.text());
  }

  return fetch(`http://localhost:4466/externalproxy`, {
    headers: {
      'Forward-To': `https://artifacthub.io/api/v1/packages/${packageID}/${packageVersion}/values`,
    },
  }).then(response => response.text());
}

export async function fetchChartIcon(iconName: string) {
  const chartCfg = getCatalogConfig();
  const url =
    `${SERVICE_PROXY}/${chartCfg.catalogNamespace}/${chartCfg.catalogName}?` +
    getURLSearchParams(`${iconName}`);
  return request(url, { isJSON: false }, true, true, {}).then(response => response);
}

export async function fetchLatestAppVersion(chartName: string): Promise<string> {
  if (!chartName) {
    return '—';
  }

  try {
    const url = new URL('https://artifacthub.io/api/v1/packages/search');
    url.searchParams.set('offset', '0');
    url.searchParams.set('limit', '5');
    url.searchParams.set('facets', 'false');
    url.searchParams.set('kind', '0');
    url.searchParams.set('ts_query_web', chartName);

    const response = await fetch(url.toString());
    const dataResponse = await response.json();
    const packages: any[] = dataResponse?.packages ?? [];

    const lowerChartName = chartName.toLowerCase();
    const selectedPackage = packages.find(
      p => p?.name?.toLowerCase() === lowerChartName || p?.normalized_name === lowerChartName
    );

    return selectedPackage?.app_version ?? '—';
  } catch {
    return '—';
  }
}
