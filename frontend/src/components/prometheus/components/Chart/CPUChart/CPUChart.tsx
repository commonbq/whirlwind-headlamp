import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material';
import { blue } from '@mui/material/colors';
import { fetchMetrics } from '../../../request';
import { createTickTimestampFormatter, dataProcessor } from '../../../util';
import Chart from '../Chart/Chart';
import { CustomTooltip } from '../common';

interface CPUChartProps {
  query: string;
  prometheusPrefix: string;
  interval: string;
  resolution: string;
  autoRefresh: boolean;
  subPath: string;
}

export function CPUChart(props: CPUChartProps) {
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
    width: 60,
  };

  return (
    <Chart
      plots={[
        {
          query: props.query,
          name: t('cpu (cores)'),
          strokeColor: alpha(blue[400], 0.8),
          fillColor: alpha(blue[400], 0.1),
          dataProcessor: dataProcessor,
        },
      ]}
      xAxisProps={XTickProps}
      yAxisProps={YTickProps}
      CustomTooltip={CustomTooltip}
      fetchMetrics={fetchMetrics}
      {...props}
    />
  );
}
