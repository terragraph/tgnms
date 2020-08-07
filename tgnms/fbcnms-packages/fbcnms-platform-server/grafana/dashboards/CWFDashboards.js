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

import {networkTemplate, newPanel, variableTemplate} from './Dashboards';
import type {PanelParams, TemplateConfig} from './Dashboards';

function imsiTemplate(): TemplateConfig {
  return variableTemplate({
    labelName: 'imsi',
    query: `label_values(imsi)`,
    regex: `/.+/`,
    sort: 'num-asc',
  });
}

function apnTemplate(): TemplateConfig {
  return variableTemplate({
    labelName: 'apn',
    query: `label_values(apn)`,
    regex: `/.+/`,
    sort: 'alpha-insensitive-asc',
  });
}

const SubscribersPanels: Array<PanelParams> = [
  {
    title: 'Traffic In',
    targets: [
      {
        expr: 'sum(octets_in{imsi=~"$imsi"}) by (imsi)',
        legendFormat: '{{imsi}}',
      },
    ],
    unit: 'decbytes',
  },
  {
    title: 'Traffic Out',
    targets: [
      {
        expr: 'sum(octets_out{imsi=~"$imsi"}) by (imsi)',
        legendFormat: '{{imsi}}',
      },
    ],
    unit: 'decbytes',
  },
  {
    title: 'Throughput In',
    targets: [
      {
        expr: 'avg(rate(octets_in{imsi=~"$imsi"}[5m])) by (imsi)',
        legendFormat: '{{imsi}}',
      },
    ],
    unit: 'Bps',
  },
  {
    title: 'Throughput Out',
    targets: [
      {
        expr: 'avg(rate(octets_out{imsi=~"$imsi"}[5m])) by (imsi)',
        legendFormat: '{{imsi}}',
      },
    ],
    unit: 'Bps',
  },
  {
    title: 'Active Sessions',
    targets: [
      {
        expr: 'active_sessions{imsi=~"$imsi"}',
        legendFormat:
          '{{imsi}} Session: {{id}} -- Network: {{networkID}} -- Gateway: {{gatewayID}}',
      },
    ],
  },
];

const APNPanels: Array<PanelParams> = [
  {
    title: 'Authorization',
    targets: [
      {
        expr: 'sum(eap_auth{apn=~"$apn"}) by (code, apn)',
        legendFormat: '{{apn}}-{{code}}',
      },
    ],
  },
  {
    title: 'Active Sessions',
    targets: [
      {
        expr: 'sum(active_sessions{apn=~"$apn"}) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
  },
  {
    title: 'Traffic In',
    targets: [
      {
        expr: 'sum(octets_in{apn=~"$apn"}) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
    unit: 'decbytes',
  },
  {
    title: 'Traffic Out',
    targets: [
      {
        expr: 'sum(octets_out{apn=~"$apn"}) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
    unit: 'decbytes',
  },
  {
    title: 'Throughput In',
    targets: [
      {
        expr: 'avg(rate(octets_in{apn=~"$apn"}[5m])) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
    unit: 'Bps',
  },
  {
    title: 'Throughput Out',
    targets: [
      {
        expr: 'avg(rate(octets_out{apn=~"$apn"}[5m])) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
    unit: 'Bps',
  },
  {
    title: 'Accounting Stops',
    targets: [
      {
        expr: 'sum(accounting_stop{apn=~"$apn"}) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
  },
  {
    title: 'Session Terminate',
    targets: [
      {
        expr: 'sum(session_terminate{apn=~"$apn"}) by (apn)',
        legendFormat: '{{apn}}',
      },
    ],
    unit: 's',
  },
];

const NetworkPanels: Array<PanelParams> = [
  {
    title: 'Authorization',
    targets: [
      {
        expr: 'sum(eap_auth{networkID=~"$networkID"}) by (code, networkID)',
        legendFormat: '{{networkID}}-{{code}}',
      },
    ],
  },
  {
    title: 'Active Sessions',
    targets: [
      {
        expr: 'sum(active_sessions{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
  },
  {
    title: 'Traffic In',
    targets: [
      {
        expr: 'sum(octets_in{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
    unit: 'decbytes',
  },
  {
    title: 'Traffic Out',
    targets: [
      {
        expr: 'sum(octets_out{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
    unit: 'decbytes',
  },
  {
    title: 'Throughput In',
    targets: [
      {
        expr:
          'avg(rate(octets_in{networkID=~"$networkID"}[5m])) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
    unit: 'Bps',
  },
  {
    title: 'Throughput Out',
    targets: [
      {
        expr:
          'avg(rate(octets_out{networkID=~"$networkID"}[5m])) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
    unit: 'Bps',
  },
  {
    title: 'Accounting Stops',
    targets: [
      {
        expr: 'sum(accounting_stop{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
  },
  {
    title: 'Session Terminate',
    targets: [
      {
        expr: 'sum(session_terminate{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
  },
  {
    title: 'Session Stop',
    targets: [
      {
        expr: 'sum(session_stop{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
  },
  {
    title: 'Session Create Latency',
    targets: [
      {
        expr: 'avg(create_session_lat{networkID=~"$networkID"}) by (networkID)',
        legendFormat: '{{networkID}}',
      },
    ],
    unit: 's',
  },
];

export function SubscribersDashboard() {
  const row = new Grafana.Row({title: ''});
  SubscribersPanels.forEach(conf => {
    row.addPanel(newPanel(conf));
  });
  const db = new Grafana.Dashboard({
    schemaVersion: 6,
    title: 'CWF - Subscribers',
    templating: [imsiTemplate()],
    rows: [row],
    editable: false,
  });
  db.state.editable = false;
  db.state.description =
    'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.';
  return db;
}

export function AccessPointDashboard() {
  const row = new Grafana.Row({title: ''});
  APNPanels.forEach(conf => {
    row.addPanel(newPanel(conf));
  });
  const db = new Grafana.Dashboard({
    schemaVersion: 6,
    title: 'CWF - Access Points',
    templating: [apnTemplate()],
    rows: [row],
    editable: false,
  });
  db.state.editable = false;
  db.state.description =
    'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.';
  return db;
}

export function CWFNetworkDashboard() {
  const row = new Grafana.Row({title: ''});
  NetworkPanels.forEach(conf => {
    row.addPanel(newPanel(conf));
  });
  const db = new Grafana.Dashboard({
    schemaVersion: 6,
    title: 'CWF - Network',
    templating: [networkTemplate()],
    rows: [row],
    editable: false,
  });
  db.state.editable = false;
  db.state.description =
    'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.';
  return db;
}
