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

import type { QueryParameters } from '../../../lib/k8s/apiProxy';
import { request } from '../../../lib/k8s/apiProxy';
import { ChartsList } from '../components/charts/List';
import { COMMUNITY_REPO, VANILLA_HELM_REPO } from '../constants/catalog';
import { setCatalogConfig } from './catalogConfig';

const SERVICE_ENDPOINT = '/api/v1/services';
const LABEL_CATALOG = 'catalog.headlamp.dev/is-catalog';

export function ResetGlobalVars(
  metadataName: string,
  namespace: string,
  prefix: string,
  profile: string,
  valuesPrefix: string
) {
  setCatalogConfig({
    chartURLPrefix: prefix,
    chartProfile: profile,
    chartValuesPrefix: valuesPrefix,
    catalogNamespace: namespace,
    catalogName: metadataName,
  });
}

export function HelmChartList(metadataName: string, namespace: string, chartUrl: string) {
  ResetGlobalVars(metadataName, namespace, chartUrl, VANILLA_HELM_REPO, `values`);
  return <ChartsList />;
}

export function CommunityChartList(metadataName: string, namespace: string, chartUrl: string) {
  ResetGlobalVars(metadataName, namespace, chartUrl, COMMUNITY_REPO, '');
  return <ChartsList />;
}

export function fetchCatalogs() {
  const queryParam: QueryParameters = {
    labelSelector: LABEL_CATALOG + '=',
  };
  return request(SERVICE_ENDPOINT, {}, true, true, queryParam).then(response => response);
}
