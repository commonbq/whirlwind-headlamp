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

import { Box, Button, Link, Table, TableCell, TableHead, TableRow } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import remarkGfm from 'remark-gfm';
import { createRouteURL } from '../../../../lib/router';
import { Loader, NameValueTable, SectionBox, SectionHeader } from '../../../common';
import { getCatalogConfig } from '../../api/catalogConfig';
import { fetchChartDetailFromArtifact } from '../../api/charts';
import { EditorDialog } from './EditorDialog';

type ChartDetailsProps = {
  vanillaHelmRepo: string;
};

export default function ChartDetails({ vanillaHelmRepo }: ChartDetailsProps) {
  const { t } = useTranslation();
  const { chartName, repoName } = useParams<{ chartName: string; repoName: string }>();
  const [chart, setChart] = useState<{
    name: string;
    description: string;
    logo_image_id?: string;
    readme: string;
    app_version: string;
    maintainers: Array<{ name: string; email: string }>;
    home_url: string;
    package_id: string;
    version: string;
    icon?: string;
  } | null>(null);
  const [openEditor, setOpenEditor] = useState(false);
  const chartCfg = getCatalogConfig();

  useEffect(() => {
    fetchChartDetailFromArtifact(chartName, repoName).then(response => {
      setChart(response);
    });
  }, [chartName, repoName]);

  return (
    <>
      <EditorDialog
        openEditor={openEditor}
        chart={chart}
        handleEditor={open => {
          setOpenEditor(open);
        }}
        chartProfile={vanillaHelmRepo}
      />
      <SectionBox
        title={
          <SectionHeader
            title={chartName}
            actions={[
              <Button
                key="install"
                sx={{
                  backgroundColor: '#000',
                  color: 'white',
                  textTransform: 'none',
                  '&:hover': { background: '#605e5c' },
                }}
                onClick={() => {
                  setOpenEditor(true);
                }}
              >
                {t('Install')}
              </Button>,
            ]}
          />
        }
        backLink={createRouteURL('appCatalogCharts')}
      >
        {!chart ? (
          <Loader title="" />
        ) : (
          <NameValueTable
            rows={[
              {
                name: t('Name'),
                value: (
                  <Box display="flex" alignItems="center">
                    {chart.logo_image_id && (
                      <Box mr={1}>
                        {chartCfg.chartProfile === vanillaHelmRepo ? (
                          <img
                            src={`${chart?.icon || ''}`}
                            width="25"
                            height="25"
                            alt={chart.name}
                          />
                        ) : (
                          <img
                            src={`https://artifacthub.io/image/${chart.logo_image_id}`}
                            width="25"
                            height="25"
                            alt={chart.name}
                          />
                        )}
                      </Box>
                    )}
                    <Box>{chart.name}</Box>
                  </Box>
                ),
              },
              {
                name: t('Description'),
                value: (
                  <Box overflow="auto" width="80%">
                    {chart.description}
                  </Box>
                ),
              },
              {
                name: t('App Version'),
                value: chart.app_version,
              },
              {
                name: t('Repository'),
                value: repoName,
              },
              {
                name: t('Maintainers'),
                value: chart?.maintainers?.map(maintainer => (
                  <Box display="flex" alignItems="center" mt={1} key={maintainer.email}>
                    <Box mr={1}>{maintainer.name}</Box>
                    <Box>{maintainer.email}</Box>
                  </Box>
                )),
              },
              {
                name: t('URL'),
                value: (
                  <Link href={chart.home_url} target="_blank">
                    {chart.home_url}
                  </Link>
                ),
              },
            ]}
          />
        )}
      </SectionBox>
      <SectionBox title={t('Readme')}>
        {!chart ? (
          <Loader title="" />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // eslint-disable-next-line no-unused-vars
              a: ({ node, ref, ...props }: any) => <Link {...props} target="_blank" />,
              // eslint-disable-next-line no-unused-vars
              table: ({ node, ref, ...props }: any) => (
                <Table
                  {...props}
                  size="small"
                  style={{ tableLayout: 'fixed' }}
                />
              ),
              // eslint-disable-next-line no-unused-vars
              thead: ({ node, ref, ...props }: any) => <TableHead {...props} />,
              // eslint-disable-next-line no-unused-vars
              tr: ({ node, ref, ...props }: any) => <TableRow {...props} />,
              // eslint-disable-next-line no-unused-vars
              td: ({ node, ref, ...props }: any) => (
                <TableCell {...props} style={{ textAlign: 'center', overflow: 'hidden' }} />
              ),
              pre: ({ className, children, ...props }) => (
                <pre {...props} className={className}>
                  <Box display="block" width="64vw" my={0.5}>
                    {children}
                  </Box>
                </pre>
              ),
              // eslint-disable-next-line
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <SyntaxHighlighter
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    className={className}
                    {...props}
                    style={{ overflow: 'auto', width: '10vw', display: 'block' }}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {chart.readme}
          </ReactMarkdown>
        )}
      </SectionBox>
    </>
  );
}
