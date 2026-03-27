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
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Divider,
  FormControlLabel,
  Link as MuiLink,
  Pagination,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigStore } from '../../../../plugin/configStore';
import { Link, Loader, SectionHeader } from '../../../common';
import { HoverInfoLabel } from '../../../common/Label';
import { getCatalogConfig } from '../../api/catalogConfig';
import { fetchChartIcon, fetchChartsFromArtifact } from '../../api/charts';
import { PAGE_OFFSET_COUNT_FOR_CHARTS, VANILLA_HELM_REPO } from '../../constants/catalog';
import { AvailableComponentVersions } from '../../helpers/catalog';
import { EditorDialog } from './EditorDialog';

interface AppCatalogConfig {
  showOnlyVerified: boolean;
}

export const store = new ConfigStore<AppCatalogConfig>('app-catalog');
const useStoreConfig = store.useConfig();

declare global {
  var AVAILABLE_VERSIONS: Map<any, any[]>;
}

interface SearchProps {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}

function Search({ search, setSearch }: SearchProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(search);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSearch(inputValue);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue, setSearch]);

  return (
    <TextField
      sx={{
        width: '20vw',
        margin: '0 1rem',
      }}
      id="outlined-basic"
      label={t('Search')}
      value={inputValue}
      onChange={event => {
        setInputValue(event.target.value);
      }}
    />
  );
}

interface CategoryForChartsProps {
  helmChartCategoryList: { title: string; value: number }[];
  chartCategory: { title: string; value: number };
  setChartCategory: React.Dispatch<React.SetStateAction<{ title: string; value: number }>>;
}

function CategoryForCharts({
  helmChartCategoryList,
  chartCategory,
  setChartCategory,
}: CategoryForChartsProps) {
  const { t } = useTranslation();
  return (
    <Autocomplete
      sx={{
        width: '20vw',
      }}
      options={helmChartCategoryList}
      getOptionLabel={option => option?.title ?? helmChartCategoryList[0].title}
      defaultValue={helmChartCategoryList[0]}
      value={chartCategory}
      onChange={(event, newValue: { title: string; value: number } | null) => {
        setChartCategory(oldValue => {
          if ((newValue?.value ?? helmChartCategoryList[0].value) === oldValue.value) {
            return oldValue;
          }
          return newValue ?? helmChartCategoryList[0];
        });
      }}
      renderInput={params => (
        <TextField {...params} label={t('Categories')} placeholder={t('Favorites')} />
      )}
    />
  );
}

interface OnlyVerifiedSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function OnlyVerifiedSwitch({ checked, onChange }: OnlyVerifiedSwitchProps) {
  const { t } = useTranslation();
  return (
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={checked}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            onChange(event.target.checked);
          }}
        />
      }
      sx={{ gap: 1 }}
      label={
        <HoverInfoLabel
          label={t('Only verified')}
          hoverInfo={t('Show charts from verified publishers only')}
        />
      }
    />
  );
}

export function ChartsList({ fetchCharts = fetchChartsFromArtifact }) {
  const { t } = useTranslation();
  const helmChartCategoryList = [
    { title: t('All'), value: 0 },
    { title: t('AI / Machine learning'), value: 1 },
    { title: t('Database'), value: 2 },
    { title: t('Integration and delivery'), value: 3 },
    { title: t('Monitoring and logging'), value: 4 },
    { title: t('Networking'), value: 5 },
    { title: t('Security'), value: 6 },
    { title: t('Storage'), value: 7 },
    { title: t('Streaming and messaging'), value: 8 },
  ];
  const [charts, setCharts] = useState<any | null>(null);
  const [openEditor, setEditorOpen] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [chartsTotalCount, setChartsTotalCount] = useState(0);
  const [chartCategory, setChartCategory] = useState(helmChartCategoryList[0]);
  const [search, setSearch] = useState('');
  const [selectedChartForInstall, setSelectedChartForInstall] = useState<any | null>(null);
  const [iconUrls, setIconUrls] = useState<{ [url: string]: string }>({});

  const config = useStoreConfig();
  const showOnlyVerified = config?.showOnlyVerified ?? true;
  const chartCfg = getCatalogConfig();

  useEffect(() => {
    setPage(1);
  }, [chartCategory, search]);

  useEffect(
    function fetchChartsOnPageChange() {
      store.set({ showOnlyVerified: showOnlyVerified });

      async function fetchData() {
        try {
          const { data, total } = await fetchCharts(search, showOnlyVerified, chartCategory, page);
          if (chartCfg.chartProfile === VANILLA_HELM_REPO) {
            setCharts(data.entries);
            setChartsTotalCount(parseInt(total));
            globalThis.AVAILABLE_VERSIONS = AvailableComponentVersions(data.entries);
          } else {
            setCharts(Object.fromEntries(data.packages.map((chart: any) => [chart.name, chart])));
            setChartsTotalCount(parseInt(total));
          }
        } catch (err) {
          console.error('Error fetching charts', err);
          setCharts({});
        }
      }
      fetchData();
    },
    [page, chartCategory, search, showOnlyVerified]
  );

  type HelmIndex = Record<string, any[]>;
  useEffect(() => {
    if (charts && Object.keys(charts).length > 0) {
      const fetchIcons = async () => {
        try {
          const urls: { [url: string]: string } = {};
          const list = Object.values(charts as HelmIndex).flat();
          const iconPromises = list.map(async (chart: any) => {
            const iconURL = chart.icon ?? '';
            if (iconURL === '') {
              return;
            }
            const isURL = (urlString: string) => {
              try {
                new URL(urlString);
                return true;
              } catch (e) {
                return false;
              }
            };
            if (isURL(iconURL)) {
              urls[iconURL] = iconURL;
            } else {
              const fetchIcon = async () => {
                try {
                  const response = await fetchChartIcon(iconURL);
                  const contentType = response.headers?.get('Content-Type');
                  if (
                    contentType.includes('image/svg+xml') ||
                    contentType.includes('text/xml') ||
                    contentType.includes('text/plain')
                  ) {
                    const txt = await response.text();
                    const reader = new FileReader();
                    await new Promise((resolve, reject) => {
                      reader.onloadend = () => resolve(reader.result);
                      reader.onerror = reject;
                      reader.readAsText(new Blob([txt], { type: 'text/plain' }));
                    });
                    urls[iconURL] = `data:image/svg+xml;utf8,${encodeURIComponent(txt)}`;
                  } else if (contentType.includes('image/')) {
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const result = await new Promise((resolve, reject) => {
                      reader.onloadend = () => resolve(reader.result);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                    urls[iconURL] = result as string;
                  }
                } catch (error) {
                  console.error('failed to fetch icon:', error);
                }
              };
              await fetchIcon();
            }
          });
          await Promise.all(iconPromises);
          setIconUrls(urls);
        } catch (error) {
          console.error('Error fetching icons:', error);
        }
      };
      fetchIcons();
    }
  }, [charts]);

  return (
    <>
      <EditorDialog
        openEditor={openEditor}
        chart={selectedChartForInstall}
        handleEditor={(open: boolean) => setEditorOpen(open)}
        chartProfile={VANILLA_HELM_REPO}
      />
      <SectionHeader
        title={t('Applications')}
        titleSideActions={[
          <Box key="verified-switch" pl={2}>
            <OnlyVerifiedSwitch
              checked={showOnlyVerified}
              onChange={(isChecked: boolean) => {
                store.set({ showOnlyVerified: isChecked });
                setPage(1);
              }}
            />
          </Box>,
        ]}
        actions={[
          <Search key="search" search={search} setSearch={setSearch} />,
          <CategoryForCharts
            key="category"
            helmChartCategoryList={helmChartCategoryList}
            chartCategory={chartCategory}
            setChartCategory={setChartCategory}
          />,
        ]}
      />
      <Box>
        {!charts ? (
          <Box sx={{ margin: '0 auto' }}>
            <Loader title="" />
          </Box>
        ) : Object.keys(charts).length === 0 ? (
          <Box mt={2} mx={2}>
            <Typography variant="h5" component="h2">
              {search
                ? t('No charts found for search term: {{ search }}', { search })
                : t('No charts found for category: {{ category }}', {
                    category: chartCategory.title,
                  })}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(auto-fit, minmax(260px, 1fr))',
                md: 'repeat(auto-fit, minmax(320px, 1fr))',
              },
              gap: 3,
              m: 2,
            }}
          >
            {Object.keys(
              Object.keys(charts)
                .filter(key => key.includes(search))
                .reduce(
                  (obj, key) => {
                    return Object.assign(obj, { [key]: charts[key] });
                  },
                  {} as Record<string, any>
                )
            ).map(chartName => {
              return (
                Array.isArray(charts[chartName])
                  ? charts[chartName]?.slice?.(0, 1) || []
                  : [charts[chartName]]
              ).map((chart: any) => {
                return (
                  <Card
                    key={`${chart.name}-${chart.version}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      boxShadow: 3,
                    }}
                  >
                    <Box
                      height="60px"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      marginTop="15px"
                    >
                      {chartCfg.chartProfile === VANILLA_HELM_REPO
                        ? iconUrls[chart.icon] && (
                            <CardMedia
                              image={iconUrls[chart.icon]}
                              alt={`${chart.name} logo`}
                              sx={{
                                width: 60,
                                height: 60,
                                m: 2,
                                alignSelf: 'flex-start',
                                objectFit: 'contain',
                              }}
                              component="img"
                            />
                          )
                        : chart.logo_image_id && (
                            <CardMedia
                              image={`https://artifacthub.io/image/${chart.logo_image_id}`}
                              alt={`${chart.name} logo`}
                              sx={{
                                width: 60,
                                height: 60,
                                m: 2,
                                alignSelf: 'flex-start',
                                objectFit: 'contain',
                              }}
                              component="img"
                            />
                          )}
                      <Box display="flex" alignItems="center" marginLeft="auto" marginRight="10px">
                        {(chart?.cncf || chart?.repository?.cncf) && (
                          <Tooltip title={t('CNCF Project')}>
                            <Icon
                              icon="simple-icons:cncf"
                              style={{ marginLeft: '0.5em', fontSize: '20px' }}
                            />
                          </Tooltip>
                        )}
                        {(chart?.official || chart?.repository?.official) && (
                          <Tooltip title={t('Official Chart')}>
                            <Icon
                              icon="mdi:star-circle"
                              style={{ marginLeft: '0.5em', fontSize: '22px' }}
                            />
                          </Tooltip>
                        )}
                        {chart?.repository?.verified_publisher && (
                          <Tooltip title={t('Verified Publisher')}>
                            <Icon
                              icon="mdi:check-decagram"
                              style={{ marginLeft: '0.5em', fontSize: '22px' }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    <CardContent
                      sx={{
                        my: 2,
                        pt: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        flexGrow: 1,
                      }}
                    >
                      <Box sx={{ wordBreak: 'break-word' }}>
                        <Tooltip title={chart.name}>
                          <Typography component="h2" variant="h5">
                            {chartCfg.chartProfile === VANILLA_HELM_REPO ? (
                              chart.name
                            ) : (
                              <Link
                                routeName="appCatalogChartDetail"
                                params={{
                                  chartName: chart.name,
                                  repoName: chart?.repository?.name,
                                }}
                              >
                                {chart.name}
                              </Link>
                            )}
                          </Typography>
                        </Tooltip>
                      </Box>
                      <Box display="flex" justifyContent="space-between" my={1}>
                        {chart.version.startsWith('v') ? (
                          <Typography>{chart.version}</Typography>
                        ) : (
                          <Typography>v{chart.version}</Typography>
                        )}
                        <Box marginLeft={1} sx={{ wordBreak: 'break-word' }}>
                          <Tooltip title={chart?.repository?.name || ''}>
                            <Typography>{chart?.repository?.name || ''}</Typography>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Divider />
                      <Box mt={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-word',
                            minHeight: '72px',
                            maxHeight: '72px',
                          }}
                        >
                          {chart?.description?.slice(0, 100)}
                          {chart?.description?.length > 100 && (
                            <Tooltip title={chart?.description}>
                              <span>…</span>
                            </Tooltip>
                          )}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions
                      sx={{
                        justifyContent: 'space-between',
                        px: 3,
                        py: 2,
                        gap: 1,
                        flexWrap: 'wrap',
                        mt: 'auto',
                      }}
                    >
                      <Button
                        sx={{
                          backgroundColor: '#000',
                          color: 'white',
                          textTransform: 'none',
                          '&:hover': { background: '#605e5c' },
                        }}
                        onClick={() => {
                          setSelectedChartForInstall(chart);
                          setEditorOpen(true);
                        }}
                      >
                        {t('Install')}
                      </Button>
                      {chartCfg.chartProfile === VANILLA_HELM_REPO ? (
                        !chart?.sources ? (
                          ''
                        ) : chart?.sources?.length === 1 ? (
                          <MuiLink href={chart?.sources} target="_blank">
                            {t('Learn More')}
                          </MuiLink>
                        ) : (
                          <MuiLink href={chart?.sources[0]} target="_blank">
                            {t('Learn More')}
                          </MuiLink>
                        )
                      ) : (
                        <MuiLink href={chart?.repository?.url} target="_blank">
                          {t('Learn More')}
                        </MuiLink>
                      )}
                    </CardActions>
                  </Card>
                );
              });
            })}
          </Box>
        )}
      </Box>
      {charts && Object.keys(charts).length !== 0 && (
        <Box mt={2} mx="auto" maxWidth="max-content">
          <Pagination
            size="large"
            shape="rounded"
            page={page}
            count={Math.ceil(chartsTotalCount / PAGE_OFFSET_COUNT_FOR_CHARTS)}
            color="primary"
            onChange={(e, page: number) => {
              setPage(page);
            }}
          />
        </Box>
      )}
      {chartCfg.chartProfile !== VANILLA_HELM_REPO && (
        <Box textAlign="right">
          <MuiLink href="https://artifacthub.io/" target="_blank">
            {t('Powered by ArtifactHub')}
          </MuiLink>
        </Box>
      )}
    </>
  );
}
