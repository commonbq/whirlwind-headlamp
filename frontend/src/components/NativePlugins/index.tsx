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

import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { PluginInfo } from '../../plugin/pluginsSlice';
import { useTypedSelector } from '../../redux/hooks';
import { Link as HeadlampLink } from '../common/';
import SectionBox from '../common/SectionBox';
import SectionFilterHeader from '../common/SectionFilterHeader';
import Table from '../common/Table';

/** NativePlugins displays the list of plugins shipped with the application (type === 'shipped'). */
export default function NativePlugins() {
  const { t } = useTranslation(['translation']);
  const pluginSettings = useTypedSelector(state => state.plugins.pluginSettings);

  const nativePlugins = pluginSettings
    .filter((plugin: PluginInfo) => plugin.type === 'shipped')
    .map((plugin: PluginInfo) => {
      const [author, name] = plugin.name.includes('@')
        ? plugin.name.split(/\/(.+)/)
        : [null, plugin.name];
      return {
        ...plugin,
        displayName: name ?? plugin.name,
        origin: plugin.origin ?? author?.substring(1) ?? t('translation|Unknown'),
      };
    });

  return (
    <SectionBox
      title={<SectionFilterHeader title={t('translation|Native Plugins')} noNamespaceFilter />}
    >
      <Table
        columns={[
          {
            header: t('translation|Name'),
            accessorKey: 'name',
            muiTableBodyCellProps: {
              sx: {
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: 'unset',
              },
            },
            Cell: ({ row: { original: plugin } }: { row: { original: PluginInfo } }) => (
              <>
                <Typography variant="subtitle1" component="div">
                  <HeadlampLink
                    routeName={'pluginDetails'}
                    params={{ name: plugin.name, type: 'shipped' }}
                    align="right"
                  >
                    {plugin.displayName ?? plugin.name}
                  </HeadlampLink>
                </Typography>
                <Typography variant="caption">{plugin.version}</Typography>
              </>
            ),
          },
          {
            header: t('translation|Description'),
            accessorKey: 'description',
          },
          {
            header: t('translation|Origin'),
            Cell: ({ row: { original: plugin } }: { row: { original: PluginInfo } }) => {
              const url = plugin?.homepage || plugin?.repository?.url;
              return plugin?.origin ? (
                url ? (
                  <Link href={url}>{plugin.origin}</Link>
                ) : (
                  plugin.origin
                )
              ) : (
                t('translation|Unknown')
              );
            },
          },
          {
            header: t('translation|Status'),
            Cell: ({ row: { original: plugin } }: { row: { original: PluginInfo } }) => {
              if (plugin.isCompatible === false) {
                return (
                  <Chip
                    label={t('translation|Incompatible')}
                    size="small"
                    color="error"
                    title={t(
                      'translation|This plugin is not compatible with this version of Headlamp'
                    )}
                  />
                );
              }
              if (plugin.isEnabled === false) {
                return (
                  <Chip
                    label={t('translation|Disabled')}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                );
              }
              return <Chip label={t('translation|Loaded')} size="small" color="success" />;
            },
          },
        ]}
        data={nativePlugins}
      />
    </SectionBox>
  );
}
