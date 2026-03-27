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

import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router';
import { createRouteURL } from '../../../../lib/router';
import {
  ActionButton,
  DateLabel,
  Dialog,
  NameValueTable,
  SectionBox,
  SectionHeader,
  SimpleTable,
  StatusLabel,
} from '../../../common';
import {
  deleteRelease,
  getActionStatus,
  getRelease,
  getReleaseHistory,
  rollbackRelease,
} from '../../api/releases';
import { EditorDialog } from './EditorDialog';

export default function ReleaseDetail() {
  const { t } = useTranslation();
  const [update, setUpdate] = useState<boolean>(false);
  const { namespace, releaseName } = useParams<{ namespace: string; releaseName: string }>();
  const [release, setRelease] = useState<any>(null);
  const [releaseHistory, setReleaseHistory] = useState<any>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState<boolean>(false);
  const [rollbackPopup, setRollbackPopup] = useState<boolean>(false);
  const [revertVersion, setRevertVersion] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdateRelease, setIsUpdateRelease] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const history = useHistory();

  useEffect(() => {
    getRelease(namespace, releaseName).then(response => {
      setRelease(response);
    });
  }, [update]);

  useEffect(() => {
    getReleaseHistory(namespace, releaseName).then(response => {
      setReleaseHistory(response);
    });
  }, [update]);

  function checkDeleteReleaseStatus(name: string) {
    getActionStatus(name, 'uninstall').then(response => {
      if (response.status === 'processing') {
        setTimeout(() => checkDeleteReleaseStatus(name), 1000);
      } else if (response.status !== 'success') {
        enqueueSnackbar(
          t('Failed to delete release {{ name }}{{ message }}', {
            name,
            message: response.message,
          }),
          { variant: 'error' }
        );
      } else {
        enqueueSnackbar(t('Successfully deleted release {{ name }}', { name }), {
          variant: 'success',
        });
        setOpenDeleteAlert(false);
        history.replace(createRouteURL('appCatalogReleases'));
        setIsDeleting(false);
      }
    });
  }

  function updateReleaseHandler() {
    setIsEditorOpen(true);
    setIsUpdateRelease(true);
  }

  return (
    <>
      <EditorDialog
        isUpdateRelease={isUpdateRelease}
        openEditor={isEditorOpen}
        handleEditor={open => setIsEditorOpen(open)}
        release={release}
        releaseName={release?.name}
        releaseNamespace={release?.namespace}
        handleUpdate={() => setUpdate(!update)}
      />
      <Dialog
        open={openDeleteAlert}
        maxWidth="sm"
        onClose={() => setOpenDeleteAlert(false)}
        title={t('Uninstall App')}
      >
        <DialogContent>
          <DialogContentText>
            {t('Are you sure you want to uninstall this release?')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteAlert(false)}>
            {isDeleting ? t('Close') : t('No')}
          </Button>
          <Button
            disabled={isDeleting}
            onClick={() => {
              deleteRelease(namespace, releaseName).then(() => {
                setIsDeleting(true);
                enqueueSnackbar(
                  t('Delete request for release {{ releaseName }} accepted', { releaseName }),
                  { variant: 'info' }
                );
                setOpenDeleteAlert(false);
                checkDeleteReleaseStatus(releaseName);
              });
            }}
          >
            {isDeleting ? t('Deleting') : t('Yes')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={rollbackPopup}
        maxWidth="xs"
        onClose={() => setRollbackPopup(false)}
        title={t('Rollback')}
      >
        <DialogContent style={{ width: '400px', height: '100px' }}>
          <InputLabel id="revert">{t('Select a version')}</InputLabel>
          <Select
            value={revertVersion}
            defaultValue={releaseHistory?.releases[0]?.version}
            onChange={event => setRevertVersion(event.target.value as string)}
            id="revert"
            fullWidth
          >
            {releaseHistory &&
              releaseHistory.releases.map((release: any) => {
                return (
                  <MenuItem key={release?.version} value={release?.version}>
                    {release?.version} . {release?.info.description}
                  </MenuItem>
                );
              })}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              rollbackRelease(release.namespace, release.name, revertVersion).then(() => {
                setRollbackPopup(false);
                setUpdate(!update);
              });
            }}
            style={{ backgroundColor: '#000', color: 'white', textTransform: 'none' }}
          >
            {t('Revert')}
          </Button>
          <Button
            style={{ backgroundColor: '#000', color: 'white', textTransform: 'none' }}
            onClick={() => setRollbackPopup(false)}
          >
            {t('Cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {release && (
        <SectionBox
          backLink={createRouteURL('appCatalogReleases')}
          title={
            <SectionHeader
              title={t('App: {{ name }}', { name: release.name })}
              actions={[
                <ActionButton
                  key="values"
                  description={t('Values')}
                  onClick={() => {
                    setIsUpdateRelease(false);
                    setIsEditorOpen(true);
                  }}
                  icon="mdi:file-document-box-outline"
                />,
                <ActionButton
                  key="upgrade"
                  description={t('Upgrade')}
                  onClick={() => updateReleaseHandler()}
                  icon="mdi:arrow-up-bold"
                />,
                <ActionButton
                  key="rollback"
                  description={t('Rollback')}
                  onClick={() => setRollbackPopup(true)}
                  icon="mdi:undo"
                  iconButtonProps={{ disabled: release.version === 1 }}
                />,
                <ActionButton
                  key="delete"
                  description={t('Delete')}
                  onClick={() => setOpenDeleteAlert(true)}
                  icon="mdi:delete"
                />,
              ]}
            />
          }
        >
          <NameValueTable
            rows={[
              { name: t('Name'), value: release.name },
              { name: t('Namespace'), value: release.namespace },
              { name: t('Revisions'), value: release.version },
              { name: t('Chart Version'), value: release.chart.metadata.version },
              { name: t('App Version'), value: release.chart.metadata.appVersion },
              {
                name: t('Status'),
                value: (
                  <StatusLabel
                    status={release?.info.status === 'deployed' ? 'success' : 'error'}
                  >
                    {release?.info.status}
                  </StatusLabel>
                ),
              },
            ]}
          />
        </SectionBox>
      )}

      {releaseHistory && (
        <SectionBox title={t('History')}>
          <SimpleTable
            data={
              releaseHistory === null
                ? null
                : [...releaseHistory.releases].sort((a: any, b: any) => b.version - a.version)
            }
            defaultSortingColumn={1}
            columns={[
              {
                label: t('Revision'),
                getter: (data: any) => data.version,
                sort: (n1: any, n2: any) => n2.version - n1.version,
              },
              {
                label: t('Description'),
                getter: (data: any) => data.info.description,
              },
              {
                label: t('Status'),
                getter: (data: any) => (
                  <StatusLabel
                    status={release?.info.status === 'deployed' ? 'success' : 'error'}
                  >
                    {data.info.status}
                  </StatusLabel>
                ),
              },
              {
                label: t('Chart'),
                getter: (data: any) => data.chart.metadata.name,
              },
              {
                label: t('App Version'),
                getter: (data: any) => data.chart.metadata.appVersion,
              },
              {
                label: t('Updated'),
                getter: (data: any) => <DateLabel date={data.info.last_deployed} format="mini" />,
              },
            ]}
          />
        </SectionBox>
      )}
    </>
  );
}
