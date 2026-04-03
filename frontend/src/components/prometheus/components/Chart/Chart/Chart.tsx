import { useTranslation } from 'react-i18next';
import { EmptyContent, Loader } from '../../../../common';
import { Box, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getTimeRangeAndStepSize } from '../../../util';

export interface ChartProps {
  plots: Array<{
    query: string;
    name: string;
    fillColor: string;
    strokeColor: string;
    dataProcessor: (data: any) => any[];
  }>;
  referenceLines?: Array<{
    x?: number;
    y?: number;
    label: string;
    stroke: string;
    strokeDasharray?: string;
  }>;
  fetchMetrics: (query: object) => Promise<any>;
  interval: string;
  resolution: string;
  prometheusPrefix: string;
  autoRefresh: boolean;
  xAxisProps: {
    [key: string]: any;
  };
  yAxisProps: {
    [key: string]: any;
  };
  CustomTooltip?: ({ active, payload, label }) => JSX.Element | null;
  subPath?: string;
}

export default function Chart(props: ChartProps) {
  const { t } = useTranslation();

  enum ChartState {
    LOADING,
    ERROR,
    NO_DATA,
    SUCCESS,
  }
  const { fetchMetrics, xAxisProps, yAxisProps } = props;
  const [metrics, setMetrics] = useState<Array<any>>([]);
  const [state, setState] = useState<ChartState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const fetchMetricsData = async (
    plots: Array<{ query: string; name: string; dataProcessor: (data: any) => any }>,
    firstLoad: boolean = false
  ) => {
    const fetchedMetrics: {
      [key: string]: {
        data: { timestamp: number; y: number }[];
        state: ChartState;
      };
    } = {};

    if (firstLoad) {
      setState(ChartState.LOADING);
    }

    if (!firstLoad) {
      setError(null);
    }

    for (const plot of plots) {
      let response;
      try {
        const currentTimeRange = getTimeRangeAndStepSize(props.interval, props.resolution);

        response = await fetchMetrics({
          prefix: props.prometheusPrefix,
          query: plot.query,
          from: currentTimeRange.from,
          to: currentTimeRange.to,
          step: currentTimeRange.step,
          subPath: props.subPath,
        });
      } catch (e) {
        fetchedMetrics[plot.name] = { data: [], state: ChartState.ERROR };
        setError(e.message);
        setState(ChartState.ERROR);
        break;
      }
      if (response.status !== 'success') {
        fetchedMetrics[plot.name] = { data: [], state: ChartState.ERROR };
        continue;
      }

      if (response['data']['result'].length === 0) {
        fetchedMetrics[plot.name] = { data: [], state: ChartState.NO_DATA };
        continue;
      }

      const data = plot.dataProcessor(response);
      fetchedMetrics[plot.name] = { data: data, state: ChartState.SUCCESS };
    }

    if (Object.values(fetchedMetrics).every(plot => plot.state === ChartState.NO_DATA)) {
      setState(ChartState.NO_DATA);
      setMetrics([]);
    } else if (Object.values(fetchedMetrics).every(plot => plot.state === ChartState.SUCCESS)) {
      const mergedData = fetchedMetrics[Object.keys(fetchedMetrics)[0]].data.map(
        (element, index) => {
          const mergedElement = { timestamp: element.timestamp };
          for (const plotName of Object.keys(fetchedMetrics)) {
            mergedElement[plotName] = fetchedMetrics[plotName].data[index].y;
          }
          return mergedElement;
        }
      );
      setMetrics(mergedData);
      setState(ChartState.SUCCESS);
    } else {
      setState(ChartState.ERROR);
    }
  };

  useEffect(() => {
    fetchMetricsData(props.plots, true);
  }, [
    props.interval,
    props.resolution,
    props.prometheusPrefix,
    props.subPath,
    JSON.stringify(props.plots),
  ]);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (props.autoRefresh) {
      refreshInterval = setInterval(() => {
        fetchMetricsData(props.plots, false);
      }, 10000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [
    props.autoRefresh,
    props.interval,
    props.resolution,
    props.prometheusPrefix,
    props.subPath,
    JSON.stringify(props.plots),
  ]);

  const { from: fromTimestamp, to: toTimestamp } = getTimeRangeAndStepSize(
    props.interval,
    props.resolution
  );

  const labelColor =
    (theme.palette as any).chartStyles?.labelColor ?? theme.palette.text.secondary;

  let chartContent;

  if (state === ChartState.SUCCESS) {
    chartContent = (
      <AreaChart data={metrics} style={{ fontSize: 14 }}>
        <XAxis
          stroke={labelColor}
          fontSize={12}
          {...xAxisProps}
          type="number"
          domain={[fromTimestamp, toTimestamp]}
          allowDataOverflow
        />
        <YAxis fontSize={14} stroke={labelColor} {...yAxisProps} />
        {props.CustomTooltip === undefined ? (
          <Tooltip />
        ) : (
          <Tooltip content={props.CustomTooltip} />
        )}
        <Legend />
        <CartesianGrid strokeDasharray="2 4" stroke={theme.palette.divider} vertical={false} />
        {props.plots.map(plot => (
          <Area
            key={plot.name}
            stackId="1"
            type="step"
            dataKey={plot.name}
            stroke={plot.strokeColor}
            strokeWidth={2}
            fill={plot.fillColor}
            activeDot={{ r: 2 }}
            animationDuration={props.autoRefresh ? 0 : 400}
          />
        ))}
        {props.referenceLines?.map(line => (
          <ReferenceLine
            key={line.label}
            x={line.x}
            y={line.y}
            stroke="#999"
            strokeDasharray={line.strokeDasharray || '15 15'}
            label={{
              value: line.label,
              fontSize: 15,
              fill: line.stroke,
            }}
          />
        ))}
      </AreaChart>
    );
  } else if (state === ChartState.LOADING) {
    chartContent = <Loader title={t('Fetching Data')} />;
  } else if (state === ChartState.ERROR) {
    chartContent = (
      <Box
        width="100%"
        height="100%"
        p={2}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Box>
          <EmptyContent color="error">{t('Error: {{ error }}', { error })}</EmptyContent>
        </Box>
      </Box>
    );
  } else {
    chartContent = (
      <Box
        width="100%"
        height="100%"
        p={2}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Box>
          <EmptyContent>{t('No Data')}</EmptyContent>
        </Box>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartContent}
    </ResponsiveContainer>
  );
}
