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

import { fetchCatalogs } from '../api/catalogs';

const ANNOTATION_URI = 'catalog.headlamp.dev/uri';
const ANNOTATION_NAME = 'catalog.headlamp.dev/name';
const ANNOTATION_PROTOCOL = 'catalog.headlamp.dev/protocol';
const ANNOTATION_DISPLAY_NAME = 'catalog.headlamp.dev/displayName';

const DEFAULT_CATALOG_NAME = 'app-catalog';
const DEFAULT_CATALOG_NAMESPACE = 'headlamp-system';

interface Catalog {
  name: string;
  displayName: string;
  metadataName: string;
  namespace: string;
  protocol: string;
  uri: string;
}

interface ComponentVersions {
  version: string;
}

export function CatalogLists() {
  return fetchCatalogs().then(function (response) {
    const catalogList: Array<Catalog> = new Array<Catalog>();
    for (let i = 0; i < response.items.length; i++) {
      let serviceUri = '';
      const metadata = response.items[i].metadata;
      if (ANNOTATION_URI in metadata.annotations) {
        serviceUri = metadata.annotations[ANNOTATION_URI];
      }

      if (serviceUri === '') {
        const port = response.items[i].spec.ports[0];
        serviceUri = port.name + '://' + metadata.name + '.' + metadata.namespace + ':' + port.port;
      }

      let catalogDisplayName = '';
      if (
        ANNOTATION_DISPLAY_NAME in metadata.annotations &&
        metadata.annotations[ANNOTATION_DISPLAY_NAME] !== ''
      ) {
        catalogDisplayName = metadata.annotations[ANNOTATION_DISPLAY_NAME];
      } else {
        catalogDisplayName =
          ANNOTATION_NAME in metadata.annotations ? metadata.annotations[ANNOTATION_NAME] : '';
      }

      const catalog: Catalog = {
        name: metadata.name + '-' + metadata.namespace,
        displayName: catalogDisplayName,
        metadataName: metadata.name,
        namespace: metadata.namespace,
        protocol: metadata.annotations[ANNOTATION_PROTOCOL],
        uri: serviceUri,
      };

      if (
        metadata.name === DEFAULT_CATALOG_NAME &&
        metadata.namespace === DEFAULT_CATALOG_NAMESPACE
      ) {
        catalogList.unshift(catalog);
      } else {
        catalogList.push(catalog);
      }
    }
    return catalogList;
  });
}

export function AvailableComponentVersions(chartEntries: any[]) {
  const compVersions = new Map<any, any[]>();
  for (const [key, value] of Object.entries(chartEntries)) {
    const versions: Array<ComponentVersions> = new Array<ComponentVersions>();
    for (let i = 0; i < value.length; i++) {
      const v: ComponentVersions = {
        version: value[i].version,
      };
      versions.push(v);
    }
    compVersions.set(key, versions);
  }
  return compVersions;
}
