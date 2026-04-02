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

import { useSelectedClusters } from '../../../lib/k8s';
import { getCluster } from '../../../lib/util';

/**
 * Returns the active clusters based on selected clusters or the current cluster.
 */
export function useClusters(): string[] {
  const selectedClusters = useSelectedClusters();
  const currentCluster = getCluster();

  if (selectedClusters && selectedClusters.length > 0) {
    return selectedClusters;
  }

  if (currentCluster) {
    return [currentCluster];
  }

  return [];
}
