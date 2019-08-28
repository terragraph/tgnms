/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import React from 'react';
import moment from 'moment';
import type {LinkType} from '../../../shared/types/Topology';
import type {NetworkContextType} from '../../NetworkContext';

const SECONDS_HOUR = 60 * 60;
const SECONDS_DAY = SECONDS_HOUR * 24;

// convert time in ms to hh:MM:ss<AM/PM> format
// used by the function that creates the Scuba dashboard link
function hhMMss(tm) {
  return moment(new Date(tm)).format('h:mm:ssA');
}

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

// create a link to the high frequency Scuba dashboard
function renderScubaLink(a_node_name, z_node_name, startTms, endTms, context) {
  const {nodeMap} = context;
  const aNode = nodeMap[a_node_name];
  const zNode = nodeMap[z_node_name];
  if (!aNode || !zNode) {
    return null;
  }

  // Convert from ms to sec
  const endTs = Math.floor(endTms / 1000.0);
  const startTs = Math.floor(startTms / 1000.0);

  const url =
    'https://our.intern.facebook.com/intern/network/terragraph/link_log/?';
  const node_a = 'node_a=' + aNode.mac_addr;
  const node_z = '&node_z=' + zNode.mac_addr;

  const now = new Date();
  // getTimezoneOffset is the difference between UTC and local in
  // minutes
  const hour_diff = now.getTimezoneOffset() / 60;
  const start_time = (startTs - hour_diff * SECONDS_HOUR) % SECONDS_DAY;
  const start_date = (startTs - start_time) * 1000; // ms
  // local time display
  const start_time_local = hhMMss(startTms);
  const start_time_display = '&start_time_display=' + start_time_local;

  const end_time = (endTs - hour_diff * SECONDS_HOUR) % SECONDS_DAY;
  const end_date = (endTs - end_time) * 1000; // ms
  // local time display
  const end_time_local = hhMMss(endTms);
  const end_time_display = '&end_time_display=' + end_time_local;

  // Calculate configs based on (startT - endT): sample ratio and sample
  // num
  const total_sample_num = endTs - startTs;
  // more than 3700 samples gets slow for Scuba fetch
  const sampling_ratio = Math.ceil(total_sample_num / 3700);
  // assume 1 sample/second
  const sample_num = (total_sample_num / sampling_ratio).toFixed(0);
  const sample = '&sample=' + sample_num;
  const sampling_ratio_txt = '&sampling_ratio=' + sampling_ratio;
  const myURL =
    url +
    node_a +
    '&start_date=' +
    start_date +
    start_time_display +
    '&start_time=' +
    start_time +
    sample +
    sampling_ratio_txt +
    node_z +
    '&end_date=' +
    end_date +
    end_time_display +
    '&end_time=' +
    end_time;
  return myURL;
}

// this creates a link to a Scuba dashboard showing the last one hour of
// PHY statistics; the link will only work when connected to the FB
// corporate network
export function renderDashboardLink(
  cell: string,
  row: $Shape<LinkType>,
  style: {[string]: string},
  additionalParams: {context: NetworkContextType},
) {
  const {classes} = this.props;
  const {context} = additionalParams;

  // TODO add fbinternal back to this
  // if the field doesn't exist, don't display the link
  const now = new Date();
  // put in a two minute window because it takes some time for data to
  // reach Scuba
  const endTms = now.getTime() - 120 * 1000; // ms since 1970
  const startTms = endTms - (SECONDS_HOUR - 120) * 1000;

  const buttons = [];
  const scubaLink = renderScubaLink(
    row.a_node_name,
    row.z_node_name,
    startTms,
    endTms,
    context,
  );
  if (scubaLink) {
    buttons.push(
      <Button
        className={classes.button}
        color="primary"
        href={scubaLink}
        key={'scuba-link-' + row.name}
        size="small"
        target="_new"
        variant="outlined">
        Scuba
      </Button>,
    );
  }

  const odsLink = renderODSLink(row.a_node_name, row.z_node_name, context);
  if (odsLink) {
    buttons.push(
      <Button
        className={classes.button}
        color="primary"
        href={odsLink}
        key={'ods-link-' + row.name}
        size="small"
        target="_new"
        variant="outlined">
        ODS
      </Button>,
    );
  }

  return (
    <div>
      {cell}
      {buttons}
    </div>
  );
}
