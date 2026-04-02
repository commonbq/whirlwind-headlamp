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
import { Challenge } from '../../resources/challenge';
import {
  ACMEChallengeSolverComponent,
  CopyToClipboard,
  IssuerRef,
  NotInstalledBanner,
} from '../common/CommonComponents';

export function ChallengeDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const { isManagerInstalled, isCertManagerCheckLoading } = useCertManagerInstalled();

  return (
    <>
      {isManagerInstalled ? (
        <DetailsGrid
          resourceType={Challenge}
          name={name}
          namespace={namespace}
          withEvents
          extraInfo={item =>
            item && [
              {
                name: 'DNS Name',
                value: item.spec.dnsName,
              },
              {
                name: 'Authorization URL',
                value: item.spec.authorizationURL,
              },
              {
                name: 'Type',
                value: item.spec.type,
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
              {
                name: 'Key',
                value: <CopyToClipboard text={item.spec.key} />,
              },
              {
                name: 'Solver',
                value: <ACMEChallengeSolverComponent solver={item.spec.solver} />,
              },
              {
                name: 'Token',
                value: item.spec.token,
              },
              {
                name: 'URL',
                value: item.spec.url,
              },
              {
                name: 'Wildcard',
                value: item.spec?.wildcard?.toString() || 'false',
              },
            ]
          }
          extraSections={item =>
            item && [
              {
                id: 'Status',
                section: item?.status && (
                  <SectionBox title="Status">
                    <NameValueTable
                      rows={[
                        { name: 'State', value: item.status?.state },
                        { name: 'Presented', value: item.status.presented.toString() },
                        { name: 'Processing', value: item.status.processing.toString() },
                        { name: 'Reason', value: item.status?.reason },
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
