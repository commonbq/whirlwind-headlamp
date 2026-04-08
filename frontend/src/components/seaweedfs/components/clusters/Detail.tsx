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
import { DetailsGrid, NameValueTable, SectionBox } from '../../../../components/common';
import { useSeaweedFSInstalled } from '../../hooks/useSeaweedFSInstalled';
import { SeaweedFSCluster } from '../../resources/seaweedfsCluster';
import { NotInstalledBanner } from '../common/CommonComponents';

export function ClusterDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const { isSeaweedFSInstalled, isSeaweedFSCheckLoading } = useSeaweedFSInstalled();

  return (
    <>
      {isSeaweedFSInstalled ? (
        <DetailsGrid
          resourceType={SeaweedFSCluster}
          name={name}
          withEvents
          namespace={namespace}
          extraInfo={item =>
            item && [
              {
                name: 'Phase',
                value: item.phase,
              },
              {
                name: 'Image',
                value: item.image,
              },
              {
                name: 'Master Replicas',
                value: item.masterReplicas,
              },
              {
                name: 'Volume Replicas',
                value: item.volumeReplicas,
              },
              {
                name: 'Filer Replicas',
                value: item.filerReplicas,
              },
            ]
          }
          extraSections={item =>
            item && [
              {
                id: 'master',
                section: item.spec?.master && (
                  <SectionBox title="Master">
                    <NameValueTable
                      rows={[
                        { name: 'Replicas', value: String(item.spec.master.replicas ?? '') },
                        { name: 'Storage', value: item.spec.master.storage ?? '' },
                        { name: 'Storage Class', value: item.spec.master.storageClassName ?? '' },
                        {
                          name: 'Volume Size Limit (MB)',
                          value: String(item.spec.master.volumeSizeLimitMB ?? ''),
                        },
                      ]}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'volume',
                section: item.spec?.volume && (
                  <SectionBox title="Volume">
                    <NameValueTable
                      rows={[
                        { name: 'Replicas', value: String(item.spec.volume.replicas ?? '') },
                        { name: 'Storage', value: item.spec.volume.storage ?? '' },
                        { name: 'Storage Class', value: item.spec.volume.storageClassName ?? '' },
                        {
                          name: 'Memory Request',
                          value: item.spec.volume.requests?.memory ?? '',
                        },
                        { name: 'CPU Request', value: item.spec.volume.requests?.cpu ?? '' },
                      ]}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'filer',
                section: item.spec?.filer && (
                  <SectionBox title="Filer">
                    <NameValueTable
                      rows={[
                        { name: 'Replicas', value: String(item.spec.filer.replicas ?? '') },
                        { name: 'Storage', value: item.spec.filer.storage ?? '' },
                        { name: 'Storage Class', value: item.spec.filer.storageClassName ?? '' },
                        { name: 'Max MB', value: String(item.spec.filer.maxMB ?? '') },
                        {
                          name: 'S3 Enabled',
                          value: item.spec.filer.s3?.enabled ? 'Yes' : 'No',
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
        <NotInstalledBanner isLoading={isSeaweedFSCheckLoading} />
      )}
    </>
  );
}
