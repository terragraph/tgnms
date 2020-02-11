/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import GrafanaIcon from '../../components/common/GrafanaIcon';
import GrafanaLink, {
  GrafanaDashboardUUID,
} from '../../components/common/GrafanaLink';
import React from 'react';
import type {LinkType} from '../../../shared/types/Topology';
import type {NetworkContextType} from '../../contexts/NetworkContext';

// create a link to an ODS Chart
function renderODSLink(a_node_name, z_node_name, context) {
  const {nodeMap} = context;

  const aNode = nodeMap[a_node_name];
  const zNode = nodeMap[z_node_name];
  if (!aNode || !zNode) {
    return null;
  }
  const keystr = {
    keys: [
      {
        az: 'Z',
        keyname: 'phystatus.ssnrEst',
      },
      {
        az: 'A',
        keyname: 'staPkt.mcs',
      },
      {
        az: 'A',
        keyname: 'staPkt.txPowerIndex',
      },
    ],
  };

  let url =
    'https://our.intern.facebook.com/intern/ods/chart/?submitted=1&period={"minutes_back":"60"}&chart_params={"type":"linechart","renderer":"highcharts","y_min":"","y_max":""}';
  const queries = {};
  let i = 0;

  queries.active = true;
  queries.source = 'ods';
  keystr.keys.forEach(keyData => {
    if (keyData.az === 'Z') {
      queries.key = 'tgf.' + zNode.mac_addr + '.' + keyData.keyname;
      queries.entity = 'CXL-Node-Test-' + aNode.mac_addr;
    } else {
      queries.key = 'tgf.' + aNode.mac_addr + '.' + keyData.keyname;
      queries.entity = 'CXL-Node-Test-' + zNode.mac_addr;
    }
    url = url + '&queries[' + i + ']=' + JSON.stringify(queries);
    i += 1;
  });

  return url;
}

// this creates links to Grafana and ODS
// PHY statistics; the ODS link will only work when connected to the FB
// corporate network
export function renderDashboardLinks(
  cell: string,
  row: $Shape<LinkType>,
  style: {[string]: string},
  additionalParams: {context: NetworkContextType},
) {
  const {classes} = this.props;
  const {context} = additionalParams;
  const buttons = [
    <GrafanaLink
      dashboard={GrafanaDashboardUUID.link}
      key={`grafana-link-${row.a_node_name}-${row.z_node_name}`}
      data-testid="grafana-link"
      vars={{
        'var-network': context.networkName,
      }}
      prometheusVars={{
        'var-link_name': row.name,
      }}>
      <Button
        className={classes.button}
        color="primary"
        size="small"
        title="View in Grafana"
        variant="outlined">
        <GrafanaIcon />
      </Button>
    </GrafanaLink>,
  ];

  const odsLink = renderODSLink(row.a_node_name, row.z_node_name, context);
  if (odsLink) {
    buttons.push(
      <Button
        className={classes.button}
        color="primary"
        href={odsLink}
        key={`ods-link-${row.a_node_name}-${row.z_node_name}`}
        size="small"
        target="_new"
        variant="outlined">
        ODS
      </Button>,
    );
  }

  return (
    <>
      <div className={classes.cell}>{cell}</div>
      <div>{buttons}</div>
    </>
  );
}

// this creates only a Grafana Link
export function renderGrafanaLink(
  cell: string,
  row: $Shape<LinkType>,
  style: {[string]: string},
  additionalParams: {context: NetworkContextType},
) {
  const {classes} = this.props;
  return (
    <>
      <div className={classes.cell}>{cell}</div>
      <GrafanaLink
        dashboard={GrafanaDashboardUUID.link}
        data-testid="grafana-link"
        vars={{
          'var-network': additionalParams.context.networkName,
        }}
        prometheusVars={{
          'var-link_name': row.name,
        }}>
        <Button
          className={classes.button}
          color="primary"
          size="small"
          title="View in Grafana"
          variant="outlined">
          <GrafanaIcon />
        </Button>
      </GrafanaLink>
    </>
  );
}
