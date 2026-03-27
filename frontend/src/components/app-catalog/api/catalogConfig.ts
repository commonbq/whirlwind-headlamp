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
 * Configuration object for chart settings.
 */
export type ChartConfig = {
  chartURLPrefix: string;
  chartProfile: string;
  chartValuesPrefix: string;
  catalogNamespace: string;
  catalogName: string;
};

const catalogConfig: ChartConfig = {
  chartURLPrefix: '',
  chartProfile: '',
  chartValuesPrefix: '',
  catalogNamespace: '',
  catalogName: '',
};

export function setChartValuesPrefix(valuesPrefix: string) {
  catalogConfig.chartValuesPrefix = valuesPrefix;
}

export function setCatalogConfig(update: Partial<ChartConfig>) {
  Object.assign(catalogConfig, update);
}

export function getCatalogConfig(): Readonly<ChartConfig> {
  return catalogConfig;
}
