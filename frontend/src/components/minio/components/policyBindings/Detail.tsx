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
import { DetailsGrid, SectionBox, SimpleTable } from '../../../../components/common';
import { useMinioInstalled } from '../../hooks/useMinioInstalled';
import { PolicyBinding } from '../../resources/policyBinding';
import { NotInstalledBanner } from '../common/CommonComponents';

export function PolicyBindingDetail() {
  const { name, namespace } = useParams<{ name: string; namespace: string }>();
  const { isMinioInstalled, isMinioCheckLoading } = useMinioInstalled();

  return (
    <>
      {isMinioInstalled ? (
        <DetailsGrid
          resourceType={PolicyBinding}
          name={name}
          withEvents
          namespace={namespace}
          extraInfo={item =>
            item && [
              {
                name: 'Service Account',
                value: item.serviceAccount,
              },
              {
                name: 'SA Namespace',
                value: item.serviceAccountNamespace,
              },
            ]
          }
          extraSections={item =>
            item && [
              {
                id: 'policies',
                section: item.policies.length > 0 && (
                  <SectionBox title="Policies">
                    <SimpleTable
                      columns={[{ label: 'Policy', datum: 'name' }]}
                      data={item.policies.map(p => ({ name: p }))}
                    />
                  </SectionBox>
                ),
              },
              {
                id: 'conditions',
                section: item.status?.conditions && item.status.conditions.length > 0 && (
                  <SectionBox title="Conditions">
                    <SimpleTable
                      columns={[
                        { label: 'Type', datum: 'type' },
                        { label: 'Status', datum: 'status' },
                        { label: 'Reason', datum: 'reason' },
                        { label: 'Message', datum: 'message' },
                        { label: 'Last Transition', datum: 'lastTransitionTime' },
                      ]}
                      data={item.status.conditions}
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
