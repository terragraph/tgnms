/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {gatewayTemplate, networkTemplate, variableTemplate} from './Dashboards';
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

const dbDescription =
  'Do not edit: edits will be overwritten. Save this dashboard under another name to copy and edit.';

export const CWFSubscriberDBData: GrafanaDBData = {
  title: 'CWF - Subscribers',
  description: dbDescription,
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
        },
      ],
    },
  ],
};

export const CWFAccessPointDBData: GrafanaDBData = {
  title: 'CWF - Access Points',
  description: dbDescription,
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
        },
        {
          title: 'Authorization',
          targets: [
            {
              expr: 'sum(eap_auth{apn=~"$apn"}) by (code, apn)',
              legendFormat: '{{apn}}-{{code}}',
            },
          ],
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
        },
        {
          title: 'Session Stop',
          targets: [
            {
              expr: 'sum(session_stop{apn=~"$apn"}) by (apn)',
              legendFormat: '{{apn}}',
            },
          ],
        },
        {
          title: 'Session Timeout',
          targets: [
            {
              expr: 'sum(session_timeouts{apn=~"$apn"}) by (apn)',
              legendFormat: '{{apn}}',
            },
          ],
        },
        {
          title: 'Session Terminate',
          targets: [
            {
              expr: 'sum(session_manager_terminate{apn=~"$apn"}) by (apn)',
              legendFormat: '{{apn}}',
            },
          ],
          unit: 's',
        },
      ],
    },
  ],
};

export const CWFNetworkDBData: GrafanaDBData = {
  title: 'CWF - Networks',
  description: dbDescription,
  templates: [networkTemplate],
  rows: [
    {
      title: 'Message Stats',
      panels: [
        {
          title: 'Authorization',
          targets: [
            {
              expr: 'sum(eap_auth{apn=~"$networkID"}) by (code, networkID)',
              legendFormat: '{{networkID}}-{{code}}',
            },
          ],
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
          title: 'Session Timeouts',
          targets: [
            {
              expr:
                'sum(session_timeouts{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Session Terminate',
          targets: [
            {
              expr:
                'sum(session_manager_terminate{networkID=~"$networkID"}) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'Diameter Result Codes',
      panels: [
        {
          title: 'Gy Result Codes',
          targets: [
            {
              expr:
                'sum(rate(gy_result_codes{networkID=~"$networkID"}[5m])) by (networkID, code)',
              legendFormat: '{{networkID}} - {{code}}',
            },
          ],
        },
        {
          title: 'SWX Result Codes',
          targets: [
            {
              expr:
                'sum(rate(swx_result_codes{networkID=~"$networkID"}[5m])) by (networkID, code)',
              legendFormat: '{{networkID}} - {{code}}',
            },
          ],
        },
        {
          title: 'SWX Experimental Result Codes',
          targets: [
            {
              expr:
                'sum(rate(swx_experimental_result_codes{networkID=~"$networkID"}[5m])) by (networkID, code)',
              legendFormat: '{{networkID}} - {{code}}',
            },
          ],
        },
      ],
    },
    {
      title: 'Diameter Timeouts',
      panels: [
        {
          title: 'Gx Timeouts',
          targets: [
            {
              expr:
                'sum(rate(gx_timeouts_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Gy Timeouts',
          targets: [
            {
              expr:
                'sum(rate(gy_timeouts_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'SWX Timeouts',
          targets: [
            {
              expr:
                'sum(rate(swx_timeouts_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'OCS CCR Requests',
      panels: [
        {
          title: 'Initializations',
          targets: [
            {
              expr: 'sum(rate(ocs_ccr_init_requests_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Terminations',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_terminate_requests_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Updates',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_update_requests_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'OCS Send Failures',
      panels: [
        {
          title: 'Initialization Failures',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_init_send_failures_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Temination Failures',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_terminate_send_failures_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Update Failures',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_update_send_failures_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'PCRF CCR Requests',
      panels: [
        {
          title: 'Initializations',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_init_requests_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Teminations',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_terminate_requests_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Updates',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_update_requests_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'PCRF CCR Send Failures',
      panels: [
        {
          title: 'Initialization Failures',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_init_send_failures_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Temination Failures',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_terminate_send_failures_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'Update Failures',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_update_send_failures_total[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'HSS Requests/Failures',
      panels: [
        {
          title: 'MAR Requests',
          targets: [
            {
              expr:
                'sum(rate(mar_requests_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'SAR Requests',
          targets: [
            {
              expr:
                'sum(rate(sar_requests_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'MAR Failures',
          targets: [
            {
              expr:
                'sum(rate(mar_send_failures_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
        {
          title: 'SAR Failures',
          targets: [
            {
              expr:
                'sum(rate(sar_send_failures_total{networkID=~"$networkID"}[5m])) by (networkID)',
              legendFormat: '{{networkID}}',
            },
          ],
        },
      ],
    },
  ],
};

export const CWFGatewayDBData: GrafanaDBData = {
  title: 'CWF - Gateways',
  description: dbDescription,
  templates: [networkTemplate, gatewayTemplate],
  rows: [
    {
      title: 'Diameter Result Codes',
      panels: [
        {
          title: 'Gx Result Codes',
          targets: [
            {
              expr:
                'sum(rate(gx_result_codes{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID, code)',
              legendFormat: '{{gatewayID}} - {{code}}',
            },
          ],
        },
        {
          title: 'Gy Result Codes',
          targets: [
            {
              expr:
                'sum(rate(gy_result_codes{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID, code)',
              legendFormat: '{{gatewayID}} - {{code}}',
            },
          ],
        },
        {
          title: 'SWX Result Codes',
          targets: [
            {
              expr:
                'sum(rate(swx_result_codes{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID, code)',
              legendFormat: '{{gatewayID}} - {{code}}',
            },
          ],
        },
        {
          title: 'SWX Experimental Result Codes',
          targets: [
            {
              expr:
                'sum(rate(swx_experimental_result_codes{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID, code)',
              legendFormat: '{{gatewayID}} - {{code}}',
            },
          ],
        },
      ],
    },
    {
      title: 'Diameter Timeouts',
      panels: [
        {
          title: 'Gx Timeouts',
          targets: [
            {
              expr:
                'sum(rate(gx_timeouts_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Gy Timeouts',
          targets: [
            {
              expr:
                'sum(rate(gy_timeouts_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'SWX Timeouts',
          targets: [
            {
              expr:
                'sum(rate(swx_timeouts_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'OCS CCR Requests',
      panels: [
        {
          title: 'Initializations',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_init_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Terminations',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_terminate_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Updates',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_update_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'OCS Send Failures',
      panels: [
        {
          title: 'Initialization Failures',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_init_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Termination Failures',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_terminate_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Update Failures',
          targets: [
            {
              expr:
                'sum(rate(ocs_ccr_update_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'PCRF CCR Requests',
      panels: [
        {
          title: 'Initializations',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_init_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Terminations',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_terminate_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Updates',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_update_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'PCRF CCR Send Failures',
      panels: [
        {
          title: 'Initialization Failures',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_init_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Termination Failures',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_terminate_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'Update Failures',
          targets: [
            {
              expr:
                'sum(rate(pcrf_ccr_update_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
      ],
    },
    {
      title: 'HSS Requests/Failures',
      panels: [
        {
          title: 'MAR Requests',
          targets: [
            {
              expr:
                'sum(rate(mar_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'SAR Requests',
          targets: [
            {
              expr:
                'sum(rate(sar_requests_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'MAR Failures',
          targets: [
            {
              expr:
                'sum(rate(mar_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
        {
          title: 'SAR Failures',
          targets: [
            {
              expr:
                'sum(rate(sar_send_failures_total{networkID=~"$networkID", gatewayID=~"$gatewayID"}[5m])) by (gatewayID)',
              legendFormat: '{{gatewayID}}',
            },
          ],
        },
      ],
    },
  ],
};
