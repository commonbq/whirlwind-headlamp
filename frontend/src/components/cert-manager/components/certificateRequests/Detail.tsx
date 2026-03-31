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
import { DetailsGrid, NameValueTable } from '../../../../components/common';
import { useCertManagerInstalled } from '../../hooks/useCertManagerInstalled';
import { CertificateRequest } from '../../resources/certificateRequest';
import {
  ConditionsTable,
  CopyToClipboard,
  IssuerRef,
  NotInstalledBanner,
} from '../common/CommonComponents';

export function CertificateRequestDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const { isManagerInstalled, isCertManagerCheckLoading } = useCertManagerInstalled();

  return (
    <>
      {isManagerInstalled ? (
        <DetailsGrid
          resourceType={CertificateRequest}
          name={name}
          withEvents
          namespace={namespace}
          extraInfo={item =>
            item && [
              {
                name: 'Ready',
                value: item.ready ? 'Ready' : 'Not Ready',
              },
              {
                name: 'Approved',
                value: item.approved === 'True' ? 'Yes' : 'No',
              },
              {
                name: 'Denied',
                value: item.denied === 'True' ? 'Yes' : 'No',
              },
              {
                name: 'Duration',
                value: item.spec?.duration,
              },
              {
                name: 'Is CA',
                value: item.spec?.isCA ? 'Yes' : 'No',
              },
              {
                name: 'Usages',
                value: item.spec?.usages?.length && (
                  <NameValueTable
                    rows={item.spec?.usages?.map((usage, index) => ({
                      name: `Usage ${index + 1}`,
                      value: usage,
                    }))}
                  />
                ),
              },
              {
                name: 'Issuer Ref',
                value: item.spec.issuerRef && (
                  <IssuerRef
                    issuerRef={item.spec.issuerRef}
                    namespace={item.metadata?.namespace ?? ''}
                  />
                ),
              },
              {
                name: 'Request',
                value: <CopyToClipboard text={item.spec.request} />,
              },
              {
                name: 'Certificate',
                value: item.status?.certificate && (
                  <CopyToClipboard text={item.status.certificate} />
                ),
              },
              {
                name: 'CA',
                value: item.status?.ca && <CopyToClipboard text={item.status.ca} />,
              },
              {
                name: 'Failure Time',
                value: item.status?.failureTime,
              },
            ]
          }
          extraSections={item =>
            item && [
              {
                id: 'Status',
                section: item.status?.conditions && (
                  <ConditionsTable conditions={item.status.conditions} />
                ),
              },
            ]
          }
        />
      ) : (
        <NotInstalledBanner isLoading={isCertManagerCheckLoading} />
      )}
    </>
  );
}
