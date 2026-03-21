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
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { getBaseUrl } from '../../helpers/getBaseUrl';
import { getHeadlampAPIHeaders } from '../../helpers/getHeadlampAPIHeaders';
import { useCluster } from '../../lib/k8s';
import { createRouteURL } from '../../lib/router/createRouteURL';
import { PageGrid } from '../common/Resource/Resource';
import SectionBox from '../common/SectionBox';

/** A single cloud-platform service as returned by the backend catalogue endpoint. */
export interface CloudService {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  route: string;
}

/**
 * Fetch the cloud-services catalogue from the backend.
 * The endpoint does not require a cluster prefix – it is a platform-level resource.
 */
async function fetchCloudServices(): Promise<CloudService[]> {
  const url = `${getBaseUrl()}/cloudservices`;
  const resp = await fetch(url, { headers: getHeadlampAPIHeaders() });
  if (!resp.ok) {
    throw new Error(`Failed to fetch cloud services: ${resp.status}`);
  }
  return resp.json();
}

/** Category colour palette – maps a category name to a valid MUI Chip colour. */
type ChipColor = 'primary' | 'secondary' | 'info' | 'warning' | 'default';

const CATEGORY_COLORS: Record<string, ChipColor> = {
  Compute: 'primary',
  Storage: 'secondary',
  Networking: 'info',
  Security: 'warning',
};

/** Returns the MUI Chip colour for a given category name. */
function categoryColor(category: string): ChipColor {
  return CATEGORY_COLORS[category] ?? 'default';
}

/** A card that represents one cloud platform service. */
function ServiceCard({ service, clusterPrefix }: { service: CloudService; clusterPrefix: string }) {
  const history = useHistory();

  function handleClick() {
    history.push(`${clusterPrefix}${service.route}`);
  }

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon icon={service.icon} width={32} height={32} />
            <Typography variant="subtitle1" fontWeight="bold">
              {service.name}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {service.description}
          </Typography>
          <Box>
            <Chip
              label={service.category}
              size="small"
              color={categoryColor(service.category)}
              variant="outlined"
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/** Main Cloud Console page – shows a GCP-like grid of core cloud services. */
export default function CloudConsole() {
  const { t } = useTranslation();
  const cluster = useCluster();
  const [services, setServices] = React.useState<CloudService[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCloudServices()
      .then(setServices)
      .catch((err: Error) => setError(err.message));
  }, []);

  // Build the in-app URL prefix that includes the current cluster when available.
  const clusterPrefix = cluster ? createRouteURL('cluster', { cluster }) : '';

  // Derive the ordered list of unique category names only when services change.
  const categories = React.useMemo(
    () => (services ? Array.from(new Set(services.map(s => s.category))) : []),
    [services]
  );

  return (
    <PageGrid>
      <SectionBox
        title={t('Cloud Console')}
        headerProps={{ headerStyle: 'main' }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t(
            'Welcome to the CloudLamp platform console. Select a service below to get started.'
          )}
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {!services && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {services && (
          <>
            {/* Group services by category */}
            {categories.map(category => (
              <Box key={category} sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>
                  {category}
                </Typography>
                <Grid container spacing={2}>
                  {services
                    .filter(s => s.category === category)
                    .map(service => (
                      <Grid item xs={12} sm={6} md={4} key={service.id}>
                        <ServiceCard service={service} clusterPrefix={clusterPrefix} />
                      </Grid>
                    ))}
                </Grid>
              </Box>
            ))}
          </>
        )}
      </SectionBox>
    </PageGrid>
  );
}
