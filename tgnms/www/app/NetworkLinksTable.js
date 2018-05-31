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
import React from 'react';
import CustomTable from './components/common/CustomTable.js';
import {SortDirection} from 'react-virtualized';

const SECONDS_HOUR = 60 * 60;
const SECONDS_DAY = SECONDS_HOUR * 24;
const INVALID_VALUE = 255;

export default class NetworkLinksTable extends React.Component {
  linksByName = {};
  nodesByName = {};

  state = {
    selectedLink: NetworkStore.selectedName,
    linkHealth: NetworkStore.linkHealth,
    analyzerTable: NetworkStore.analyzerTable,
    hideWired: true,
    showEventsChart: true,
    hideDnToDnLinks: false,
    topLink: null,
    showAnalyzer: false,
    sortBy: null,
    sortDirection: SortDirection.ASC,
  };

  eventChartColumns = [
    {
      label: 'Name',
      key: 'name',
      isKey: true,
      width: 400,
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
      filter: true,
      render: this.renderNameWithStatsLinks.bind(this),
    },
    {
      label: 'Alive',
      key: 'alive',
      width: 100,
      sort: true,
      render: this.renderStatusColor.bind(this),
    },
    {
      label: 'Uptime (24 hours)',
      key: 'alive_perc',
      width: 120,
      sort: true,
      render: this.renderAlivePerc.bind(this),
    },
    {
      label: 'Availability (24 hours)',
      key: 'availability_chart',
      width: 810,
      sort: true,
      render: this.renderLinkAvailability.bind(this),
    },
    {label: 'Attempts', key: 'linkup_attempts', width: 100, sort: true},
    {label: 'Distance (m)', key: 'distance', width: 120, sort: true},
  ];

  analyzerChartColumns = [
    {
      label: 'Name',
      key: 'name',
      isKey: true,
      width: 350,
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
      filter: true,
      render: this.renderDashboardLink.bind(this),
    },
    {label: 'A-Node', key: 'a_node_name', width: 140, sort: true, filter: true},
    {label: 'Z-Node', key: 'z_node_name', width: 140, sort: true, filter: true},
    {
      label: 'Alive',
      key: 'alive',
      width: 100,
      sort: true,
      render: this.renderStatusColor.bind(this),
    },
    {
      label: 'Avg MCS',
      key: 'mcs',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'mcs'),
    },
    {
      label: 'Avg SNR',
      key: 'snr',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'snr'),
    },
    {
      label: 'Avg PER',
      key: 'per',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'per'),
    },
    {
      label: 'Avg tput(PPS)',
      key: 'tput',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'tputPPS'),
    },
    {
      label: 'Avg txPower',
      key: 'txpower',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'txpower'),
    },
    {
      label: '#Restarts',
      key: 'fw_restarts',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'fw_restarts'),
    },
    {
      label: 'Uptime (min)',
      key: 'uptime',
      width: 100,
      sort: true,
      render: this.renderFloatPointWrapper.bind(this, 'uptime'),
    },
    {label: 'Distance (m)', key: 'distance', width: 120, sort: true},
  ];

  defaultChartColumns = [
    {
      label: 'Name',
      key: 'name',
      isKey: true,
      width: 350,
      sort: true,
      sortFunc: this.linkSortFunc.bind(this),
      filter: true,
    },
    {label: 'A-Node', key: 'a_node_name', width: 180, filter: true},
    {label: 'Z-Node', key: 'z_node_name', width: 180, filter: true},
    {
      label: 'Alive',
      key: 'alive',
      width: 100,
      sort: true,
      render: this.renderStatusColor.bind(this),
    },
    {
      label: 'Uptime (24 hours)',
      key: 'alive_perc',
      width: 140,
      sort: true,
      render: this.renderAlivePerc.bind(this),
    },
    {label: 'Type', key: 'type', width: 100},
    {label: 'Attempts', key: 'linkup_attempts', width: 100, sort: true},
    {label: 'Distance (m)', key: 'distance', width: 120, sort: true},
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
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          sortBy: payload.source === 'table' ? this.state.sortBy : 'name',
          sortDirection:
            payload.source === 'table'
              ? this.state.sortDirection
              : SortDirection.ASC,
          topLink:
            payload.source === 'table' ? this.state.topLink : payload.link,
          selectedLink: payload.link.name,
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
    return propertyName in obj
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
      let linkupAttempts = 0;
      if (link.linkup_attempts && link.linkup_attempts.buffer) {
        const buf = Buffer.from(link.linkup_attempts.buffer.data);
        linkupAttempts = parseInt(buf.readUIntBE(0, 8).toString(), 10);
      }
      if (link.link_type === 2 && this.state.hideWired) {
        return;
      }
      // check if either side of the node is a CN
      if (
        !(link.a_node_name in this.nodesByName) ||
        !(link.z_node_name in this.nodesByName)
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
        name: link.name,
        a_node_name: link.a_node_name,
        z_node_name: link.z_node_name,
        alive: link.is_alive,
        type: link.link_type === 1 ? 'Wireless' : 'Wired',
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
      return rows;
    }
    Object.keys(this.linksByName).forEach(linkName => {
      const link = this.linksByName[linkName];
      if (!this.state.analyzerTable || !this.state.analyzerTable.metrics) {
        return;
      }
      const analyzerLink =
        linkName in this.state.analyzerTable.metrics
          ? this.state.analyzerTable.metrics[linkName]
          : [];
      const analyzerLinkA = 'A' in analyzerLink ? analyzerLink.A : analyzerLink;
      const analyzerLinkZ = 'Z' in analyzerLink ? analyzerLink.Z : analyzerLink;
      if (link.link_type === 2 && this.state.hideWired) {
        return;
      }
      // check if either side of the node is a CN
      if (
        !(link.a_node_name in this.nodesByName) ||
        !(link.z_node_name in this.nodesByName)
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
        name: link.name,
        a_node_name: link.a_node_name,
        z_node_name: link.z_node_name,
        alive: link.is_alive,
        type: link.link_type === 1 ? 'Wireless' : 'Wired',
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
        type: link.link_type === 1 ? 'Wireless' : 'Wired',
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

  tableOnRowSelect(row, isSelected) {
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: this.linksByName[row.name],
      source: 'table',
    });
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
              nodeRestrictor: row.name,
              viewName: 'stats',
            });
          }}>
          Link
        </span>
        <span
          style={linkStyle}
          onClick={click => {
            Dispatcher.dispatch({
              actionType: Actions.VIEW_SELECTED,
              nodeRestrictor: [row.a_node_name, row.z_node_name].join(','),
              viewName: 'stats',
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
  renderODSLink(row) {
    const aNode = this.nodesByName[row.a_node_name];
    const zNode = this.nodesByName[row.z_node_name];
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
  renderScubaLink(row) {
    const aNode = this.nodesByName[row.a_node_name];
    const zNode = this.nodesByName[row.z_node_name];
    if (!aNode || !zNode) {
      return null;
    }
    const now = new Date();
    // put in a two minute window because it takes some time for data to
    // reach Scuba
    const endTms = now.getTime() - 120 * 1000; // ms since 1970
    const endTs = (endTms / 1000.0).toFixed(0);
    const startTms = endTms - (SECONDS_HOUR - 120) * 1000;
    const startTs = (startTms / 1000.0).toFixed(0);

    const url =
      'https://our.intern.facebook.com/intern/network/terragraph/link_log/?';
    const node_a = 'node_a=' + aNode.mac_addr;
    const node_z = '&node_z=' + zNode.mac_addr;

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
      !(row.a_node_name in this.nodesByName) ||
      !(row.z_node_name in this.nodesByName)
    ) {
      return null;
    }
    const scubaURL = this.renderScubaLink(row);
    const odsURL = this.renderODSLink(row);

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

  renderFloatPointWrapper(tpxx, cell, row) {
    return this.renderFloatPoint(cell, row, tpxx);
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

  renderLinkAvailability(cell, row, style) {
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
            width={style.width - 10}
            height={style.height - 10}
          />
        );
      }
    }
    return null;
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {'' + cell}
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

    if (this.state.showAnalyzer) {
      return (
        <CustomTable
          rowHeight={50}
          headerHeight={this.headerHeight}
          height={adjustedHeight}
          overscanRowCount={this.overscanRowCount}
          columns={this.analyzerChartColumns}
          data={this.getTableRowsAnalyzer()}
          sortBy={this.state.sortBy}
          sortDirection={this.state.sortDirection}
          onRowSelect={row => this.tableOnRowSelect(row)}
          onSortChange={(sortBy, sortDirection) =>
            this.onSortChange(sortBy, sortDirection)
          }
          selected={selected}
        />
      );
    } else if (this.state.showEventsChart) {
      return (
        <CustomTable
          rowHeight={80}
          headerHeight={this.headerHeight}
          height={adjustedHeight}
          overscanRowCount={this.overscanRowCount}
          columns={this.eventChartColumns}
          data={this.getTableRows()}
          sortBy={this.state.sortBy}
          sortDirection={this.state.sortDirection}
          onRowSelect={row => this.tableOnRowSelect(row)}
          onSortChange={(sortBy, sortDirection) =>
            this.onSortChange(sortBy, sortDirection)
          }
          selected={selected}
        />
      );
    } else {
      return (
        <CustomTable
          rowHeight={50}
          headerHeight={this.headerHeight}
          height={adjustedHeight}
          overscanRowCount={this.overscanRowCount}
          columns={this.defaultChartColumns}
          data={this.getTableRows()}
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
  }

  render() {
    // update topology to health mappings
    this.updateMappings(this.props.topology);
    // render display with or without events chart
    const linksTable = this.renderLinksTable();
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
                showAnalyzer: !this.state.showAnalyzer,
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
