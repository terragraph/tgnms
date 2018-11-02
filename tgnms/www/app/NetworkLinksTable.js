/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';
import PropTypes from 'prop-types';
import React from 'react';
import {SortDirection} from 'react-virtualized';

import {LinkType} from '../thrift/gen-nodejs/Topology_types';
import CustomTable from './components/common/CustomTable.js';
import {Actions} from './constants/NetworkConstants.js';
import {
  availabilityColor,
  variableColorDown,
  variableColorUp,
} from './helpers/NetworkHelpers.js';
import Dispatcher from './NetworkDispatcher.js';
import ReactEventChart from './ReactEventChart.js';
import NetworkStore from './stores/NetworkStore.js';

// using ReactEventChart until performance for Plotly is improved
// import PlotlyEventChart from './PlotlyEventChart.js';
const SECONDS_HOUR = 60 * 60;
const SECONDS_DAY = SECONDS_HOUR * 24;
const INVALID_VALUE = 255;

export default class NetworkLinksTable extends React.Component {
  linksByName = {};
  nodesByName = {};

  state = {
    analyzerTable: NetworkStore.analyzerTable,
    hideDnToDnLinks: false,
    hideWired: true,
    linkHealth: NetworkStore.linkHealth,
    selectedLink: NetworkStore.selectedName,
    showAnalyzer: false,
    showEventsChart: true,
    sortBy: null,
    sortDirection: SortDirection.ASC,
    topLink: null,
  };

  eventChartColumns = [
    {
      filter: true,
      isKey: true,
      key: 'name',
      label: 'Name',
      render: this.renderNameWithStatsLinks.bind(this),
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
    },
    {
      key: 'alive',
      label: 'Alive?',
      render: this.renderStatusColor.bind(this),
      sort: true,
      width: 100,
    },
    {
      key: 'alive_perc',
      label: 'Uptime (24 hours)',
      render: this.renderAlivePerc.bind(this),
      sort: true,
      width: 120,
    },
    {
      key: 'availability_chart',
      label: 'Availability (24 hours)',
      render: this.renderLinkAvailability.bind(this),
      sort: true,
      width: 810,
    },
    {key: 'linkup_attempts', label: 'Attempts', sort: true, width: 100},
    {key: 'distance', label: 'Distance (m)', sort: true, width: 120},
  ];

  analyzerChartColumns = [
    {
      filter: true,
      isKey: true,
      key: 'name',
      label: 'Name',
      render: this.renderDashboardLink.bind(this),
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
      width: 350,
    },
    {
      filter: true,
      key: 'a_node_name',
      label: 'A-Node',
      sort: true,
      width: 140,
    },
    {
      filter: true,
      key: 'z_node_name',
      label: 'Z-Node',
      sort: true,
      width: 140,
    },
    {
      key: 'alive',
      label: 'Alive',
      render: this.renderStatusColor.bind(this),
      sort: true,
      width: 100,
    },
    {
      key: 'mcs',
      label: 'Avg MCS',
      render: cell => this.renderFloatPoint('mcs', cell),
      sort: true,
      width: 100,
    },
    {
      key: 'snr',
      label: 'Avg SNR',
      render: cell => this.renderFloatPoint('snr', cell),
      sort: true,
      width: 100,
    },
    {
      key: 'per',
      label: 'Avg PER',
      render: cell => this.renderFloatPoint('per', cell),
      sort: true,
      width: 100,
    },
    {
      key: 'tput',
      label: 'Avg tput(PPS)',
      render: cell => this.renderFloatPoint('tput', cell),
      sort: true,
      width: 100,
    },
    {
      key: 'txpower',
      label: 'Avg txPower',
      render: cell => this.renderFloatPoint('txpower', cell),
      sort: true,
      width: 100,
    },
    {
      key: 'fw_restarts',
      label: '#Restarts',
      render: cell => this.renderFloatPoint('fw_restarts', cell),
      sort: true,
      width: 100,
    },
    {
      key: 'uptime',
      label: 'Uptime (min)',
      render: cell => this.renderFloatPoint('uptime', cell),
      sort: true,
      width: 100,
    },
    {key: 'distance', label: 'Distance (m)', sort: true, width: 120},
  ];

  defaultChartColumns = [
    {
      filter: true,
      isKey: true,
      key: 'name',
      label: 'Name',
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
      width: 350,
    },
    {filter: true, key: 'a_node_name', label: 'A-Node', width: 180},
    {filter: true, key: 'z_node_name', label: 'Z-Node', width: 180},
    {
      key: 'alive',
      label: 'Alive',
      render: this.renderStatusColor.bind(this),
      sort: true,
      width: 100,
    },
    {
      key: 'alive_perc',
      label: 'Uptime (24 hours)',
      render: this.renderAlivePerc.bind(this),
      sort: true,
      width: 140,
    },
    {key: 'type', label: 'Type', width: 100},
    {key: 'linkup_attempts', label: 'Attempts', sort: true, width: 100},
    {key: 'distance', label: 'Distance (m)', sort: true, width: 120},
  ];

  headerHeight = 80;
  overscanRowCount = 10;

  constructor(props) {
    super(props);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
    this.linkSortFunc = this.linkSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
    this.getTableRowsAnalyzer = this.getTableRowsAnalyzer.bind(this);
  }

  componentDidMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
  }

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
          this.state.linkHealth.hasOwnProperty(link.name)
        ) {
          const linkHealth = this.state.linkHealth[link.name];
          link.alive_perc = linkHealth.alive;
          link.events = linkHealth.events;
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
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          selectedLink: payload.link.name,
          sortBy: payload.source === 'table' ? this.state.sortBy : 'name',
          sortDirection:
            payload.source === 'table'
              ? this.state.sortDirection
              : SortDirection.ASC,
          topLink:
            payload.source === 'table' ? this.state.topLink : payload.link,
        });
        break;
      case Actions.LINK_HEALTH_REFRESHED:
        this.setState({
          linkHealth: payload.linkHealth,
        });
        break;
      case Actions.ANALYZER_REFRESHED:
        this.setState({
          analyzerTable: payload.analyzerTable,
        });
        break;
    }
  }

  linkSortFuncHelper(a, b, order) {
    if (order === SortDirection.DESC) {
      if (a.name > b.name) {
        return -1;
      } else if (a.name < b.name) {
        return 1;
      }
      // both entries have the same name, sort based on a/z node name
      if (a.a_node_name > a.z_node_name) {
        return -1;
      } else {
        return 1;
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
        return 1;
      }
    }
  }

  linkSortFunc(a, b, order) {
    // order is desc or asc
    if (this.state.topLink) {
      if (a.name === this.state.topLink.name) {
        if (a.name === b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return -1;
        }
      } else if (b.name === this.state.topLink.name) {
        if (a.name === b.name) {
          return this.linkSortFuncHelper(a, b, order);
        } else {
          return 1;
        }
      }
    }
    return this.linkSortFuncHelper(a, b, order);
  }

  formatAnalyzerValue(obj, propertyName) {
    return obj.hasOwnProperty(propertyName)
      ? obj[propertyName] === INVALID_VALUE
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
      const linkupAttempts = link.linkup_attempts || 0;
      if (link.link_type === 2 && this.state.hideWired) {
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
        aNode.node_type === 2 &&
        zNode.node_type === 2
      ) {
        // skip since it's DN to DN
        return;
      }
      rows.push({
        a_node_name: link.a_node_name,
        alive: link.is_alive,
        alive_perc: link.alive_perc,
        distance: link.distance,
        linkup_attempts: linkupAttempts,
        name: link.name,
        type: link.link_type === LinkType.WIRELESS ? 'Wireless' : 'Wired',
        z_node_name: link.z_node_name,
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
      return rows;
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
        aNode.node_type === 2 &&
        zNode.node_type === 2
      ) {
        // skip since it's DN to DN
        return;
      }

      // this is the A->Z link
      rows.push({
        a_node_name: link.a_node_name,
        alive: link.is_alive,
        alive_perc: link.alive_perc,
        distance: link.distance,
        fw_restarts: analyzerLinkA.flaps,
        mcs: this.formatAnalyzerValue(analyzerLinkA, 'avgmcs'),
        name: link.name,
        per: this.formatAnalyzerValue(analyzerLinkA, 'avgper'),
        snr: this.formatAnalyzerValue(analyzerLinkZ, 'avgsnr'),
        tput: this.formatAnalyzerValue(analyzerLinkA, 'tput'),
        txpower: this.formatAnalyzerValue(analyzerLinkA, 'avgtxpower'),
        type: link.link_type === LinkType.WIRELESS ? 'Wireless' : 'Wired',
        uptime: analyzerLinkA.uptime / 60.0,
        z_node_name: link.z_node_name,
      });
      // this is the Z->A link
      rows.push({
        a_node_name: link.z_node_name,
        alive: link.is_alive,
        alive_perc: link.alive_perc,
        distance: link.distance,
        fw_restarts: analyzerLinkZ.flaps,
        mcs: this.formatAnalyzerValue(analyzerLinkZ, 'avgmcs'),
        name: link.name,
        per: this.formatAnalyzerValue(analyzerLinkZ, 'avgper'),
        snr: this.formatAnalyzerValue(analyzerLinkA, 'avgsnr'),
        tput: this.formatAnalyzerValue(analyzerLinkZ, 'tput'),
        txpower: this.formatAnalyzerValue(analyzerLinkZ, 'avgtxpower'),
        type: link.link_type === LinkType.WIRELESS ? 'Wireless' : 'Wired',
        uptime: analyzerLinkZ.uptime / 60.0,
        z_node_name: link.a_node_name,
      });
    });
    return rows;
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

  renderLinkName(cell, row) {
    return <span>{cell}</span>;
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
  renderScubaLink(a_node_name, z_node_name, startTms, endTms) {
    const aNode = this.nodesByName[a_node_name];
    const zNode = this.nodesByName[z_node_name];
    if (!aNode || !zNode) {
      return null;
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
    // nothing to display if non-internal
    if (
      !this.props.instance.hasOwnProperty('fbinternal') ||
      !this.props.instance.fbinternal
    ) {
      return null;
    }
    // if the field doesn't exist, don't display the link
    if (
      !this.nodesByName.hasOwnProperty(row.a_node_name) ||
      !this.nodesByName.hasOwnProperty(row.z_node_name)
    ) {
      return null;
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

    return (
      <span>
        {cell}
        <a href={scubaURL} target="_new">
          <div className="table-button">Scuba</div>
        </a>
        <a href={odsURL} target="_new">
          <div className="table-button">ODS</div>
        </a>
      </span>
    );
  }

  renderAlivePerc(cell, row) {
    let cellColor = 'red';
    let cellText = '-';
    if (row.type === 'Wired') {
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
  renderFloatPoint = (tpxx, cell, row) => {
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
  };

  renderLinkAvailability(cell, row, style) {
    if (row && row.name) {
      const link = this.linksByName[row.name];
      const res = [];
      if (link && link.events && link.events.length > 0) {
        const startTime = this.state.linkHealth.startTime;
        const endTime = this.state.linkHealth.endTime;
        return (
          <ReactEventChart
            events={link.events}
            startTime={startTime}
            endTime={endTime}
            size={'small'}
            width={style.width - 10}
            height={style.height - 10}
          />
        );
      }
      return res;
    }
    return null;
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {cell ? 'Yes' : 'No'}
      </span>
    );
  }

  onSortChange(sortBy, sortDirection) {
    this.setState({
      sortBy,
      sortDirection,
      topLink: sortBy == 'name' ? this.state.topLink : null,
    });
  }

  renderLinksTable() {
    let adjustedHeight = this.props.height - 40;
    adjustedHeight = adjustedHeight < 0 ? 0 : adjustedHeight;
    const selected = this.state.selectedLink ? [this.state.selectedLink] : [];

    let rowHeight = 50;
    let columns = this.defaultChartColumns;
    let data;

    if (this.state.showAnalyzer) {
      rowHeight = 50;
      columns = this.analyzerChartColumns;
      data = this.getTableRowsAnalyzer();
    } else if (this.state.showEventsChart) {
      rowHeight = 80;
      columns = this.eventChartColumns;
      data = this.getTableRows();
    } else {
      rowHeight = 50;
      columns = this.defaultChartColumns;
      data = this.getTableRows();
    }

    return (
      <CustomTable
        rowHeight={rowHeight}
        headerHeight={this.headerHeight}
        height={adjustedHeight}
        overscanRowCount={this.overscanRowCount}
        columns={columns}
        data={data}
        sortBy={this.state.sortBy}
        sortDirection={this.state.sortDirection}
        onRowSelect={row => this.tableOnRowSelect(row)}
        onSortChange={(sortBy, sortDirection) =>
          this.onSortChange(sortBy, sortDirection)
        }
        selected={selected}
      />
    );
  }

  render() {
    // update topology to health mappings
    this.updateMappings(this.props.topology);
    // render display with or without events chart
    const linksTable = this.renderLinksTable();
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
                showAnalyzer: false,
                showEventsChart: !this.state.showEventsChart,
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
              })
            }>
            Link Stats
          </button>
          {linksTable}
        </li>
      </ul>
    );
  }
}
NetworkLinksTable.propTypes = {
  topology: PropTypes.object.isRequired,
};
