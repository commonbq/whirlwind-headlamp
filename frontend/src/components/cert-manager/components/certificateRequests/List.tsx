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
import { useCertManagerInstalled } from '../../hooks/useCertManagerInstalled';
import { CertificateRequest } from '../../resources/certificateRequest';
import { NotInstalledBanner } from '../common/CommonComponents';

export function CertificateRequestsList() {
  const { isManagerInstalled, isCertManagerCheckLoading } = useCertManagerInstalled();

  return isManagerInstalled ? (
    <ResourceListView
      title="Certificate Requests"
      resourceClass={CertificateRequest}
      columns={[
        'name',
        'namespace',
        {
          id: 'approved',
          label: 'Approved',
          datum: 'approved',
        },
        {
          id: 'denied',
          label: 'Denied',
          datum: 'denied',
        },
        {
          id: 'ready',
          label: 'Ready',
          datum: 'ready',
        },
        {
          id: 'issuer',
          label: 'Issuer',
          getValue: item => item.spec.issuerRef.name,
        },
        {
          id: 'requester',
          label: 'Requester',
          getValue: item => item.spec.username,
        },
        'age',
      ]}
    />
  ) : (
    <NotInstalledBanner isLoading={isCertManagerCheckLoading} />
  );
}
