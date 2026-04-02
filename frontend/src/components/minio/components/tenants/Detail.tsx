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

import { useParams } from 'react-router-dom';
import { DetailsGrid, NameValueTable, SectionBox, SimpleTable } from '../../../../components/common';
import { useMinioInstalled } from '../../hooks/useMinioInstalled';
import { Tenant, TenantPool } from '../../resources/tenant';
import { NotInstalledBanner } from '../common/CommonComponents';

function formatBooleanStatus(value: boolean | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  return value ? 'Yes' : 'No';
}

export function TenantDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const { isMinioInstalled, isMinioCheckLoading } = useMinioInstalled();

  return (
    <>
      {isMinioInstalled ? (
        <DetailsGrid
          resourceType={Tenant}
          name={name}
          withEvents
          namespace={namespace}
          extraInfo={item =>
            item && [
              {
                name: 'State',
                value: item.currentState,
              },
              {
                name: 'Health Status',
                value: item.healthStatus,
              },
              {
                name: 'Available Replicas',
                value: item.availableReplicas,
              },
              {
                name: 'Total Servers',
                value: item.totalServers,
              },
              {
                name: 'Image',
                value: item.image,
              },
              {
                name: 'Image Pull Policy',
                value: item.spec?.imagePullPolicy,
              },
              {
                name: 'Auto TLS',
                value: formatBooleanStatus(item.spec?.requestAutoCert),
              },
              {
                name: 'Mount Path',
                value: item.spec?.mountPath,
              },
              {
                name: 'Configuration Secret',
                value: item.spec?.configuration?.name,
              },
              {
                name: 'Sync Version',
                value: item.status?.syncVersion,
              },
              {
                name: 'Capacity',
                value: item.usage?.capacity,
              },
              {
                name: 'Usage',
                value: item.usage?.usage,
              },
              {
                name: 'Raw Capacity',
                value: item.usage?.rawCapacity,
              },
              {
                name: 'Raw Usage',
                value: item.usage?.rawUsage,
              },
            ]
          }
          extraSections={item =>
            item && [
              {
                id: 'pools',
                section: item.spec?.pools && item.spec.pools.length > 0 && (
                  <SectionBox title="Pools">
                    <SimpleTable
                      columns={[
                        { label: 'Name', datum: 'name' },
                        { label: 'Servers', datum: 'servers' },
                        { label: 'Volumes Per Server', datum: 'volumesPerServer' },
                        {
                          label: 'Storage Request',
                          getter: (pool: TenantPool) =>
                            pool.volumeClaimTemplate?.spec?.resources?.requests?.storage ?? '',
                        },
                        {
                          label: 'Storage Class',
                          getter: (pool: TenantPool) =>
                            pool.volumeClaimTemplate?.spec?.storageClassName ?? '',
                        },
                        {
                          label: 'CPU Request',
                          getter: (pool: TenantPool) => pool.resources?.requests?.cpu ?? '',
                        },
                        {
                          label: 'Memory Request',
                          getter: (pool: TenantPool) => pool.resources?.requests?.memory ?? '',
                        },
                      ]}
                      data={item.spec.pools}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'expose',
                section: item.spec?.exposeServices && (
                  <SectionBox title="Expose Services">
                    <NameValueTable
                      rows={[
                        {
                          name: 'MinIO',
                          value: formatBooleanStatus(item.spec.exposeServices.minio),
                        },
                        {
                          name: 'Console',
                          value: formatBooleanStatus(item.spec.exposeServices.console),
                        },
                      ]}
                    />
                  </SectionBox>
                ),
              },
            ]
          }
        />
      ) : (
        <NotInstalledBanner isLoading={isMinioCheckLoading} />
      )}
    </>
  );
}
