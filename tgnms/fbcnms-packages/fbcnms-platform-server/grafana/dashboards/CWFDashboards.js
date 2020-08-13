/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {networkTemplate, variableTemplate} from './Dashboards';
import type {GrafanaDBData} from './Dashboards';

const imsiTemplate = variableTemplate({
  labelName: 'imsi',
  query: `label_values(imsi)`,
  regex: `/.+/`,
  sort: 'num-asc',
});

const apnTemplate = variableTemplate({
  labelName: 'apn',
  query: `label_values(apn)`,
  regex: `/.+/`,
  sort: 'alpha-insensitive-asc',
});

export const CWFSubscriberDBData: GrafanaDBData = {
  title: 'CWF - Subscribers',
  description:
    'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.',
  templates: [imsiTemplate],
  rows: [
    {
      title: 'Traffic',
      panels: [
        {
          title: 'Traffic In',
          targets: [
            {
              expr: 'sum(octets_in{imsi=~"$imsi"}) by (imsi)',
              legendFormat: '{{imsi}}',
            },
          ],
          unit: 'decbytes',
          yMin: 0,
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
          title: 'Throughput In',
          targets: [
            {
              expr: 'avg(rate(octets_in{imsi=~"$imsi"}[5m])) by (imsi)',
              legendFormat: '{{imsi}}',
            },
          ],
          unit: 'Bps',
          yMin: 0,
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
          yMin: 0,
        },
      ],
    },
    {
      title: 'Session',
      panels: [
        {
          title: 'Active Sessions',
          targets: [
            {
              expr: 'active_sessions{imsi=~"$imsi"}',
              legendFormat:
                '{{imsi}} Session: {{id}} -- Network: {{networkID}} -- Gateway: {{gatewayID}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
      ],
    },
  ],
};

export const CWFAccessPointDBData: GrafanaDBData = {
  title: 'CWF - Access Points',
  description:
    'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.',
  templates: [apnTemplate],
  rows: [
    {
      title: 'Message Stats',
      panels: [
        {
          title: 'Accounting Stops',
          targets: [
            {
              expr: 'sum(accounting_stop{apn=~"$apn"}) by (apn)',
              legendFormat: '{{apn}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
        {
          title: 'Authorization',
          targets: [
            {
              expr: 'sum(eap_auth{apn=~"$apn"}) by (code, apn)',
              legendFormat: '{{apn}}-{{code}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
      ],
    },
    {
      title: 'Traffic',
      panels: [
        {
          title: 'Traffic In',
          targets: [
            {
              expr: 'sum(octets_in{apn=~"$apn"}) by (apn)',
              legendFormat: '{{apn}}',
            },
          ],
          unit: 'decbytes',
          yMin: 0,
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
          yMin: 0,
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
          yMin: 0,
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
          yMin: 0,
        },
      ],
    },
    {
      title: 'Session',
      panels: [
        {
          title: 'Active Sessions',
          targets: [
            {
              expr: 'sum(active_sessions{apn=~"$apn"}) by (apn)',
              legendFormat: '{{apn}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
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
          yMin: 0,
          noAggregates: true,
        },
      ],
    },
  ],
};

export const CWFNetworkDBData: GrafanaDBData = {
  title: 'CWF - Networks',
  description:
    'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.',
  templates: [networkTemplate],
  rows: [
    {
      title: 'Message Stats',
      panels: [
        {
          title: 'Authorization',
          targets: [
            {
              expr:
                'sum(eap_auth{networkID=~"$networkID"}) by (code, networkID)',
              legendFormat: '{{networkID}}-{{code}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
        {
          title: 'Accounting Stops',
          targets: [
            {
              expr:
                'sum(accounting_stop{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
      ],
    },
    {
      title: 'Traffic',
      panels: [
        {
          title: 'Traffic In',
          targets: [
            {
              expr: 'sum(octets_in{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          unit: 'decbytes',
          yMin: 0,
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
          yMin: 0,
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
          yMin: 0,
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
          yMin: 0,
        },
      ],
    },
    {
      title: 'Latency',
      panels: [
        {
          title: 'Session Create Latency',
          targets: [
            {
              expr:
                'avg(create_session_lat{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          unit: 's',
          yMin: 0,
        },
      ],
    },
    {
      title: 'Session',
      panels: [
        {
          title: 'Active Sessions',
          targets: [
            {
              expr:
                'sum(active_sessions{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
        {
          title: 'Session Terminate',
          targets: [
            {
              expr:
                'sum(session_terminate{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
        {
          title: 'Session Stop',
          targets: [
            {
              expr: 'sum(session_stop{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
          yMin: 0,
          noAggregates: true,
        },
      ],
    },
  ],
};
