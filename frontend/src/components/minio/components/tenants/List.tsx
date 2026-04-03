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
import { useMinioInstalled } from '../../hooks/useMinioInstalled';
import { Tenant } from '../../resources/tenant';
import { NotInstalledBanner } from '../common/CommonComponents';

export function TenantsList() {
  const { isMinioInstalled, isMinioCheckLoading } = useMinioInstalled();
  const clusters = useClusters();

  return isMinioInstalled ? (
    <ResourceListView
      title="MinIO Tenants"
      resourceClass={Tenant}
      columns={[
        'name',
        'namespace',
        {
          id: 'state',
          label: 'State',
          getValue: item => item.currentState,
        },
        {
          id: 'health',
          label: 'Health',
          getValue: item => item.healthStatus,
        },
        {
          id: 'servers',
          label: 'Servers',
          getValue: item => item.totalServers,
        },
        {
          id: 'availableReplicas',
          label: 'Available Replicas',
          getValue: item => item.availableReplicas,
        },
        {
          id: 'image',
          label: 'Image',
          getValue: item => item.image,
        },
        'age',
      ]}
    />
  ) : (
    <NotInstalledBanner isLoading={isMinioCheckLoading} clusters={clusters} />
  );
}
