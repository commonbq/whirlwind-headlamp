import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material';
import { blue } from '@mui/material/colors';
import { fetchMetrics } from '../../../request';
import { createTickTimestampFormatter, dataProcessor, formatBytes } from '../../../util';
import Chart from '../Chart/Chart';
import { CustomTooltipFormatBytes } from '../common';

interface MemoryChartProps {
  query: string;
  prometheusPrefix: string;
  interval: string;
  resolution: string;
  autoRefresh: boolean;
  subPath: string;
}

export function MemoryChart(props: MemoryChartProps) {
  const { t } = useTranslation();
  const xTickFormatter = createTickTimestampFormatter(props.interval);
  const theme = useTheme();
  const labelColor =
    (theme.palette as any).chartStyles?.labelColor ?? theme.palette.text.secondary;

  const XTickProps = {
    dataKey: 'timestamp',
    tickLine: false,
    tick: tickProps => {
      const value = xTickFormatter(tickProps.payload.value);
      return (
        value !== '' && (
          <g transform={`translate(${tickProps.x},${tickProps.y})`} fill={labelColor}>
            <text x={0} y={10} dy={0} textAnchor="middle">
              {value}
            </text>
          </g>
        )
      );
    },
  };

  const YTickProps = {
    domain: ['dataMin', 'auto'],
    tick: ({ x, y, payload }) => (
      <g transform={`translate(${x},${y})`} fill={labelColor}>
        <text x={-35} y={0} dy={0} textAnchor="middle">
          {formatBytes(payload.value)}
        </text>
      </g>
    ),
    width: 80,
  };

  return (
    <Chart
      plots={[
        {
          query: props.query,
          name: t('memory'),
          strokeColor: alpha(blue[400], 0.8),
          fillColor: alpha(blue[400], 0.1),
          dataProcessor: dataProcessor,
        },
      ]}
      fetchMetrics={fetchMetrics}
      xAxisProps={XTickProps}
      yAxisProps={YTickProps}
      CustomTooltip={CustomTooltipFormatBytes}
      {...props}
    />
  );
}
