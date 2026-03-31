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
import { DetailsGrid, SectionBox } from '../../../../components/common';
import { useCertManagerInstalled } from '../../hooks/useCertManagerInstalled';
import { ClusterIssuer } from '../../resources/clusterIssuer';
import {
  ACMEIssuerStatusComponent,
  ConditionsTable,
  NotInstalledBanner,
} from '../common/CommonComponents';
import { processIssuerExtraInfo } from '../common/processIssuerExtraInfo';

export function ClusterIssuerDetail() {
  const { name } = useParams<{ name: string }>();
  const { isManagerInstalled, isCertManagerCheckLoading } = useCertManagerInstalled();

  return isManagerInstalled ? (
    <DetailsGrid
      resourceType={ClusterIssuer}
      name={name}
      withEvents
      extraInfo={item => (item?.spec ? processIssuerExtraInfo(item.spec) : null)}
      extraSections={item =>
        item && [
          {
            id: 'Status',
            section: item?.status && (
              <SectionBox title="Status">
                {item.status?.acme && <ACMEIssuerStatusComponent status={item.status?.acme} />}
              </SectionBox>
            ),
          },
          {
            id: 'Conditions',
            section: item?.status && item.status?.conditions && (
              <ConditionsTable conditions={item.status?.conditions} />
            ),
          },
        ]
      }
    />
  ) : (
    <NotInstalledBanner isLoading={isCertManagerCheckLoading} />
  );
}
