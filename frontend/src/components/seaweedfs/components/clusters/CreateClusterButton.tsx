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

import { Icon } from '@iconify/react';
import * as yaml from 'js-yaml';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelectedClusters } from '../../../../lib/k8s';
import { Activity } from '../../../activity/Activity';
import ActionButton from '../../../common/ActionButton';
import { AuthVisible, EditorDialog } from '../../../common/Resource';
import { SeaweedFSCluster } from '../../resources/seaweedfsCluster';

function buildTemplate(): string {
  const cluster = SeaweedFSCluster.getBaseObject();
  return yaml.dump(cluster);
}

export function CreateClusterButton() {
  const { t } = useTranslation(['translation']);
  const [errorMessage, setErrorMessage] = React.useState('');
  const clusters = useSelectedClusters();
  const activityId = 'create-resource-' + SeaweedFSCluster.apiName;
  const title = t('translation|Create {{ name }}', { name: 'SeaweedFS Cluster' });
  const template = React.useMemo(() => buildTemplate(), []);

  return (
    <AuthVisible item={SeaweedFSCluster} authVerb="create">
      <ActionButton
        color="primary"
        description={title}
        icon={'mdi:plus-circle'}
        onClick={() => {
          Activity.launch({
            id: activityId,
            title,
            location: 'full',
            cluster: clusters[0],
            icon: <Icon icon="mdi:plus-circle" />,
            content: (
              <EditorDialog
                noDialog
                item={template}
                open
                setOpen={() => {}}
                onClose={() => Activity.close(activityId)}
                saveLabel={t('translation|Apply')}
                errorMessage={errorMessage}
                onEditorChanged={() => setErrorMessage('')}
                title={title}
                aria-label={title}
              />
            ),
          });
        }}
      />
    </AuthVisible>
  );
}
