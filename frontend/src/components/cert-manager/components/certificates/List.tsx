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

import { DateLabel, ResourceListView } from '../../../../components/common';
import { useCertManagerInstalled } from '../../hooks/useCertManagerInstalled';
import { Certificate } from '../../resources/certificate';
import { NotInstalledBanner } from '../common/CommonComponents';

export function CertificatesList() {
  const { isManagerInstalled, isCertManagerCheckLoading } = useCertManagerInstalled();

  return isManagerInstalled ? (
    <ResourceListView
      title="Certificates"
      resourceClass={Certificate}
      columns={[
        'name',
        'namespace',
        {
          id: 'ready',
          label: 'Ready',
          getValue: item => (item.ready ? 'Ready' : 'Not Ready'),
        },
        {
          id: 'secret',
          label: 'Secret',
          getValue: item => item.spec.secretName,
        },
        {
          id: 'expiresIn',
          label: 'Expires In (Not After)',
          render: item => {
            return item?.status?.notAfter ? (
              <DateLabel date={item.status.notAfter} format="mini" />
            ) : null;
          },
          getValue: item => item.status?.notAfter ?? '',
          sort: (a, b) => {
            const dateA = new Date(a.status?.notAfter ?? '');
            const dateB = new Date(b.status?.notAfter ?? '');
            return dateA.getTime() - dateB.getTime();
          },
        },
        'age',
      ]}
    />
  ) : (
    <NotInstalledBanner isLoading={isCertManagerCheckLoading} />
  );
}
