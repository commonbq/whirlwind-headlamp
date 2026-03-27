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

import Editor from '@monaco-editor/react';
import { Box, Button, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { Autocomplete } from '@mui/material';
import _ from 'lodash';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Namespace from '../../../../lib/k8s/namespace';
import { Dialog, Loader } from '../../../common';
import { getCatalogConfig } from '../../api/catalogConfig';
import { fetchChartDetailFromArtifact, fetchChartValues } from '../../api/charts';
import { createRelease, getActionStatus } from '../../api/releases';
import { addRepository } from '../../api/repository';
import { APP_CATALOG_HELM_REPOSITORY } from '../../constants/catalog';
import { jsonToYAML, yamlToJSON } from '../../helpers';

type FieldType = {
  value: string;
  title: string;
};

type EditorDialogProps = {
  openEditor: boolean;
  chart: any;
  handleEditor: (open: boolean) => void;
  chartProfile: string;
};

export function EditorDialog(props: EditorDialogProps) {
  if (!props.chart) return null;
  return <EditorDialogInner {...props} />;
}

function EditorDialogInner({ openEditor, handleEditor, chart, chartProfile }: EditorDialogProps) {
  const { t } = useTranslation();
  const [installLoading, setInstallLoading] = useState(false);
  const [namespaces] = Namespace.useList();
  const [chartValues, setChartValues] = useState<string>('');
  const [defaultChartValues, setDefaultChartValues] = useState<Record<string, unknown>>({});
  const [chartValuesLoading, setChartValuesLoading] = useState(false);
  const [chartValuesFetchError, setChartValuesFetchError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [versions, setVersions] = useState<FieldType[]>([]);
  const [chartInstallDescription, setChartInstallDescription] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<FieldType>();
  const [selectedNamespace, setSelectedNamespace] = useState<FieldType>();
  const [releaseName, setReleaseName] = useState('');
  const namespaceNames = namespaces?.map(namespace => ({
    value: namespace.metadata.name,
    title: namespace.metadata.name,
  }));
  const themeName = localStorage.getItem('headlampThemePreference');
  const chartCfg = getCatalogConfig();

  useEffect(() => {
    setIsFormSubmitting(false);
  }, [openEditor]);

  useEffect(() => {
    if (!selectedNamespace && !!namespaceNames) {
      setSelectedNamespace(namespaceNames[0]);
    }
  }, [selectedNamespace, namespaceNames]);

  function refreshChartValue(packageID: string, packageVersion: string) {
    fetchChartValues(packageID, packageVersion)
      .then((response: any) => {
        setChartValues(response);
        setDefaultChartValues(yamlToJSON(response));
      })
      .catch(error => {
        enqueueSnackbar(t('Error fetching chart values {{ error }}', { error }), {
          variant: 'error',
        });
      });
  }

  function handleChartValueFetch(chart: any) {
    const packageID = chartCfg.chartProfile === chartProfile ? chart.name : chart.package_id;
    const packageVersion = selectedVersion?.value ?? chart.version;
    setChartValuesLoading(true);
    fetchChartValues(packageID, packageVersion)
      .then((response: any) => {
        setChartValuesLoading(false);
        setChartValues(response);
        setDefaultChartValues(yamlToJSON(response));
      })
      .catch(error => {
        setChartValuesLoading(false);
        setChartValuesFetchError(error);
        enqueueSnackbar(t('Error fetching chart values {{ error }}', { error }), {
          variant: 'error',
        });
      });
  }

  useEffect(() => {
    if (chartCfg.chartProfile === chartProfile) {
      const versionsArray =
        globalThis.AVAILABLE_VERSIONS instanceof Map && chart.name
          ? globalThis.AVAILABLE_VERSIONS.get(chart.name)
          : undefined;

      const availableVersions = Array.isArray(versionsArray)
        ? versionsArray.map(({ version }) => ({
            title: version,
            value: version,
          }))
        : [];
      setVersions(availableVersions);
      setChartInstallDescription(`${chart.name} deployment`);
      setSelectedVersion(availableVersions[0]);
    } else {
      fetchChartDetailFromArtifact(chart.name, chart.repository.name).then(response => {
        if (response.available_versions) {
          const availableVersions = response.available_versions.map(
            ({ version }: { version: string }) => ({
              title: version,
              value: version,
            })
          );
          setVersions(availableVersions);
          setSelectedVersion(availableVersions[0]);
        }
      });
    }
  }, [chart]);

  useEffect(() => {
    if (selectedVersion) {
      handleChartValueFetch(chart);
    }
  }, [selectedVersion]);

  function checkInstallStatus(releaseName: string) {
    setTimeout(() => {
      getActionStatus(releaseName, 'install').then((response: any) => {
        if (response.status === 'processing') {
          checkInstallStatus(releaseName);
        } else if (!response.status || response.status !== 'success') {
          enqueueSnackbar(
            t('Error creating release {{ message }}', { message: response.message }),
            { variant: 'error' }
          );
          handleEditor(false);
          setInstallLoading(false);
        } else {
          enqueueSnackbar(t('Release {{ releaseName }} created successfully', { releaseName }), {
            variant: 'success',
          });
          handleEditor(false);
          setInstallLoading(false);
        }
      });
    }, 2000);
  }

  function installAndCreateReleaseHandler() {
    setIsFormSubmitting(true);
    if (!validateFormField(releaseName)) {
      enqueueSnackbar(t('Release name is required'), { variant: 'error' });
      return;
    }
    if (!validateFormField(selectedNamespace)) {
      enqueueSnackbar(t('Namespace is required'), { variant: 'error' });
      return;
    }
    if (!validateFormField(selectedVersion)) {
      enqueueSnackbar(t('Version is required'), { variant: 'error' });
      return;
    }
    if (!validateFormField(chartInstallDescription)) {
      enqueueSnackbar(t('Description is required'), { variant: 'error' });
      return;
    }

    const jsonChartValues = yamlToJSON(chartValues) as Record<string, unknown>;
    const chartValuesDIFF = _.omitBy(jsonChartValues, (value, key) =>
      _.isEqual((defaultChartValues as Record<string, unknown>)[key], value)
    ) as Record<string, unknown>;
    setInstallLoading(true);

    const repoURL =
      chartCfg.chartProfile === chartProfile
        ? `${chartCfg.chartURLPrefix}/charts/`
        : chart.repository.url;
    const repoName =
      chartCfg.chartProfile === chartProfile ? APP_CATALOG_HELM_REPOSITORY : chart.repository.name;
    addRepository(repoName, repoURL)
      .then(() => {
        createRelease(
          releaseName,
          selectedNamespace!.value,
          btoa(unescape(encodeURIComponent(jsonToYAML(chartValuesDIFF)))),
          `${repoName}/${chart.name}`,
          selectedVersion!.value,
          chartInstallDescription
        )
          .then(() => {
            enqueueSnackbar(
              t('Installation request for {{ releaseName }} accepted', { releaseName }),
              { variant: 'info' }
            );
            handleEditor(false);
            checkInstallStatus(releaseName);
          })
          .catch(error => {
            handleEditor(false);
            enqueueSnackbar(t('Error creating release request {{ error }}', { error }), {
              variant: 'error',
            });
          });
      })
      .catch(error => {
        handleEditor(false);
        enqueueSnackbar(t('Error adding repository {{ error }}', { error }), { variant: 'error' });
      });
  }

  function validateFormField(fieldValue: FieldType | null | string | undefined) {
    if (typeof fieldValue === 'string') {
      return fieldValue !== '';
    } else {
      return !(!fieldValue || fieldValue.value === '');
    }
  }

  return (
    <Dialog
      open={openEditor}
      maxWidth="lg"
      fullWidth
      withFullScreen
      style={{ overflow: 'hidden' }}
      title={t('App: {{ name }}', { name: chart.name })}
      onClose={() => {
        handleEditor(false);
      }}
    >
      <DialogTitle>
        {chartValuesLoading ? null : (
          <Box display="flex" justifyContent="space-evenly">
            <Box mr={2}>
              <TextField
                id="release-name"
                error={isFormSubmitting && !validateFormField(releaseName)}
                style={{ width: '15vw' }}
                label={t('Release Name *')}
                value={releaseName}
                placeholder={t('Enter a name for the release')}
                onChange={event => {
                  setReleaseName(event.target.value);
                }}
              />
            </Box>
            <Box>
              {namespaceNames && (
                <Autocomplete
                  style={{ width: '15vw' }}
                  options={namespaceNames}
                  getOptionLabel={option => option.title}
                  value={selectedNamespace ?? null}
                  onChange={(event, newValue: FieldType | null) => {
                    setSelectedNamespace(newValue ?? undefined);
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label={t('Namespaces *')}
                      placeholder={t('Select Namespace')}
                      error={isFormSubmitting && !validateFormField(selectedNamespace)}
                    />
                  )}
                />
              )}
            </Box>
            <Box ml={2}>
              <Autocomplete
                style={{ width: '15vw' }}
                options={versions}
                getOptionLabel={(option: any) => option.title ?? option}
                value={selectedVersion ?? versions[0] ?? null}
                onChange={(event, newValue: FieldType | null) => {
                  if (
                    chartCfg.chartProfile === chartProfile &&
                    chart.version !== newValue?.value
                  ) {
                    refreshChartValue(chart.name, newValue?.value ?? '');
                  }
                  setSelectedVersion(newValue ?? undefined);
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={t('Versions *')}
                    placeholder={t('Select Version')}
                    error={isFormSubmitting && !validateFormField(selectedVersion)}
                  />
                )}
              />
            </Box>
            <Box ml={2}>
              <TextField
                id="release-description"
                style={{ width: '15vw' }}
                error={isFormSubmitting && !validateFormField(chartInstallDescription)}
                label={t('Release Description *')}
                value={chartInstallDescription}
                onChange={event => setChartInstallDescription(event.target.value)}
              />
            </Box>
          </Box>
        )}
      </DialogTitle>
      <DialogContent>
        <Box height="100%">
          {chartValuesLoading ? (
            <Loader title="" />
          ) : (
            <Editor
              value={chartValues}
              onChange={value => {
                if (!value) return;
                setChartValues(value);
              }}
              onMount={editor => {
                setInstallLoading(false);
                editor.focus();
              }}
              language="yaml"
              height="500px"
              options={{ selectOnLineNumbers: true }}
              theme={themeName === 'dark' ? 'vs-dark' : 'light'}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Box mr={2} display="flex">
          <Box mr={1}>
            <Button
              style={{ backgroundColor: '#000', color: 'white', textTransform: 'none' }}
              onClick={() => {
                handleEditor(false);
              }}
            >
              {t('Close')}
            </Button>
          </Box>
          <Box>
            {installLoading || chartValuesLoading || !!chartValuesFetchError ? (
              <Button disabled variant="contained">
                {installLoading ? t('Installing') : t('Install')}
              </Button>
            ) : (
              <Button
                onClick={installAndCreateReleaseHandler}
                variant="contained"
                style={{ backgroundColor: '#000', color: 'white', textTransform: 'none' }}
              >
                {installLoading ? t('Installing') : t('Install')}
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
