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
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
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
import { groupBy, uniq } from 'lodash';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useClustersConf } from '../../lib/k8s';
import Namespace from '../../lib/k8s/namespace';
import { useTypedSelector } from '../../redux/hooks';
import { ProjectDefinition, setSelectedProject } from '../../redux/projectsSlice';
import { NewProjectPopup } from './NewProjectPopup';
import { PROJECT_ID_LABEL } from './projectUtils';

/**
 * Fetches and returns all available projects.
 */
function useProjects(): ProjectDefinition[] {
  const clusterConf = useClustersConf();
  const clusters = Object.values(clusterConf ?? {});

  const { items: namespaces } = Namespace.useList({
    clusters: clusters.map(c => c.name),
    labelSelector: PROJECT_ID_LABEL,
  });

  return useMemo(
    () =>
      Object.entries(
        groupBy(
          (namespaces ?? []).filter(n => n.metadata.labels?.[PROJECT_ID_LABEL]),
          n => n.metadata.labels![PROJECT_ID_LABEL]
        )
      ).map(([name, nsList]) => ({
        id: name,
        namespaces: uniq(nsList.map(it => it.metadata.name)),
        clusters: uniq(nsList.map(it => it.cluster)),
      })),
    [namespaces]
  );
}

/**
 * GCP-style project selector button for the navigation bar.
 * Shows the current project name (or a placeholder) and opens a popover
 * listing all projects plus a "New Project" option.
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
          color: theme.palette.navbar.color ?? theme.palette.getContrastText(theme.palette.navbar.background ?? theme.palette.primary.main),
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

        {/* Project list */}
        <List dense disablePadding sx={{ maxHeight: 240, overflowY: 'auto' }}>
          {filteredProjects.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    {searchText ? t('No matching projects') : t('No projects found')}
                  </Typography>
                }
              />
            </ListItem>
          ) : (
            filteredProjects.map(project => (
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
            ))
          )}
        </List>

        <Divider />

        {/* New Project button */}
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            variant="text"
            startIcon={<Icon icon="mdi:plus" />}
            onClick={handleCreateNew}
            sx={{ justifyContent: 'flex-start' }}
          >
            {t('New Project')}
          </Button>
        </Box>
      </Popover>

      {showCreate && (
        <NewProjectPopup open={showCreate} onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}

export default ProjectSelector;
