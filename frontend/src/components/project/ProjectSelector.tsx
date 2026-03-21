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
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useClustersConf } from '../../lib/k8s';
import { apply } from '../../lib/k8s/api/v1/apply';
import { ApiError } from '../../lib/k8s/api/v2/ApiError';
import { KubeObjectInterface } from '../../lib/k8s/KubeObject';
import Namespace from '../../lib/k8s/namespace';
import { createRouteURL } from '../../lib/router/createRouteURL';
import { useTypedSelector } from '../../redux/hooks';
import { ProjectDefinition, setSelectedProject } from '../../redux/projectsSlice';
import { getProjectIdFromLabelKey, getProjectLabelKey, toKubernetesName } from './projectUtils';

/**
 * Fetches and returns all available projects.
 */
function useProjects(): ProjectDefinition[] {
  const clusterConf = useClustersConf();
  const clusters = Object.values(clusterConf ?? {});

  const { items: namespaces } = Namespace.useList({
    clusters: clusters.map(c => c.name),
  });

  return useMemo(() => {
    const projectMap = new Map<string, { namespaces: Set<string>; clusters: Set<string> }>();
    for (const ns of namespaces ?? []) {
      for (const labelKey of Object.keys(ns.metadata.labels ?? {})) {
        const projectId = getProjectIdFromLabelKey(labelKey);
        if (!projectId) continue;
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, { namespaces: new Set(), clusters: new Set() });
        }
        const project = projectMap.get(projectId)!;
        project.namespaces.add(ns.metadata.name);
        project.clusters.add(ns.cluster);
      }
    }
    return Array.from(projectMap.entries()).map(([id, { namespaces, clusters }]) => ({
      id,
      namespaces: Array.from(namespaces),
      clusters: Array.from(clusters),
    }));
  }, [namespaces]);
}

/**
 * Simple dialog for creating a new project by name only.
 * Creates a namespace tagged with the project ID label in all available clusters.
 */
function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const history = useHistory();
  const clusterConf = useClustersConf();
  const clusters = Object.values(clusterConf ?? {});

  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const handleClose = () => {
    setProjectName('');
    setError(null);
    onClose();
  };

  const namespaceName = toKubernetesName(projectName);
  const isValid = namespaceName.length > 0;

  const handleCreate = async () => {
    if (!isValid || isCreating || clusters.length === 0) return;
    setIsCreating(true);
    setError(null);
    try {
      for (const cluster of clusters) {
        const ns: KubeObjectInterface = {
          kind: 'Namespace',
          apiVersion: 'v1',
          metadata: {
            name: namespaceName,
            labels: { [getProjectLabelKey(namespaceName)]: 'true' },
          } as any,
        };
        await apply(ns, cluster.name);
      }
      handleClose();
      history.push(createRouteURL('projectDetails', { name: namespaceName }));
    } catch (e: any) {
      setError(e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon icon="mdi:folder-add" />
        {t('Create New Project')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={t('Project Name')}
          value={projectName}
          onChange={e => {
            setProjectName(e.target.value.toLowerCase());
            setError(null);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && isValid && !isCreating) {
              handleCreate();
            }
          }}
          helperText={
            projectName && !isValid
              ? t('Enter a valid project name (lowercase letters, numbers, and hyphens)')
              : t('Enter a name for your new project')
          }
          error={projectName.length > 0 && !isValid}
          fullWidth
          size="small"
          autoComplete="off"
        />
        {error && <Alert severity="error">{error.message}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="secondary" onClick={handleClose} disabled={isCreating}>
          {t('Cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!isValid || isCreating || clusters.length === 0}
          startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {isCreating ? t('Creating…') : t('Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * GCP-style project selector button for the navigation bar.
 * Shows the current project name (or a placeholder) and opens a popover
 * listing all projects. The last item in the list is "+ Create New Project".
 */
export function ProjectSelector() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selectedProjectId = useTypedSelector(state => state.projects.selectedProjectId);
  const projects = useProjects();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isOpen = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setSearchText('');
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectProject = (projectId: string) => {
    dispatch(setSelectedProject(projectId));
    handleClose();
  };

  const handleCreateNew = () => {
    handleClose();
    setShowCreate(true);
  };

  const filteredProjects = useMemo(() => {
    const lower = searchText.toLowerCase();
    return projects.filter(p => p.id.toLowerCase().includes(lower));
  }, [projects, searchText]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <>
      <ButtonBase
        ref={buttonRef}
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('Select project')}
        sx={theme => ({
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          color:
            theme.palette.navbar.color ??
            theme.palette.getContrastText(
              theme.palette.navbar.background ?? theme.palette.primary.main
            ),
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          maxWidth: 220,
          minWidth: 130,
        })}
      >
        <Icon icon="mdi:folder-open-outline" style={{ fontSize: 18, flexShrink: 0 }} />
        <Typography
          variant="body2"
          noWrap
          sx={{ flexGrow: 1, textAlign: 'left', fontWeight: 500 }}
        >
          {selectedProject ? selectedProject.id : t('Select Project')}
        </Typography>
        <Icon
          icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          style={{ fontSize: 18, flexShrink: 0 }}
        />
      </ButtonBase>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        TransitionProps={{
          onEntered: () => {
            searchInputRef.current?.focus();
          },
        }}
        PaperProps={{
          sx: { width: 280, mt: 0.5 },
        }}
      >
        {/* Search */}
        <Box sx={{ p: 1 }}>
          <TextField
            inputRef={searchInputRef}
            size="small"
            fullWidth
            placeholder={t('Search projects')}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon icon="mdi:magnify" style={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        {/* Project list — "+ Create New Project" is always the last item */}
        <List dense disablePadding sx={{ maxHeight: 240, overflowY: 'auto' }}>
          {filteredProjects.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    {searchText ? t('No matching projects') : t('No projects yet')}
                  </Typography>
                }
              />
            </ListItem>
          )}
          {filteredProjects.map(project => (
            <ListItemButton
              key={project.id}
              selected={project.id === selectedProjectId}
              onClick={() => handleSelectProject(project.id)}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Icon icon="mdi:folder" style={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={project.id}
                secondary={project.clusters.join(', ')}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true, fontSize: '0.7rem' }}
              />
              {project.id === selectedProjectId && (
                <Icon icon="mdi:check" style={{ fontSize: 18, flexShrink: 0 }} />
              )}
            </ListItemButton>
          ))}

          {/* Always last in the list */}
          <Divider />
          <ListItemButton onClick={handleCreateNew} sx={{ color: 'primary.main' }}>
            <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}>
              <Icon icon="mdi:plus-circle-outline" style={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primary={t('+ Create New Project')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItemButton>
        </List>
      </Popover>

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

export default ProjectSelector;
