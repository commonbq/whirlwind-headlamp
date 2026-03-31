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
import { useCertManagerInstalled } from '../../hooks/useCertManagerInstalled';
import { Certificate } from '../../resources/certificate';
import { IssuerRef, NotInstalledBanner, StringArray } from '../common/CommonComponents';

export function CertificateDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const { isManagerInstalled, isCertManagerCheckLoading } = useCertManagerInstalled();

  return (
    <>
      {isManagerInstalled ? (
        <DetailsGrid
          resourceType={Certificate}
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
                name: 'Common Name',
                value: item.spec?.commonName,
              },
              {
                name: 'DNS Names',
                value: <StringArray items={item.spec?.dnsNames} />,
              },
              {
                name: 'Email Addresses',
                value: <StringArray items={item.spec?.emailAddresses} />,
              },
              {
                name: 'IP Addresses',
                value: <StringArray items={item.spec?.ipAddresses} />,
              },
              {
                name: 'URIs',
                value: <StringArray items={item.spec?.uris} />,
              },
              {
                name: 'Duration',
                value: item.spec?.duration,
              },
              {
                name: 'Renew Before',
                value: item.spec?.renewBefore,
              },
              {
                name: 'Is CA',
                value: item.spec?.isCA ? 'Yes' : 'No',
              },
              {
                name: 'Usages',
                value: <StringArray items={item.spec?.usages} />,
              },
              {
                name: 'Revision History Limit',
                value: item.spec?.revisionHistoryLimit?.toString(),
              },
              {
                name: 'Secret Name',
                value: item.spec.secretName,
              },
              {
                name: 'Issuer Ref',
                value: item.spec.issuerRef && (
                  <IssuerRef
                    issuerRef={item.spec.issuerRef}
                    namespace={item.metadata.namespace ?? ''}
                  />
                ),
              },
            ]
          }
          extraSections={item =>
            item && [
              {
                id: 'Subject',
                section: item.spec.subject && (
                  <SectionBox title="Subject">
                    <NameValueTable
                      rows={[
                        {
                          name: 'Organizations',
                          value: <StringArray items={item.spec.subject?.organizations} />,
                        },
                        {
                          name: 'Countries',
                          value: <StringArray items={item.spec.subject?.countries} />,
                        },
                        {
                          name: 'Organizational Units',
                          value: <StringArray items={item.spec.subject?.organizationalUnits} />,
                        },
                        {
                          name: 'Localities',
                          value: <StringArray items={item.spec.subject?.localities} />,
                        },
                        {
                          name: 'Provinces',
                          value: <StringArray items={item.spec.subject?.provinces} />,
                        },
                        {
                          name: 'Street Addresses',
                          value: <StringArray items={item.spec.subject?.streetAddresses} />,
                        },
                        {
                          name: 'Postal Codes',
                          value: <StringArray items={item.spec.subject?.postalCodes} />,
                        },
                        {
                          name: 'Serial Number',
                          value: item.spec?.subject?.serialNumber,
                        },
                      ]}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'Private Key',
                section: item.spec.privateKey && (
                  <SectionBox title="Private Key">
                    <NameValueTable
                      rows={[
                        {
                          name: 'Algorithm',
                          value: item.spec.privateKey?.algorithm,
                        },
                        {
                          name: 'Size',
                          value: item.spec.privateKey.size?.toString(),
                        },
                        {
                          name: 'Encoding',
                          value: item.spec.privateKey?.encoding,
                        },
                        {
                          name: 'Rotation Policy',
                          value: item.spec.privateKey?.rotationPolicy,
                        },
                      ]}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'Keystores',
                section: item.spec.keystores && (
                  <SectionBox title="Keystores">
                    <NameValueTable
                      rows={[
                        {
                          name: 'JKS',
                          value: item.spec?.keystores?.jks && (
                            <NameValueTable
                              rows={[
                                {
                                  name: 'Create',
                                  value: item.spec?.keystores?.jks?.create.toString(),
                                },
                                {
                                  name: 'Password Secret Ref',
                                  value: item.spec?.keystores?.jks?.passwordSecretRef && (
                                    <NameValueTable
                                      rows={[
                                        {
                                          name: 'Name',
                                          value: item.spec?.keystores?.jks?.passwordSecretRef?.name,
                                        },
                                        {
                                          name: 'Key',
                                          value: item.spec?.keystores?.jks?.passwordSecretRef?.key,
                                        },
                                      ]}
                                    />
                                  ),
                                },
                              ]}
                            />
                          ),
                        },
                        {
                          name: 'PKCS12',
                          value: item.spec?.keystores?.pkcs12 && (
                            <NameValueTable
                              rows={[
                                {
                                  name: 'Create',
                                  value: item.spec?.keystores?.pkcs12?.create.toString(),
                                },
                                {
                                  name: 'Password Secret Ref',
                                  value: item.spec?.keystores?.pkcs12?.passwordSecretRef && (
                                    <NameValueTable
                                      rows={[
                                        {
                                          name: 'Name',
                                          value:
                                            item.spec?.keystores?.pkcs12?.passwordSecretRef?.name,
                                        },
                                        {
                                          name: 'Key',
                                          value:
                                            item.spec?.keystores?.pkcs12?.passwordSecretRef?.key,
                                        },
                                      ]}
                                    />
                                  ),
                                },
                              ]}
                            />
                          ),
                        },
                      ]}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'Status',
                section: item.status && (
                  <SectionBox title="Status">
                    <NameValueTable
                      rows={[
                        {
                          name: 'Not Before',
                          value: item.status?.notBefore,
                        },
                        {
                          name: 'Not After',
                          value: item.status?.notAfter,
                        },
                        {
                          name: 'Renewal Time',
                          value: item.status?.renewalTime,
                        },
                        {
                          name: 'Revision',
                          value: item.status?.revision?.toString(),
                        },
                        {
                          name: 'Next Private Key Secret',
                          value: item.status?.nextPrivateKeySecretName,
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
        <NotInstalledBanner isLoading={isCertManagerCheckLoading} />
      )}
    </>
  );
}
