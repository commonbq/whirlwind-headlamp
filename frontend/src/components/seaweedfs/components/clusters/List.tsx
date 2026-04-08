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

import { ResourceListView } from '../../../../components/common';
import { useClusters } from '../../hooks/useClusters';
import { useSeaweedFSInstalled } from '../../hooks/useSeaweedFSInstalled';
import { SeaweedFSCluster } from '../../resources/seaweedfsCluster';
import { NotInstalledBanner } from '../common/CommonComponents';
import { CreateClusterButton } from './CreateClusterButton';

export function ClustersList() {
  const { isSeaweedFSInstalled, isSeaweedFSCheckLoading } = useSeaweedFSInstalled();
  const clusters = useClusters();

  return isSeaweedFSInstalled ? (
    <ResourceListView
      title="SeaweedFS Clusters"
      resourceClass={SeaweedFSCluster}
      headerProps={{ titleSideActions: [<CreateClusterButton key="create-cluster" />] }}
      columns={[
        'name',
        'namespace',
        {
          id: 'phase',
          label: 'Phase',
          getValue: item => item.phase,
        },
        {
          id: 'image',
          label: 'Image',
          getValue: item => item.image,
        },
        {
          id: 'masterReplicas',
          label: 'Master Replicas',
          getValue: item => item.masterReplicas,
        },
        {
          id: 'volumeReplicas',
          label: 'Volume Replicas',
          getValue: item => item.volumeReplicas,
        },
        {
          id: 'filerReplicas',
          label: 'Filer Replicas',
          getValue: item => item.filerReplicas,
        },
        'age',
      ]}
    />
  ) : (
    <NotInstalledBanner isLoading={isSeaweedFSCheckLoading} clusters={clusters} />
  );
}
