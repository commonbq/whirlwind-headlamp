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

import { getHeadlampAPIHeaders } from '../../../helpers/getHeadlampAPIHeaders';
import { request } from '../../../lib/k8s/apiProxy';

export function listReleases() {
  return request('/helm/releases/list', {
    method: 'GET',
    headers: { ...getHeadlampAPIHeaders() },
  });
}

export function getRelease(namespace: string, releaseName: string) {
  return request(`/helm/releases?name=${releaseName}&namespace=${namespace}`, {
    method: 'GET',
    headers: { ...getHeadlampAPIHeaders() },
  });
}

export function getReleaseHistory(namespace: string, releaseName: string) {
  return request(`/helm/release/history?name=${releaseName}&namespace=${namespace}`, {
    method: 'GET',
    headers: { ...getHeadlampAPIHeaders() },
  });
}

export function deleteRelease(namespace: string, releaseName: string) {
  return request(`/helm/releases/uninstall?name=${releaseName}&namespace=${namespace}`, {
    method: 'DELETE',
    headers: { ...getHeadlampAPIHeaders() },
  });
}

export function rollbackRelease(namespace: string, releaseName: string, version: string) {
  return request(`/helm/releases/rollback?name=${releaseName}&namespace=${namespace}`, {
    method: 'PUT',
    headers: { ...getHeadlampAPIHeaders() },
    body: JSON.stringify({
      name: releaseName,
      namespace: namespace,
      revision: version,
    }),
  });
}

export function createRelease(
  name: string,
  namespace: string,
  values: string,
  chart: string,
  version: string,
  description: string
) {
  return request(`/helm/release/install?namespace=${namespace}`, {
    method: 'POST',
    headers: { ...getHeadlampAPIHeaders() },
    body: JSON.stringify({
      name,
      namespace,
      values,
      chart,
      version,
      description,
    }),
  });
}

export function getActionStatus(name: string, action: string) {
  return request(`/helm/action/status?name=${name}&action=${action}`, {
    method: 'GET',
    headers: { ...getHeadlampAPIHeaders() },
  });
}

export function upgradeRelease(
  name: string,
  namespace: string,
  values: string,
  chart: string,
  description: string,
  version: string
) {
  return request(`/helm/releases/upgrade?name=${name}&namespace=${namespace}`, {
    method: 'PUT',
    headers: { ...getHeadlampAPIHeaders() },
    body: JSON.stringify({
      name,
      namespace,
      values,
      chart,
      description,
      version,
    }),
  });
}

export function fetchChart(name: string) {
  return request(`/helm/charts?filter=${name}`, {
    method: 'GET',
    headers: { ...getHeadlampAPIHeaders() },
  });
}
