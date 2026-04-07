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

import type { KubeObject } from '../../lib/k8s/KubeObject';
import {
  DefaultDetailsViewSection,
  registerDetailsViewHeaderActionsProcessor,
  registerDetailsViewSectionsProcessor,
  registerPluginSettings,
} from '../../plugin/registry';
import { LokiLogsViewer } from './components/LokiLogsViewer/LokiLogsViewer';
import { LokiVisibilityButton } from './components/LokiVisibilityButton/LokiVisibilityButton';
import { Settings } from './components/Settings/Settings';
import { LogEnabledKinds, PLUGIN_NAME } from './util';

type SectionWithId = { id: string };

const hasSectionId = (section: unknown): section is SectionWithId =>
  typeof section === 'object' &&
  section !== null &&
  'id' in section &&
  typeof (section as SectionWithId).id === 'string';

function LokiLogs(resource: KubeObject) {
  if (!LogEnabledKinds.includes(resource.kind)) {
    return null;
  }
  return <LokiLogsViewer resource={resource} />;
}

export function registerLoki() {
  registerPluginSettings(PLUGIN_NAME, Settings, true);

  registerDetailsViewSectionsProcessor(function addLokiLogsSection(resource, sections) {
    if (!resource) return sections;

    const lokiSection = 'loki_logs';
    if (sections.findIndex(s => hasSectionId(s) && s.id === lokiSection) !== -1) {
      return sections;
    }

    const headerIdx = sections.findIndex(
      s => hasSectionId(s) && s.id === DefaultDetailsViewSection.MAIN_HEADER
    );
    if (headerIdx === -1) return sections;

    sections.splice(headerIdx + 1, 0, {
      id: lokiSection,
      section: LokiLogs(resource),
    });

    return sections;
  });

  registerDetailsViewHeaderActionsProcessor(function addLokiLogsButton(resource, actions) {
    if (!resource) return actions;

    const lokiAction = 'loki_logs';
    if (actions.findIndex(a => a.id === lokiAction) !== -1) return actions;

    if (!LogEnabledKinds.includes(resource?.jsonData?.kind)) return actions;

    actions.splice(0, 0, {
      id: lokiAction,
      action: <LokiVisibilityButton resource={resource} />,
    });

    return actions;
  });
}
