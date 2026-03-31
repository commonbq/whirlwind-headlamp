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

export const VANILLA_HELM_REPO = 'VANILLA_HELM_REPOSITORY';
export const COMMUNITY_REPO = 'COMMUNITY_REPOSITORY';
// Replace the token with the URL prefix to values.yaml for a component on ${CUSTOM_CHART_VALUES_PREFIX}/${packageID}/${packageVersion}/values.yaml
// This is used only for the catalog provided by a vanilla Helm repository.
export const CUSTOM_CHART_VALUES_PREFIX = 'CUSTOM_CHART_VALUES_PREFIX';

// The name of the helm repository added before installing an application, while using vanilla helm repository
export const APP_CATALOG_HELM_REPOSITORY = 'app-catalog';

export const PAGE_OFFSET_COUNT_FOR_CHARTS = 9;

// Constants for the supported protocols
export const HELM_PROTOCOL = 'helm';
export const ARTIFACTHUB_PROTOCOL = 'artifacthub';
