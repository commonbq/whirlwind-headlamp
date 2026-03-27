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

import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateLabel, Link, SectionBox, SimpleTable, StatusLabel } from '../../../common';
import { fetchLatestAppVersion } from '../../api/charts';
import { listReleases } from '../../api/releases';

function formatVersion(v?: string) {
  const s = (v ?? '').trim();
  if (!s || s === '—') {
    return '—';
  }
  return s;
}

export default function ReleaseList({ fetchReleases = listReleases }) {
  const { t } = useTranslation();
  const [releases, setReleases] = useState<Array<any> | null>(null);
  const [latestMap, setLatestMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReleases().then((response: any) => {
      if (!response.releases) {
        setReleases([]);
        return;
      }
      setReleases(response.releases);
    });
  }, []);

  useEffect(() => {
    if (!releases?.length) {
      setLatestMap({});
      return;
    }

    Promise.all(
      releases.map(async r => {
        const chartName = r?.chart?.metadata?.name;
        const v = chartName ? await fetchLatestAppVersion(chartName).catch(() => '—') : '—';
        return [r.name, v] as const;
      })
    ).then(entries => setLatestMap(Object.fromEntries(entries)));
  }, [releases]);

  return (
    <SectionBox title={t('Installed')} textAlign="center" paddingTop={2}>
      <SimpleTable
        columns={[
          {
            label: t('Name'),
            getter: (release: any) => (
              <Box display="flex" alignItems="center">
                {release.chart.metadata.icon && (
                  <Box>
                    <img
                      width={50}
                      src={release.chart.metadata.icon}
                      alt={release.chart.metadata.name}
                    />
                  </Box>
                )}
                <Box ml={1}>
                  <Link
                    routeName="appCatalogReleaseDetail"
                    params={{ releaseName: release.name, namespace: release.namespace }}
                  >
                    {release.name}
                  </Link>
                </Box>
              </Box>
            ),
          },
          {
            label: t('Namespace'),
            getter: (release: any) => release.namespace,
          },
          {
            label: t('Current Version'),
            getter: (release: any) => formatVersion(release.chart.metadata.appVersion),
          },
          {
            label: t('Latest Version'),
            getter: (release: any) => formatVersion(latestMap[release?.name]),
          },
          {
            label: t('Version'),
            getter: (release: any) => release.version,
            sort: true,
          },
          {
            label: t('Status'),
            getter: (release: any) => (
              <StatusLabel status={release.info.status === 'deployed' ? 'success' : 'error'}>
                {release.info.status}
              </StatusLabel>
            ),
          },
          {
            label: t('Updated'),
            getter: (release: any) => <DateLabel date={release.info.last_deployed} format="mini" />,
          },
        ]}
        data={releases}
      />
    </SectionBox>
  );
}
