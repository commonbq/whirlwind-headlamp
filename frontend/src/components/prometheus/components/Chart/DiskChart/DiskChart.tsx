import { useTheme } from '@mui/material';
import { fetchMetrics } from '../../../request';
import { createTickTimestampFormatter, dataProcessor, formatBytes } from '../../../util';
import Chart from '../Chart/Chart';
import { CustomTooltipFormatBytes } from '../common';

interface DiskChartProps {
  usageQuery: string;
  capacityQuery: string;
  interval: string;
  resolution: string;
  prometheusPrefix: string;
  autoRefresh: boolean;
  subPath: string;
}

export function DiskChart(props: DiskChartProps) {
  const xTickFormatter = createTickTimestampFormatter(props.interval);
  const theme = useTheme();
  const labelColor =
    (theme.palette as any).chartStyles?.labelColor ?? theme.palette.text.secondary;

  return (
    <Chart
      plots={[
        {
          query: props.usageQuery,
          name: 'usage',
          strokeColor: '#CDC300',
          fillColor: '#FFF178',
          dataProcessor: dataProcessor,
        },
        {
          query: props.capacityQuery,
          name: 'capacity',
          strokeColor: '#006B58',
          fillColor: '#98F6DC',
          dataProcessor: dataProcessor,
        },
      ]}
      xAxisProps={{
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
      }}
      yAxisProps={{
        domain: ['dataMin', 'auto'],
        tick: ({ x, y, payload }) => (
          <g transform={`translate(${x},${y})`} fill={labelColor}>
            <text x={-35} y={0} dy={0} textAnchor="middle">
              {formatBytes(payload.value)}
            </text>
          </g>
        ),
        width: 80,
      }}
      fetchMetrics={fetchMetrics}
      CustomTooltip={CustomTooltipFormatBytes}
      {...props}
    />
  );
}
