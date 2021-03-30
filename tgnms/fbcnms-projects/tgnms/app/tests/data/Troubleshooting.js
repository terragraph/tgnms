/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

export function mockPrometheusData() {
  return {
    snr: [
      {
        metric: {
          __name__: 'snr',
          instance: 'prometheus_cache:9091',
          intervalSec: '30',
          job: 'node_stats_kafka',
          linkDirection: 'A',
          linkName: 'link-10-01-11-01',
          network: 'puma_e2e_dryrun',
          nodeMac: '04:f8:f8:e7:5b:4e',
          nodeName: '10-01',
          pop: 'false',
          radioMac: '04:ce:14:fe:a1:bc',
          siteName: '10-01',
        },
        values: [
          [1607355411, '11'],
          [1607355471, '11'],
        ],
      },
    ],
  };
}

export function mockElasticSearchResult() {
  return {
    hits: {
      hits: [
        {
          _index: 'fluentd-log-server-2020.11.30',
          _type: '_doc',
          _id: 'Qh8tG3YB0AWjSsgq0Gh2',
          _score: 1.0,
          _source: {
            client: '',
            body:
              '{"sites":[{"name":"10-06","location":{"latitude":37.48311,"longitude":-122.14905,"altitude":0,"accuracy":40000000}}],"nodes":[],"links":[]}',
            path: '/api/bulkAdd',
            email: '',
            username: '',
            es_index: 'server',
            '@timestamp': '2020-12-10T22:02:28.000000000+00:00',
            '@log_name': 'log.server.e2e.audit.puma_e2e_dryrun.api_audit.log',
          },
        },
        {
          _index: 'fluentd-log-server-2020.12.01',
          _type: '_doc',
          _id: 'xhOoH3YBguF0OCeGb4mg',
          _score: 1.0,
          _source: {
            email: '',
            body: '{"overrides":"overrides"}',
            path: '/api/setNetworkOverridesConfig',
            client: '',
            username: '',
            es_index: 'server',
            '@timestamp': '2020-12-11T18:54:53.000000000+00:00',
            '@log_name': 'log.server.e2e.audit.puma_e2e_dryrun.api_audit.log',
          },
        },
      ],
    },
  };
}
