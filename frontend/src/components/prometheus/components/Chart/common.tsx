import { useTranslation } from 'react-i18next';
import { useCluster } from '../../../../lib/k8s';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Link,
  Paper,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import skeletonImg from '../../assets/chart-skeleton.png';
import { disableMetrics, formatBytes, getConfigStore } from '../../util';
import { Settings } from '../Settings/Settings';

const learnMoreLink = 'https://github.com/headlamp-k8s/plugins/tree/main/prometheus#readme';

const StyledGrid = styled(Grid)(({ theme }) => ({
  backgroundImage: `url(${skeletonImg})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPositionX: 'center',
  height: '450px',
  color: theme.palette.common.black,
}));

const DismissButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.common.black,
  color: theme.palette.common.white,
  '&:hover': {
    color: (theme.palette.primary as any).text,
  },
}));

export function PrometheusNotFoundBanner() {
  const { t } = useTranslation();
  const cluster = useCluster();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, any> | undefined>(undefined);
  const configStore = getConfigStore();
  const useConfig = configStore.useConfig();
  const currentConfig = useConfig();

  function handleSettingsOpen() {
    setPendingData(currentConfig ?? {});
    setSettingsOpen(true);
  }

  function handleSettingsSave() {
    if (pendingData !== undefined) {
      configStore.set(pendingData as any);
    }
    setSettingsOpen(false);
  }

  function handleSettingsCancel() {
    setSettingsOpen(false);
    setPendingData(undefined);
  }

  return (
    <>
      <StyledGrid
        container
        spacing={2}
        direction="column"
        justifyContent="center"
        alignItems="center"
      >
        <Grid item>
          <Typography variant="h5">{t("Couldn't detect Prometheus in your cluster.")}</Typography>
          <Typography variant="h6">
            {t('Either configure prometheus plugin or install prometheus in your cluster.')}
          </Typography>
        </Grid>
        <Grid item>
          <Typography>
            <Link onClick={handleSettingsOpen} sx={{ cursor: 'pointer' }}>
              {t('Configure Prometheus plugin.')}
            </Link>
          </Typography>
        </Grid>
        <Grid item>
          <Typography>
            <Link href={learnMoreLink} target="_blank">
              {t('Learn more about enabling advanced charts.')}
            </Link>
          </Typography>
        </Grid>
        <Grid item>
          <DismissButton size="small" variant="contained" onClick={() => disableMetrics(cluster)}>
            {t('Dismiss')}
          </DismissButton>
        </Grid>
      </StyledGrid>
      <Dialog open={settingsOpen} onClose={handleSettingsCancel} maxWidth="md" fullWidth>
        <DialogTitle>{t('Configure Prometheus')}</DialogTitle>
        <DialogContent>
          <Settings
            data={(pendingData ?? currentConfig) || {}}
            onDataChange={data => setPendingData(data)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsCancel}>{t('Cancel')}</Button>
          <Button variant="contained" onClick={handleSettingsSave}>
            {t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function CustomTooltip({ active, payload, label }) {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    const timestamp = new Date(label * 1000);

    return (
      <Paper variant="outlined" sx={{ p: 0.5, opacity: 0.8 }}>
        <b>{t('Date: {{ date }}', { date: timestamp.toLocaleString() })}</b>
        {payload.map(data => (
          <div key={data.name}>{`${data.name}: ${data.value}`}</div>
        ))}
      </Paper>
    );
  }

  return null;
}

export function CustomTooltipFormatBytes({ active, payload, label }) {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    const timestamp = new Date(label * 1000);

    return (
      <Paper variant="outlined" sx={{ p: 0.5, opacity: 0.8 }}>
        <b>{t('Date: {{ date }}', { date: timestamp.toLocaleString() })}</b>
        {payload.map(data => (
          <div key={data.name}>{`${data.name}: ${formatBytes(data.value)}`}</div>
        ))}
      </Paper>
    );
  }

  return null;
}
