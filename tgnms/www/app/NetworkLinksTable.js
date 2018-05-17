/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from './NetworkDispatcher.js';
import {availabilityColor} from './NetworkHelper.js';
import {variableColorDown, variableColorUp} from './NetworkHelper.js';
import ReactEventChart from './ReactEventChart.js';
// dispatcher
import {Actions} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import PropTypes from 'prop-types';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import Select from 'react-select';
import React from 'react';

const SECONDS_HOUR = 60 * 60;
const SECONDS_DAY = SECONDS_HOUR * 24;
const INVALID_VALUE = 255;

const selfTestTableDescriptionInit = {
  from_node: {
    title: 'From',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'link',
  },
  to_node: {
    title: 'To',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'link',
  },
  scuba_link: {
    title: 'Scuba',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'dashboard',
  },
  wireless_hop_count: {
    title: 'Hop Count',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'wireless_hop_count',
  },
  health_tag: {
    title: 'Health Tag',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'healthiness',
  },
  distance: {
    title: 'Distance',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'distance',
  },
  per: {
    title: 'PER (%)',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'iperf_PER_avg',
  },
  mcs_p90: {
    title: 'MCS P90',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'mcs_p90',
  },
  mcs_avg: {
    title: 'MCS avg',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'mcs_avg',
  },
  mcs_std: {
    title: 'MCS std',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'mcs_std',
  },
  tx_power: {
    title: 'txPower',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'txPowerAvg',
  },
  snr: {
    title: 'SNR',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'snrAvg',
  },
  avg: {
    title: 'Avg (Mbit/s)',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'iperf_avg',
  },
  std: {
    title: 'Std (Mbit/s)',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'iperf_std',
  },
  min: {
    title: 'Min (Mbit/s)',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'iperf_min',
  },
  max: {
    title: 'Max (Mbit/s)',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'iperf_max',
  },
  time: {
    title: 'unix time',
    hidden: true,
    iskey: false,
    width: '50',
    sqlfield: 'time',
  },
  // name field always hidden, used to show link on the map
  name: {
    title: 'link name',
    hidden: false,
    iskey: true,
    width: '50',
    sqlfield: 'link',
  },
};

const selfTestTableDescriptionIperfUdp = {
  from_node: {hidden: false},
  to_node: {hidden: false},
  wireless_hop_count: {hidden: true},
  scuba_link: {hidden: false},
  health_tag: {hidden: false},
  distance: {hidden: false},
  per: {hidden: false},
  mcs_p90: {hidden: false},
  mcs_avg: {hidden: false},
  mcs_std: {hidden: false},
  tx_power: {hidden: false},
  snr: {hidden: false},
  avg: {hidden: false},
  std: {hidden: false},
  min: {hidden: false},
  max: {hidden: false},
  time: {hidden: true},
  name: {hidden: true},
};

const selfTestTableDescriptionMultiHop = {
  from_node: {hidden: false},
  to_node: {hidden: false},
  wireless_hop_count: {hidden: false},
  scuba_link: {hidden: true},
  health_tag: {hidden: true},
  distance: {hidden: true},
  per: {hidden: true},
  mcs_p90: {hidden: true},
  mcs_avg: {hidden: true},
  mcs_std: {hidden: true},
  tx_power: {hidden: true},
  snr: {hidden: true},
  avg: {hidden: false},
  std: {hidden: true},
  min: {hidden: true},
  max: {hidden: true},
  time: {hidden: true},
  name: {hidden: true},
};

export default class NetworkLinksTable extends React.Component {
  nodesByName = {};
  linksByName = {};
  state = {
    sortName: undefined,
    sortOrder: undefined,
    selectedLink: NetworkStore.selectedName,
    linkHealth: NetworkStore.linkHealth,
    analyzerTable: NetworkStore.analyzerTable,
    hideWired: true,
    showEventsChart: true,
    hideDnToDnLinks: false,
    toplink: null,
    // 0 = no status, 1 = sent request, 2 = request success, 3 = request error
    linkRequestButtonEnabled: true,
    showAnalyzer: false,
    showSelfTest: false,
    selfTestResults: NetworkStore.selfTestResults,
    selfTestGroups: NetworkStore.selfTestGroups,
    selfTestButton: null,
    selfTestFilter: null,
    selfTestTableDescription: selfTestTableDescriptionInit,

    // for react-select
    removeSelected: false,
    disabled: false,
    stayOpen: false,
    value: undefined,
    rtl: false,
  };

  constructor(props) {
    super(props);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
    this.linkSortFunc = this.linkSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
    this.getTableRowsAnalyzer = this.getTableRowsAnalyzer.bind(this);
    this.getTableRowsSelfTest = this.getTableRowsSelfTest.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  UNSAFE_componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
  }

  updateSelfTestButton(selfTestGroups) {
    const selfTestButton = [];
    selfTestGroups.forEach(selfTestGroup => {
      const row = {};
      if (!selfTestGroup || !selfTestGroup.test_tag) {
        console.log('ERROR: no results or test_tag field');
        return;
      }
      const runtime = new Date(Number(selfTestGroup.time) * 1000);
      const dateText = runtime.toString();
      row.label = selfTestGroup.test_tag + ' ' + dateText;
      row.value = selfTestGroup.time;
      row.testtag = selfTestGroup.test_tag;
      selfTestButton.push(row);
    });
    return selfTestButton;
  }

  // componentDidMount() {
  //   if (this.selfTestGroups) {
  //     const selfTestButton = this.updateSelfTestButton(this.selfTestGroups);
  //     this.setState({selfTestButton: selfTestButton});
  //   }
  // }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  updateMappings(topology) {
    this.linksByName = {};
    if (topology.links) {
      // order - 0 = nodes, 1 = links
      topology.links.forEach(link => {
        if (
          this.state.linkHealth &&
          this.state.linkHealth.metrics &&
          link.name in this.state.linkHealth.metrics
        ) {
          const nodeHealth = this.state.linkHealth.metrics[link.name];
          link.alive_perc = nodeHealth.alive;
          link.events = nodeHealth.events;
        }
        // link.name is the full name: e.g. link-15-46.p1-15-46.s2
        // link.a_node_name would be 15-46.p1 in this case
        this.linksByName[link.name] = link;
      });
    }
    this.nodesByName = {};
    topology.nodes.forEach(node => {
      this.nodesByName[node.name] = node;
    });
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedLink: null,
          linkRequestButtonEnabled: true,
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          sortName: payload.source == 'table' ? this.state.sortName : 'name',
          sortOrder: payload.source == 'table' ? this.state.sortOrder : 'asc',
          topLink:
            payload.source == 'table' ? this.state.topLink : payload.link,
          selectedLink: payload.link.name,
          linkRequestButtonEnabled: true,
        });
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          linkHealth: payload.linkHealth,
        });
        break;
      case Actions.ANALYZER_REFRESHED:
        this.setState({
          analyzerTable: payload.analyzerTable,
        });
        break;
      case Actions.SELF_TEST_REFRESHED:
        if (payload.selfTestResults.filter.filterType === 'GROUPS') {
          const selfTestButton = this.updateSelfTestButton(
            payload.selfTestResults.results,
          );
          this.setState({
            selfTestGroups: payload.selfTestResults.results,
            selfTestButton,
          });
        } else if (
          payload.selfTestResults.filter.testtime !== 'mostrecentiperfudp'
        ) {
          const selfTestTableDescription = this.state.selfTestTableDescription;
          const testtag = this.state.selfTestFilter.testtag;
          if (testtag === 'iperf_udp' || testtag === 'iperf_udp_tcp') {
            Object.keys(selfTestTableDescription).map(key => {
              selfTestTableDescription[key].hidden =
                selfTestTableDescriptionIperfUdp[key].hidden;
            });
          } else if (testtag === 'multihop') {
            Object.keys(selfTestTableDescription).map(key => {
              selfTestTableDescription[key].hidden =
                selfTestTableDescriptionMultiHop[key].hidden;
            });
          } else {
            Object.keys(selfTestTableDescription).map(key => {
              selfTestTableDescription[key].hidden = true;
            });
            selfTestTableDescription.name.hidden = false;
          }

          this.setState({
            selfTestResults: payload.selfTestResults.results,
            selfTestTableDescription,
          });
        }
    }
  }

  linkSortFuncHelper(a, b, order) {
    if (order === 'desc') {
      if (a.name > b.name) {
        return -1;
      } else if (a.name < b.name) {
        return 1;
      }
      // both entries have the same name, sort based on a/z node name
      if (a.a_node_name > a.z_node_name) {
        return -1;
      } else {
        return +1;
      }
    } else {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }
      // both entries have the same name, sort based on a/z node name
      if (a.a_node_name < a.z_node_name) {
        return -1;
      } else {
        return +1;
      }
    }
  }

  linkSortFunc(a, b, order) {
    // order is desc or asc
    if (this.state.topLink) {
      if (a.name == this.state.topLink.name) {
        if (a.name == b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return -1;
        }
      } else if (b.name == this.state.topLink.name) {
        if (a.name == b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return +1;
        }
      }
    }
    return this.linkSortFuncHelper(a, b, order);
  }

  onSortChange(sortName, sortOrder) {
    this.setState({
      sortName,
      sortOrder,
      toplink: sortName == 'name' ? this.state.toplink : null,
    });
  }

  formatAnalyzerValue(obj, propertyName) {
    return obj.hasOwnProperty(propertyName)
      ? obj[propertyName] == INVALID_VALUE
        ? '-'
        : obj[propertyName]
      : '-';
  }

  getTableRows(): Array<{
    name: string,
    a_node_name: string,
    z_node_name: string,
    alive: boolean,
  }> {
    const rows = [];
    Object.keys(this.linksByName).forEach(linkName => {
      const link = this.linksByName[linkName];
      let linkupAttempts = 0;
      if (link.linkup_attempts && link.linkup_attempts.buffer) {
        const buf = Buffer.from(link.linkup_attempts.buffer.data);
        linkupAttempts = parseInt(buf.readUIntBE(0, 8).toString());
      }
      if (link.link_type == 2 && this.state.hideWired) {
        return;
      }
      // check if either side of the node is a CN
      if (
        !this.nodesByName.hasOwnProperty(link.a_node_name) ||
        !this.nodesByName.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }
      const aNode = this.nodesByName[link.a_node_name];
      const zNode = this.nodesByName[link.z_node_name];
      if (
        this.state.hideDnToDnLinks &&
        aNode.node_type == 2 &&
        zNode.node_type == 2
      ) {
        // skip since it's DN to DN
        return;
      }
      rows.push({
        name: link.name,
        a_node_name: link.a_node_name,
        z_node_name: link.z_node_name,
        alive: link.is_alive,
        type: link.link_type == 1 ? 'Wireless' : 'Wired',
        alive_perc: link.alive_perc,
        linkup_attempts: linkupAttempts,
        distance: link.distance,
      });
    });
    return rows;
  }

  getTableRowsAnalyzer(): Array<{
    name: string,
    a_node_name: string,
    z_node_name: string,
    alive: boolean,
  }> {
    const rows = [];
    if (!this.linksByName) {
      return;
    }
    Object.keys(this.linksByName).forEach(linkName => {
      const link = this.linksByName[linkName];
      if (!this.state.analyzerTable || !this.state.analyzerTable.metrics) {
        return;
      }
      const analyzerLink = this.state.analyzerTable.metrics.hasOwnProperty(
        linkName,
      )
        ? this.state.analyzerTable.metrics[linkName]
        : [];
      const analyzerLinkA = analyzerLink.hasOwnProperty('A')
        ? analyzerLink.A
        : analyzerLink;
      const analyzerLinkZ = analyzerLink.hasOwnProperty('Z')
        ? analyzerLink.Z
        : analyzerLink;
      // let linkupAttempts = 0;
      // if (link.linkup_attempts && link.linkup_attempts.buffer) {
      //   const buf = Buffer.from(link.linkup_attempts.buffer.data);
      //   linkupAttempts = parseInt(buf.readUIntBE(0, 8).toString());
      // }
      if (link.link_type == 2 && this.state.hideWired) {
        return;
      }
      // check if either side of the node is a CN
      if (
        !this.nodesByName.hasOwnProperty(link.a_node_name) ||
        !this.nodesByName.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }
      const aNode = this.nodesByName[link.a_node_name];
      const zNode = this.nodesByName[link.z_node_name];
      if (
        this.state.hideDnToDnLinks &&
        aNode.node_type == 2 &&
        zNode.node_type == 2
      ) {
        // skip since it's DN to DN
        return;
      }

      // this is the A->Z link
      rows.push({
        name: link.name,
        a_node_name: link.a_node_name,
        z_node_name: link.z_node_name,
        alive: link.is_alive,
        type: link.link_type == 1 ? 'Wireless' : 'Wired',
        alive_perc: link.alive_perc,
        fw_restarts: analyzerLinkA.flaps,
        uptime: analyzerLinkA.uptime / 60.0,
        mcs: this.formatAnalyzerValue(analyzerLinkA, 'avgmcs'),
        snr: this.formatAnalyzerValue(analyzerLinkZ, 'avgsnr'),
        per: this.formatAnalyzerValue(analyzerLinkA, 'avgper'),
        tputPPS: this.formatAnalyzerValue(analyzerLinkA, 'tput'),
        txpower: this.formatAnalyzerValue(analyzerLinkA, 'avgtxpower'),
        distance: link.distance,
      });
      // this is the Z->A link
      rows.push({
        name: link.name,
        a_node_name: link.z_node_name,
        z_node_name: link.a_node_name,
        alive: link.is_alive,
        type: link.link_type == 1 ? 'Wireless' : 'Wired',
        alive_perc: link.alive_perc,
        fw_restarts: analyzerLinkZ.flaps,
        uptime: analyzerLinkZ.uptime / 60.0,
        mcs: this.formatAnalyzerValue(analyzerLinkZ, 'avgmcs'),
        snr: this.formatAnalyzerValue(analyzerLinkA, 'avgsnr'),
        per: this.formatAnalyzerValue(analyzerLinkZ, 'avgper'),
        tputPPS: this.formatAnalyzerValue(analyzerLinkZ, 'tput'),
        txpower: this.formatAnalyzerValue(analyzerLinkZ, 'avgtxpower'),
        distance: link.distance,
      });
    });
    return rows;
  }

  getTableRowsSelfTest(): Array<{
    name: string,
    a_node_name: string,
    z_node_name: string,
    alive: boolean,
  }> {
    const tablerows = [];
    if (this.state.selfTestResults) {
      const temp = this.state.selfTestResults;
      temp.forEach(row => {
        const tablerow = [];
        Object.keys(this.state.selfTestTableDescription).map(key => {
          if (
            row.hasOwnProperty(
              this.state.selfTestTableDescription[key].sqlfield,
            )
          ) {
            // from_to is in the format "<from node>__<to node>" and "to node"
            // is "pop" for the multiphop test
            const fromNode = row[
              this.state.selfTestTableDescription.from_node.sqlfield
            ].split('__')[0];
            const toNode = row[
              this.state.selfTestTableDescription.to_node.sqlfield
            ].split('__')[1];
            if (key === 'from_node') {
              tablerow[key] = fromNode;
            } else if (key === 'to_node') {
              tablerow[key] = toNode;
            } else if (key === 'name') {
              // we don't know if the link name is link-A-B or link-B-A so
              // try both
              let linkName = 'link-' + fromNode + '-' + toNode;
              if (this.linksByName.hasOwnProperty(linkName)) {
                tablerow[key] = linkName;
              } else {
                linkName = 'link-' + toNode + '-' + fromNode;
                tablerow[key] = linkName;
              }
            } else {
              tablerow[key] =
                row[this.state.selfTestTableDescription[key].sqlfield];
            }
          }
        });
        tablerows.push(tablerow);
      });
      if (this.state.selfTestResults.length === 0) {
        const tablerow = [];
        tablerow.name =
          "please select a self-test from the dropdown, then select 'fetch self-test results'";
        tablerows.push(tablerow);
      }
    }
    return tablerows;
  }

  handleSelectChange(value) {
    let testtag = '';

    for (let i = 0; i < this.state.selfTestButton.length; i++) {
      if (this.state.selfTestButton[i].value === value) {
        testtag = this.state.selfTestButton[i].testtag;
        break;
      }
    }
    const selfTestFilter = {
      filterType: 'TESTRESULTS',
      testtime: value,
      testtag,
    };
    this.setState({
      value,
      selfTestFilter,
    });
  }

  renderSelectButton() {
    const {disabled, stayOpen, value} = this.state;

    if (this.state.selfTestGroups.length > 0) {
      return (
        <div
          style={
            this.state.showSelfTest ? {display: 'block'} : {display: 'none'}
          }>
          <Select
            name="form-field-name"
            className="selectButtonClass"
            closeOnSelect={!stayOpen}
            value={value}
            onChange={this.handleSelectChange}
            options={this.state.selfTestButton}
            disabled={disabled}
            placeholder="Select self-test from list"
            removeSelected={this.state.removeSelected}
            rtl={this.state.rtl}
            simpleValue
          />
          &nbsp;
          <button
            className={'graph-button-fetch'}
            onClick={btn => {
              Dispatcher.dispatch({
                actionType: Actions.SELF_TEST_FETCH,
                filter: this.state.selfTestFilter,
              });
            }}>
            fetch self-test results
          </button>
          <button
            className={'graph-button-fetch'}
            onClick={btn => {
              Dispatcher.dispatch({
                actionType: Actions.SELF_TEST_FETCH,
                filter: {filterType: 'GROUPS', testtime: 'notused'},
              });
            }}>
            refresh self-test list
          </button>
        </div>
      );
    } else if (this.state.showSelfTest) {
      return 'no results';
    } else {
      return;
    }
  }

  tableOnRowSelect(row, isSelected) {
    if (this.linksByName.hasOwnProperty(row.name)) {
      Dispatcher.dispatch({
        actionType: Actions.LINK_SELECTED,
        link: this.linksByName[row.name],
        source: 'table',
      });
    }
  }

  renderNameWithStatsLinks(cell, row) {
    const linkStyle = {
      color: 'blue',
      cursor: 'pointer',
      paddingLeft: '5px',
    };
    return (
      <span>
        {cell}
        <br />
        Stats:
        <span
          style={linkStyle}
          onClick={click => {
            Dispatcher.dispatch({
              actionType: Actions.VIEW_SELECTED,
              viewName: 'stats',
              nodeRestrictor: row.name,
            });
          }}>
          Link
        </span>
        <span
          style={linkStyle}
          onClick={click => {
            Dispatcher.dispatch({
              actionType: Actions.VIEW_SELECTED,
              viewName: 'stats',
              nodeRestrictor: [row.a_node_name, row.z_node_name].join(','),
            });
          }}>
          Nodes
        </span>
      </span>
    );
  }

  // convert time in ms to hh:MM:ss<AM/PM> format
  // used by the function that creates the Scuba dashboard link
  hhMMss(tm) {
    const tmm = new Date(tm);
    const seconds = tmm.getSeconds();
    const minutes = tmm.getMinutes();
    let hour = tmm.getHours();
    let ampm = '';
    if (hour > 12) {
      hour -= 12;
      ampm = 'PM';
    } else {
      ampm = 'AM';
    }
    return hour + ':' + minutes + ':' + seconds + ampm;
  }

  // create a link to an ODS Chart
  renderODSLink(a_node_name, z_node_name) {
    const aNode = this.nodesByName[a_node_name];
    const zNode = this.nodesByName[z_node_name];
    if (!aNode || !zNode) {
      return;
    }
    const keystr = {
      keys: [
        {
          keyname: 'phystatus.ssnrEst',
          az: 'Z',
        },
        {
          keyname: 'staPkt.mcs',
          az: 'A',
        },
        {
          keyname: 'staPkt.txPowerIndex',
          az: 'A',
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
  renderScubaLink(a_node_name, z_node_name, startTms, endTms) {
    const aNode = this.nodesByName[a_node_name];
    const zNode = this.nodesByName[z_node_name];
    if (!aNode || !zNode) {
      return;
    }

    const endTs = (endTms / 1000.0).toFixed(0);
    const startTs = (startTms / 1000.0).toFixed(0);

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
    const start_time_local = this.hhMMss(startTms);
    const start_time_display = '&start_time_display=' + start_time_local;

    const end_time = (endTs - hour_diff * SECONDS_HOUR) % SECONDS_DAY;
    const end_date = (endTs - end_time) * 1000; // ms
    // local time display
    const end_time_local = this.hhMMss(endTms);
    const end_time_display = '&end_time_display=' + end_time_local;

    // Calculate configs based on (startT - endT): sample ratio and sample
    // num
    const total_sample_num = endTs - startTs;
    // more than 3700 samples gets slow for Scuba fetch
    const sampling_ratio = Math.ceil(total_sample_num / 3700).toFixed(0);
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
  renderDashboardLink(cell, row) {
    let fbinternal = false;
    if (this.props.instance.hasOwnProperty('fbinternal')) {
      fbinternal = this.props.instance.fbinternal;
    }

    // if the field doesn't exist, don't display the link
    if (
      !this.nodesByName.hasOwnProperty(row.a_node_name) ||
      !this.nodesByName.hasOwnProperty(row.z_node_name)
    ) {
      return;
    }
    const now = new Date();
    // put in a two minute window because it takes some time for data to
    // reach Scuba
    const endTms = now.getTime() - 120 * 1000; // ms since 1970
    const startTms = endTms - (SECONDS_HOUR - 120) * 1000;

    const scubaURL = this.renderScubaLink(
      row.a_node_name,
      row.z_node_name,
      startTms,
      endTms,
    );
    const odsURL = this.renderODSLink(row.a_node_name, row.z_node_name);

    if (fbinternal) {
      return (
        <span>
          {' '}
          {cell}{' '}
          <a href={scubaURL} target="_new">
            (Scuba)
          </a>
          <a href={odsURL} target="_new">
            (ODS)
          </a>
        </span>
      );
    } else {
      return <span> {cell} </span>;
    }
  }

  // this creates a link to a Scuba dashboard
  renderDashboardLinkSelfTest(cell, row) {
    const a_node_name = row.from_node;
    const z_node_name = row.to_node;
    // if the field doesn't exist, don't display the link
    if (
      !this.nodesByName.hasOwnProperty(a_node_name) ||
      !this.nodesByName.hasOwnProperty(z_node_name)
    ) {
      return;
    }

    let scubaURL = '';
    for (const i in row.scuba_link.data) {
      scubaURL += String.fromCharCode(row.scuba_link.data[i]);
    }
    const odsURL = this.renderODSLink(a_node_name, z_node_name);

    return (
      <span>
        <a href={scubaURL} target="_new">
          (Scuba)
        </a>
        <a href={odsURL} target="_new">
          (ODS)
        </a>
      </span>
    );
  }

  renderAlivePerc(cell, row) {
    let cellColor = 'red';
    let cellText = '-';
    if (row.type == 'Wired') {
      // color wired links as unavailable
      cellColor = 'grey';
      cellText = 'X';
    } else if (cell) {
      cellText = Math.round(cell * 100) / 100;
      cellColor = availabilityColor(cellText);
    }
    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  }

  // round and set color
  renderFloatPoint(cell, row, tpxx) {
    let cellColor = 'red';
    let cellText = '-';
    if (!isNaN(cell)) {
      switch (tpxx) {
        case 'mcs':
          if (cell === 254) {
            cellText = 'N/A';
            cellColor = 'black';
          } else {
            cellText = cell.toFixed(1);
            // if value>thresh1 green, elseif >thresh2 orange, else red
            cellColor = variableColorUp(cell, 9, 5);
          }
          break;
        case 'snr':
          cellText = cell.toFixed(1);
          cellColor = variableColorUp(cell, 12, 9);
          break;
        case 'txpower':
          cellText = cell.toFixed(1);
          cellColor = variableColorUp(cell, 0, 0);
          break;
        case 'tput':
          cellText = cell.toFixed(0);
          cellColor = variableColorUp(cell, 0, 0);
          break;
        case 'per':
          if (cell === 254) {
            cellText = 'N/A';
            cellColor = 'black';
          } else {
            cellText = cell.toExponential(2);
            // if value<thresh1 green, elseif <thresh2 orange, else red
            cellColor = variableColorDown(cell, 0.005, 0.01);
          }
          break;
        case 'uptime':
          cellText = cell.toFixed(0);
          cellColor = variableColorUp(cell, 59, 59);
          break;
        case 'fw_restarts':
          cellText = cell.toFixed(0);
          cellColor = variableColorDown(cell, 0, 1);
          break;
      }
    }

    return <span style={{color: cellColor}}>{'' + cellText}</span>;
  }

  renderLinkAvailability(cell, row) {
    if (row && row.name) {
      const link = this.linksByName[row.name];
      if (link && link.events && link.events.length > 0) {
        const startTime = this.state.linkHealth.start;
        const endTime = this.state.linkHealth.end;
        return (
          <ReactEventChart
            events={link.events}
            startTime={startTime}
            endTime={endTime}
            size="small"
          />
        );
      }
    }
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {'' + cell}
      </span>
    );
  }

  trClassFormat(row, rowIndex) {
    // row is the current row data
    if (row.health_tag) {
      if (row.health_tag.toLowerCase().includes('warning')) {
        return 'tr-warning';
      } else if (row.health_tag.toLowerCase().includes('marginal')) {
        return 'tr-marginal';
      } else if (row.health_tag.toLowerCase().includes('healthy')) {
        return 'tr-healthy';
      } else if (row.health_tag.toLowerCase().includes('excellent')) {
        return 'tr-excellent';
      } else if (row.health_tag.toLowerCase().includes('not')) {
        return 'tr-not-tested';
      } else {
        return 'tr-other';
      }
    }
  }

  renderLinksTable() {
    //let adjustedHeight = this.props.height - (this.state.selectedLink ? 100 : 0);
    let adjustedHeight = this.props.height - 40;
    adjustedHeight = adjustedHeight < 0 ? 0 : adjustedHeight;
    const linksSelectRowProp = {
      mode: 'radio',
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.state.selectedLink ? [this.state.selectedLink] : [],
    };
    const tableOpts = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.onSortChange.bind(this),
    };
    if (this.state.showAnalyzer) {
      return (
        <BootstrapTable
          height={adjustedHeight + 'px'}
          key="linksTable"
          data={this.getTableRowsAnalyzer()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}>
          <TableHeaderColumn
            width="350"
            dataSort={true}
            dataField="name"
            isKey={true}
            dataFormat={this.renderDashboardLink.bind(this)}
            sortFunc={this.linkSortFunc}>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="a_node_name">
            A-Node
          </TableHeaderColumn>
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="z_node_name">
            Z-Node
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderStatusColor}
            dataField="alive">
            Alive
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={'mcs'}
            dataField="mcs">
            Avg MCS
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={'snr'}
            dataField="snr">
            Avg SNR
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={'per'}
            dataField="per">
            Avg PER
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={'tput'}
            dataField="tputPPS">
            Avg tput(PPS)
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={'txpower'}
            dataField="txpower">
            Avg txPower
          </TableHeaderColumn>
          <TableHeaderColumn
            dataSort={true}
            width="80"
            dataFormat={this.renderFloatPoint}
            formatExtraData={'fw_restarts'}
            dataField="fw_restarts">
            #Restarts
          </TableHeaderColumn>
          <TableHeaderColumn
            dataSort={true}
            width="80"
            dataFormat={this.renderFloatPoint}
            formatExtraData={'uptime'}
            dataField="uptime">
            Uptime (minutes)
          </TableHeaderColumn>
          <TableHeaderColumn dataSort={true} width="80" dataField="distance">
            Distance (m)
          </TableHeaderColumn>
        </BootstrapTable>
      );
    } else if (this.state.showEventsChart) {
      return (
        <BootstrapTable
          height={adjustedHeight + 'px'}
          key="linksTable"
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}>
          <TableHeaderColumn
            width="150"
            dataSort={true}
            dataField="name"
            dataFormat={this.renderNameWithStatsLinks.bind(this)}
            isKey={true}
            sortFunc={this.linkSortFunc}>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderStatusColor}
            dataField="alive">
            Alive
          </TableHeaderColumn>
          <TableHeaderColumn
            width="140"
            dataSort={true}
            dataField="alive_perc"
            dataFormat={this.renderAlivePerc}>
            Uptime (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn
            width="700"
            dataSort={true}
            dataField="availability_chart"
            dataFormat={this.renderLinkAvailability.bind(this)}>
            Availability (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn
            dataSort={true}
            width="100"
            dataField="linkup_attempts">
            Attempts
          </TableHeaderColumn>
          <TableHeaderColumn dataSort={true} width="100" dataField="distance">
            Distance (m)
          </TableHeaderColumn>
        </BootstrapTable>
      );
    } else if (this.state.showSelfTest) {
      return (
        <BootstrapTable
          height={adjustedHeight + 'px'}
          key="linksTable"
          data={this.getTableRowsSelfTest()}
          striped={false}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}
          trClassName={this.trClassFormat}>
          {Object.keys(this.state.selfTestTableDescription).map(key => (
            <TableHeaderColumn
              key={key}
              dataField={key}
              hidden={this.state.selfTestTableDescription[key].hidden}
              isKey={this.state.selfTestTableDescription[key].iskey}
              width={this.state.selfTestTableDescription[key].width}
              dataSort={true}
              dataFormat={
                key === 'scuba_link'
                  ? this.renderDashboardLinkSelfTest.bind(this)
                  : function(cell, row) {
                      return <span> {cell} </span>;
                    }
              }>
              {this.state.selfTestTableDescription[key].title}
            </TableHeaderColumn>
          ))}
        </BootstrapTable>
      );
    } else {
      return (
        <BootstrapTable
          height={adjustedHeight + 'px'}
          key="linksTable"
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}>
          <TableHeaderColumn
            width="350"
            dataSort={true}
            dataField="name"
            isKey={true}
            sortFunc={this.linkSortFunc}>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="a_node_name">
            A-Node
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="z_node_name">
            Z-Node
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderStatusColor}
            dataField="alive">
            Alive
          </TableHeaderColumn>
          <TableHeaderColumn
            width="140"
            dataSort={true}
            dataField="alive_perc"
            dataFormat={this.renderAlivePerc}>
            Uptime (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn dataField="type">Type</TableHeaderColumn>
          <TableHeaderColumn dataSort={true} dataField="linkup_attempts">
            Attempts
          </TableHeaderColumn>
          <TableHeaderColumn dataSort={true} dataField="distance">
            Distance (m)
          </TableHeaderColumn>
        </BootstrapTable>
      );
    }
  }

  render() {
    // update topology to health mappings
    this.updateMappings(this.props.topology);
    // render display with or without events chart
    const linksTable = this.renderLinksTable();
    const selectButton = this.renderSelectButton();
    let fbinternal = false;
    if (this.props.instance.hasOwnProperty('fbinternal')) {
      fbinternal = this.props.instance.fbinternal;
    }
    return (
      <ul style={{listStyleType: 'none', paddingLeft: '0px'}}>
        <li key="linksTable">
          <button
            className={
              this.state.hideWired
                ? 'graph-button graph-button-selected'
                : 'graph-button'
            }
            onClick={btn => this.setState({hideWired: !this.state.hideWired})}>
            Hide Wired
          </button>
          <button
            className={
              this.state.hideDnToDnLinks
                ? 'graph-button graph-button-selected'
                : 'graph-button'
            }
            onClick={btn =>
              this.setState({hideDnToDnLinks: !this.state.hideDnToDnLinks})
            }>
            CNs Only
          </button>
          &nbsp;&nbsp;&nbsp;
          <button
            className={
              this.state.showEventsChart
                ? 'graph-button graph-button-selected'
                : 'graph-button'
            }
            onClick={btn =>
              this.setState({
                showEventsChart: !this.state.showEventsChart,
                showAnalyzer: false,
                showSelfTest: false,
              })
            }>
            Show Link Events
          </button>
          <button
            className={
              this.state.showAnalyzer
                ? 'graph-button graph-button-selected'
                : 'graph-button'
            }
            onClick={btn =>
              this.setState({
                showAnalyzer: true,
                showEventsChart: false,
                showSelfTest: false,
              })
            }>
            Link Stats
          </button>
          {fbinternal ? (
            <button
              className={
                this.state.showSelfTest
                  ? 'graph-button graph-button-selected'
                  : 'graph-button'
              }
              onClick={btn => {
                this.setState({
                  showSelfTest: true,
                  showEventsChart: false,
                  showAnalyzer: false,
                });
                Dispatcher.dispatch({
                  actionType: Actions.SELF_TEST_FETCH,
                  filter: {filterType: 'GROUPS', testtime: 'notused'},
                });
              }}>
              Self Test
            </button>
          ) : null}
          {selectButton}
          {linksTable}
        </li>
      </ul>
    );
  }
}
NetworkLinksTable.propTypes = {
  topology: PropTypes.object.isRequired,
};
