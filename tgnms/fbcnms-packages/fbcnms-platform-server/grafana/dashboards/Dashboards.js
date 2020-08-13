/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import * as Grafana from 'grafana-dash-gen';

const netIDVar = 'networkID';
const gwIDVar = 'gatewayID';

const variableSortNumbers: {[VariableSortOption]: number} = {
  none: 0,
  'alpha-asc': 1,
  'alpha-desc': 2,
  'num-asc': 3,
  'num-desc': 4,
  'alpha-insensitive-asc': 5,
  'alpha-insensitive-desc': 6,
};

export const networkTemplate: TemplateConfig = variableTemplate({
  labelName: netIDVar,
  query: `label_values(${netIDVar})`,
  regex: `/.+/`,
  sort: 'alpha-insensitive-asc',
});

// This templating schema will produce a variable in the dashboard
// named gatewayID which is a multi-selectable option of all the
// gateways associated with this organization that exist for the
// currently selected $networkID. $networkID variable must also
// be configured for this dashboard in order for it to work
const gatewayTemplate: TemplateConfig = variableTemplate({
  labelName: gwIDVar,
  query: `label_values({networkID=~"$networkID",gatewayID=~".+"}, ${gwIDVar})`,
  regex: `/.+/`,
  sort: 'alpha-insensitive-asc',
});

export const NetworkDBData: GrafanaDBData = {
  title: 'Networks',
  description:
    'Metrics relevant to the whole network. Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.',
  templates: [networkTemplate],
  rows: [
    {
      title: '',
      panels: [
        {
          title: 'Number of Connected UEs',
          targets: [
            {
              expr: 'sum(ue_connected{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Number of Registered UEs',
          targets: [
            {
              expr:
                'sum(ue_registered{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Number of Connected eNBs',
          targets: [
            {
              expr:
                'sum(enb_connected{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'S1 Setup',
          targets: [
            {
              expr: 'sum(s1_setup{networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Total: {{networkID}}',
            },
            {
              expr:
                'sum(s1_setup{networkID=~"$networkID",result="success"}) by (networkID)',
              legendFormat: 'Success: {{networkID}}',
            },
            {
              expr:
                'sum(s1_setup{networkID=~"$networkID"})by(networkID)-sum(s1_setup{result="success",networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Failure: {{networkID}}',
            },
          ],
        },
        {
          title: 'Attach/Reg Attempts',
          targets: [
            {
              expr: 'sum(ue_attach{networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Total: {{networkID}}',
            },
            {
              expr:
                'sum(ue_attach{networkID=~"$networkID",result="attach_proc_successful"}) by (networkID)',
              legendFormat: 'Success: {{networkID}}',
            },
            {
              expr:
                'sum(ue_attach{networkID=~"$networkID"}) by (networkID) -sum(s1_setup{result="attach_proc_successful",networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Failure: {{networkID}}',
            },
          ],
        },
        {
          title: 'Detach/Dereg Attempts',
          targets: [
            {
              expr: 'sum(ue_detach{networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Total: {{networkID}}',
            },
            {
              expr:
                'sum(ue_detach{networkID=~"$networkID",result="attach_proc_successful"}) by (networkID)',
              legendFormat: 'Success: {{networkID}}',
            },
            {
              expr:
                'sum(ue_detach{networkID=~"$networkID"}) by (networkID) -sum(s1_setup{result="attach_proc_successful",networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Failure: {{networkID}}',
            },
          ],
        },
        {
          title: 'GPS Connection Uptime',
          targets: [
            {
              expr:
                'avg(enodeb_gps_connected{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          unit: 's',
        },
        {
          title: 'Device Transmitting Status',
          targets: [
            {
              expr:
                'avg(enodeb_rf_tx_enabled{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Service Requests',
          targets: [
            {
              expr:
                'sum(service_request{networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Total: {{networkID}}',
            },
            {
              expr:
                'sum(service_request{networkID=~"$networkID",result="success"}) by (networkID)',
              legendFormat: 'Success: {{networkID}}',
            },
            {
              expr:
                'sum(service_request{networkID=~"$networkID"}) by (networkID)-sum(s1_setup{result="success",networkID=~"$networkID"}) by (networkID)',
              legendFormat: 'Failure: {{networkID}}',
            },
          ],
        },
      ],
    },
  ],
};

export const GatewayDBData: GrafanaDBData = {
  title: 'Gateways',
  description:
    'Metrics relevant to the gateways. Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.',
  templates: [networkTemplate, gatewayTemplate],
  rows: [
    {
      title: '',
      panels: [
        {
          title: 'E-Node B Status',
          targets: [
            {
              expr:
                'enodeb_rf_tx_enabled{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          noAggregates: true,
          yMin: 0,
        },
        {
          title: 'Connected Subscribers',
          targets: [
            {
              expr:
                'ue_connected{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          noAggregates: true,
          yMin: 0,
        },
        {
          title: 'Download Throughput',
          targets: [
            {
              expr:
                'pdcp_user_plane_bytes_dl{gatewayID=~"$gatewayID",service="enodebd",networkID=~"$networkID"}/1000',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 'Bps',
          yMin: 0,
        },
        {
          title: 'Upload Throughput',
          targets: [
            {
              expr:
                'pdcp_user_plane_bytes_ul{gatewayID=~"$gatewayID",service="enodebd",networkID=~"$networkID"}/1000',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 'Bps',
          yMin: 0,
        },
        {
          title: 'Latency',
          targets: [
            {
              expr:
                'magmad_ping_rtt_ms{gatewayID=~"$gatewayID",networkID=~"$networkID",metric="rtt_ms"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 's',
          yMin: 0,
        },
        {
          title: 'Gateway CPU %',
          targets: [
            {
              expr:
                'cpu_percent{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 'percent',
          yMin: 0,
        },
        {
          title: 'Temperature',
          targets: [
            {
              expr:
                'temperature{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}} - {{sensor}}',
            },
          ],
          unit: 'celsius',
        },
        {
          title: 'Disk %',
          targets: [
            {
              expr:
                'disk_percent{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 'percent',
          noAggregates: true,
          yMin: 0,
        },
        {
          title: 's6a Auth Failure',
          targets: [
            {
              expr:
                's6a_auth_failure{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          noAggregates: true,
          yMin: 0,
        },
      ],
    },
  ],
};

export const InternalDBData: GrafanaDBData = {
  title: 'Internal',
  description:
    'Metrics relevant to the internals of gateways. Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.',
  templates: [networkTemplate, gatewayTemplate],
  rows: [
    {
      title: '',
      panels: [
        {
          title: 'Physical Memory Utilization Percent',
          targets: [
            {
              expr:
                'mem_free{gatewayID=~"$gatewayID"}/mem_total{gatewayID=~"$gatewayID",networkID=~"$networkID"} * 100',
              legendFormat: '{{gatewayID}}',
            },
          ],
          yMin: 0,
        },
        {
          title: 'Temperature',
          targets: [
            {
              expr:
                'temperature{gatewayID=~"$gatewayID",sensor="coretemp_0",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}} - {{sensor}}',
            },
          ],
          unit: 'percent',
        },
        {
          title: 'Virtual Memory Percent',
          targets: [
            {
              expr:
                'virtual_memory_percent{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 'percent',
          yMin: 0,
        },
        {
          title: 'Backhaul Latency',
          targets: [
            {
              expr:
                'magmad_ping_rtt_ms{gatewayID=~"$gatewayID",service="magmad",host="8.8.8.8",metric="rtt_ms",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}',
            },
          ],
          unit: 's',
          yMin: 0,
        },
        {
          title: 'System Uptime',
          targets: [
            {
              expr:
                'process_uptime_seconds{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}-{{service}}',
            },
          ],
          unit: 's',
          noAggregates: true,
          yMin: 0,
        },
        {
          title: 'Number of Service Restarts',
          targets: [
            {
              expr:
                'unexpected_service_restarts{gatewayID=~"$gatewayID",networkID=~"$networkID"}',
              legendFormat: '{{gatewayID}}-{{service_name}}',
            },
          ],
          noAggregates: true,
          yMin: 0,
        },
      ],
    },
  ],
};

export const TemplateDBData: GrafanaDBData = {
  title: 'Variable Demo',
  description:
    'Template dashboard with network and gateway variables preconfigured. Copy from this template to create a new dashboard which includes the networkID and gatewayID variables.',
  templates: [networkTemplate, gatewayTemplate],
  rows: [
    {
      title: '',
      panels: [
        {
          title: 'Variable Demo',
          targets: [
            {
              expr: `cpu_percent{networkID=~"$networkID",gatewayID=~"$gatewayID"}`,
            },
          ],
        },
      ],
    },
  ],
};

export function createDashboard(dbdata: GrafanaDBData) {
  const rows = dbdata.rows.map(conf => {
    const row = new Grafana.Row({title: conf.title});
    conf.panels.forEach(panel => row.addPanel(newPanel(panel)));
    return row;
  });
  const db = new Grafana.Dashboard({
    schemaVersion: 6,
    title: dbdata.title,
    templating: dbdata.templates,
    description: dbdata.description,
    rows,
  });
  db.state.editable = false;
  return db;
}

export type GrafanaDBData = {
  title: string,
  description: string,
  rows: Array<GrafanaDBRow>,
  templates: Array<TemplateConfig>,
};

type GrafanaDBRow = {
  title: string,
  panels: PanelParams[],
};

type PanelParams = {
  title: string,
  targets: Array<{expr: string, legendFormat?: string}>,
  unit?: string,
  yMin?: number,
  noAggregates?: boolean,
};

function newPanel(params: PanelParams) {
  const pan = new Grafana.Panels.Graph({
    title: params.title,
    span: 6,
    datasource: 'default',
  });
  // Have to add this after to avoid grafana-dash-gen from forcing the target
  // into a Graphite format
  pan.state.targets = params.targets;
  if (params.unit) {
    pan.state.y_formats[0] = params.unit;
  }
  if (params.yMin !== undefined) {
    pan.state.grid.leftMin = params.yMin;
  }
  if (params.noAggregates) {
    pan.state.legend.avg = false;
    pan.state.legend.max = false;
  }
  return pan;
}

export type TemplateParams = {
  labelName: string,
  query: string,
  regex: string,
  sort?: VariableSortOption,
};

type VariableSortOption =
  | 'none'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'num-asc'
  | 'num-desc'
  | 'alpha-insensitive-asc'
  | 'alpha-insensitive-desc';

export function variableTemplate(params: TemplateParams): TemplateConfig {
  return {
    allValue: '.+',
    definition: params.query,
    hide: 0,
    includeAll: true,
    allFormat: 'glob',
    multi: true,
    name: params.labelName,
    query: params.query,
    regex: params.regex,
    type: 'query',
    refresh: true,
    useTags: false,
    sort: params.sort ? variableSortNumbers[params.sort] : 0,
  };
}

export type TemplateConfig = {
  allValue: string,
  definition: string,
  hide: number,
  includeAll: boolean,
  allFormat: string,
  multi: boolean,
  name: string,
  query: string,
  regex: string,
  type: string,
  refresh: boolean,
  useTags: boolean,
};
