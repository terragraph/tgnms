/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';
import Dispatcher from './NetworkDispatcher.js';
import {
  availabilityColor,
  variableColorDown,
  variableColorUp,
} from './helpers/NetworkHelpers.js';
import ReactEventChart from './ReactEventChart.js';
// dispatcher
import {Actions} from './constants/NetworkConstants.js';
import axios from 'axios';
import NetworkStore from './stores/NetworkStore.js';
import equals from 'equals';
import PropTypes from 'prop-types';
import Select from 'react-select';
import CustomTable from './components/common/CustomTable.js';
import {render} from 'react-dom';
import React from 'react';
import ReactPlotlyHeatmap from './ReactPlotlyHeatmap.js';

const HEATMAPSIZE = 64;
const WIRELESS = 1;
const WIRED = 2;

// ScanType, ScanMode, ScanSubType and ScanFwStatus are defined in Controller.thrift
// (is there a way to use them directly from Controller.thrift?)
const ScanType = {
  PBF: 1,
  IM: 2,
  RTCAL: 3,
  CBF_TX: 4,
  CBF_RX: 5,
};

const ScanMode = {
  COARSE: 1,
  FINE: 2,
  SELECTIVE: 3,
  RELATIVE: 4, // Relative to the last Azimuth beam selected by FWtx
};

// SubType for Runtime Calibration and CBF
const ScanSubType = {
  NO_CAL: 0, // No calibration, init state
  TOP_RX_CAL: 1, // Top Panel, responder Rx cal with fixed intiator Tx beam
  TOP_TX_CAL: 2, // Top Panel, intiator Tx cal with fixed responder Rx beam
  BOT_RX_CAL: 3, // Bot Panel, responder Rx cal with fixed intiator Tx beam
  BOT_TX_CAL: 4, // Bot Panel, intiator Tx cal with fixed responder Rx beam
  VBS_RX_CAL: 5, // Top + Bot, responder Rx cal with fixed intiator Tx beam
  VBS_TX_CAL: 6, // Top + Bot, intiator Tx cal with fixed responder Rx beam
  RX_CBF_AGGRESSOR: 7, // RX Coordinated BF Nulling, Aggressor link
  RX_CBF_VICTIM: 8, // RX Coordinated BF Nulling, Victim link
  TX_CBF_AGGRESSOR: 9, // TX Coordinated BF Nulling, Aggressor link
  TX_CBF_VICTIM: 10, // TX Coordinated BF Nulling, Victim link
};

const ScanFwStatus = {
  COMPLETE: 0,
  INVALID_TYPE: 1,
  INVALID_START_TSF: 2,
  INVALID_STA: 3,
  AWV_IN_PROG: 4,
  STA_NOT_ASSOC: 5,
  REQ_BUFFER_FULL: 6,
  LINK_SHUT_DOWN: 7,
  UNSPECIFIED_ERROR: 8,
  UNEXPECTED_ERROR: 9,
  EXPIRED_TSF: 10,
  INCOMPL_RTCAL_BEAMS_FOR_VBS: 11,
};

const scanTypeOptions = [
  {value: ScanType.PBF, label: 'PBF'},
  {value: ScanType.IM, label: 'IM'},
  {value: ScanType.RTCAL, label: 'RTCAL'},
  {value: ScanType.CBF_TX, label: 'CBF Tx'},
  {value: ScanType.CBF_RX, label: 'CBF Rx'},
];

const combinedStatusOptions = [
  {value: 0, label: 'no errors'},
  {value: 1, label: 'errors found'},
];

const newBeamApplyOptions = [
  {value: 0, label: 'no beam change'},
  {value: 1, label: 'beam changed'},
];

export default class NetworkScans extends React.Component {
  nodesByName = {};
  linksByName = {};
  linkNameList = {};
  nodeNameList = {};
  sqlFields = {};
  filterSource = 'dropdown';
  state = {
    scanResults: NetworkStore.scanResults,
    zmap: [],
    txXY: [],
    rxXY: undefined,
    oldNewBeams: undefined,
    nodeToLinkName: undefined,
    selectedLink: NetworkStore.selectedName,
    selectedNode: null,
    sortName: 'link_name',
    sortOrder: 'asc',
    topLink: null,
    heatmaprender: true,
    heatmaptitle: {},
    nodeSelectOptions: [],

    nodeSelected: [],
    scanTypeSelected: [],
    combinedStatusSelected: null,
    newBeamSelected: null,
  };
  headerHeight = 80;
  overscanRowCount = 10;
  maxRowsScanResults = 200;
  scanResultsRefreshed = true;

  scanChartDescription = [
    {
      label: 'time',
      key: 'time',
      hidden: false,
      isKey: false,
      width: 150,
      filter: false,
      sort: true,
      sqlfield: 'timestamp',
    },
    {
      label: 'tx node name',
      key: 'tx_node_name',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'tx_node_name',
    },
    {
      label: 'rx node name',
      key: 'rx_node_name',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'rx_node_name',
    },
    {
      label: 'scan type',
      key: 'scan_type',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'scan_type',
    },
    {
      label: 'scan subtype',
      key: 'scan_sub_type',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'scan_sub_type',
    },
    {
      label: 'mode',
      key: 'scan_mode',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'scan_mode',
    },
    {
      label: 'apply flag',
      key: 'apply_flag',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'apply_flag',
    },
    {
      label: 'new beam',
      key: 'new_beam',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'new_beam_flag',
    },
    {
      label: 'token',
      key: 'token',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'token',
    },
    {
      label: 'resp id',
      key: 'resp_id',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'resp_id',
    },
    {
      label: 'tx power',
      key: 'tx_power',
      hidden: false,
      isKey: false,
      width: 150,
      filter: false,
      sort: true,
      sqlfield: 'tx_power',
    },
    {
      label: 'status (combined)',
      key: 'combined_status',
      hidden: false,
      isKey: false,
      width: 150,
      filter: true,
      sort: true,
      sqlfield: 'combined_status',
    },
    {
      label: 'network',
      key: 'network',
      hidden: true,
      isKey: false,
      width: 150,
      filter: false,
      sort: false,
      sqlfield: 'network',
    },
    {
      label: 'rxid',
      key: 'rxid',
      hidden: true,
      isKey: false,
      width: 150,
      filter: false,
      sort: false,
      sqlfield: 'rx_scan_results.id',
    },
  ];

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    const nodeToLinkName = this.updateNodeToLinkMapping(this.props.topology);
    const nodeSelectOptions = this.createNodeSelectOptions(
      this.props.topology.nodes,
    );
    this.createSqlFields();
    this.fetchScanResultsConcise();
    this.setState({
      nodeToLinkName,
      nodeSelectOptions,
    });
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        const nodeToLinkName = this.updateNodeToLinkMapping(
          this.props.topology,
        );
        const nodeSelectOptions = this.createNodeSelectOptions(
          this.props.topology.nodes,
        );
        this.fetchScanResultsConcise();
        this.setState({
          nodeToLinkName, // TODO: why is nodeToLinkName stored as state but others are stored as globals?
          heatmaprender: false,
          nodeSelectOptions,
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedLink: null,
          selectedNode: null,
        });
        break;
      case Actions.LINK_SELECTED:
        if (payload.source === 'map') {
          this.setState({
            selectedLink: payload.link.name,
            heatmaprender: false,
            topLink: payload.link,
          });

          // fill in the table filter with the selected link
          this.filterSource = 'map';
          this.refs.linkName.applyFilter(payload.link.name);
          this.filterSource = 'map';
          this.refs.txNodeName.cleanFiltered();
        }
        break;
      case Actions.NODE_SELECTED:
        if (payload.source === 'map') {
          this.setState({
            selectedNode: payload.nodeSelected,
            selectedLink: null,
            heatmaprender: false,
          });
          // fill in the table filter with the selected node
          this.filterSource = 'map';
          this.refs.txNodeName.applyFilter(payload.nodeSelected);
          this.filterSource = 'map';
          this.refs.linkName.cleanFiltered();
        }
        break;
    }
  }

  // for convenience
  createSqlFields = () => {
    this.scanChartDescription.forEach(scanChartCol => {
      this.sqlFields[scanChartCol.key] = scanChartCol.sqlfield;
    });
  };

  // function to create the pull-down menu for react-select for the nodes
  // input is Topology.nodes from Topology.thrift
  createNodeSelectOptions = nodes => {
    const reactSelectOptions = [];
    nodes.forEach(node => {
      const reactSelectOption = {
        value: node.name,
        label: node.name,
      };
      reactSelectOptions.push(reactSelectOption);
    });
    return reactSelectOptions;
  };

  // helper function to create a comma separated list needed for mySQL search
  scanFilterCommaSeparatedList = (selected, isString) => {
    // selected is an array of objects with {value: <value>} (and other
    // fields we don't care about here)
    const valueArray = isString
      ? selected.map(obj => "'" + obj.value + "'")
      : selected.map(obj => obj.value);
    return valueArray.join(',');
  };
  // helper function called in createScanFilter - prevents bunch of
  // copy/paste code in createConciseScanFilterPullDown
  createScanFilterHelper = (sqlFieldName, commaSeparatedList, filter) => {
    if (filter.length > 0) {
      filter += ' AND ';
    }
    filter += sqlFieldName + ' IN (' + commaSeparatedList + ')';
    return filter;
  };

  createScanFilterHelperGt = (sqlFieldName, val, filter) => {
    if (filter.length > 0) {
      filter += ' AND ';
    }
    return (filter += val ? sqlFieldName + '>0' : sqlFieldName + '=0');
  };

  // function creates mySQL filter based on pull-down selection
  createConciseScanFilterPullDown = () => {
    // filter is an AND of all pull downs (OR of the rx and tx node names)
    let filter = '';
    if (this.state.nodeSelected.length) {
      filter +=
        '(' +
        this.sqlFields.tx_node_name +
        ' IN (' +
        this.scanFilterCommaSeparatedList(this.state.nodeSelected, true) +
        ')' +
        ' OR ' +
        this.sqlFields.rx_node_name +
        ' IN (' +
        this.scanFilterCommaSeparatedList(this.state.nodeSelected, true) +
        '))';
    }
    if (this.state.scanTypeSelected.length) {
      filter += this.createScanFilterHelper(
        this.sqlFields.scan_type,
        this.scanFilterCommaSeparatedList(this.state.scanTypeSelected, false),
        filter,
      );
    }
    if (this.state.combinedStatusSelected !== null) {
      filter += this.createScanFilterHelperGt(
        this.sqlFields.combined_status,
        this.state.combinedStatusSelected.value,
        filter,
      );
    }
    if (this.state.newBeamSelected !== null) {
      filter += this.createScanFilterHelperGt(
        this.sqlFields.new_beam,
        this.state.newBeamSelected.value,
        filter,
      );
    }
    const sqlfilter = {};
    sqlfilter.whereClause = filter;
    sqlfilter.isConcise = true;
    sqlfilter.rowCount = this.maxRowsScanResults;
    sqlfilter.offset = 0;
    return sqlfilter;
  };

  // function creates mySQL filter based on row selection
  createScanFilterRowSelect = rxid => {
    const filter = this.sqlFields.rxid + '=' + rxid;

    const sqlfilter = {};
    sqlfilter.whereClause = filter;
    sqlfilter.isConcise = false;
    sqlfilter.rowCount = 1;
    sqlfilter.offset = 0;
    return sqlfilter;
  };

  // callback functions for when users makes pull-down selection
  onNodeSelected = event => {
    this.setState({nodeSelected: event});
  };

  onScanTypeSelected = event => {
    this.setState({scanTypeSelected: event});
  };

  onCombinedStatusSelected = event => {
    this.setState({combinedStatusSelected: event});
  };

  onNewBeamSelected = event => {
    this.setState({newBeamSelected: event});
  };

  // fetch scan results
  fetchScanResultsConcise = () => {
    const sqlfilter = this.createConciseScanFilterPullDown();
    axios
      .post(
        '/metrics/scan_results?topology=' + this.props.topology.name,
        sqlfilter,
      )
      .then(response => {
        this.scanResultsRefreshed = true;
        this.setState({
          scanResults: response.data,
        });
      })
      .catch(err => {
        console.error('Error getting concise scan results', err);
        this.setState({
          scanResults: null,
        });
      });
  };

  // render pull-down buttons to filter mysql request and fetch button
  // to fetch the filtered results
  renderSelectButtons = () => {
    const {nodeSelectOptions} = this.state;
    return (
      <div className="scan-select-list">
        <div className="scan-select">
          <p>Node</p>
          <Select
            name="node-select"
            value={this.state.nodeSelected} // initial value
            onChange={this.onNodeSelected} // function to call when changed
            options={nodeSelectOptions} // pull-down options
            placeholder="Select node(s)"
            multi
            closeOnSelect={false}
          />
        </div>
        <div className="scan-select">
          <p>Scan Type</p>
          <Select
            name="scan-type-select"
            value={this.state.scanTypeSelected} // initial value
            onChange={this.onScanTypeSelected} // function to call when changed
            options={scanTypeOptions} // pull-down options
            placeholder="Select scan type(s)"
            multi
            closeOnSelect={false}
          />
        </div>
        <div className="scan-select">
          <p>Error Event</p>
          <Select
            name="combined-status-select"
            value={this.state.combinedStatusSelected} // initial value
            onChange={this.onCombinedStatusSelected} // function to call when changed
            options={combinedStatusOptions} // pull-down options
            placeholder="Filter on scans that had errors"
          />
        </div>
        <div className="scan-select">
          <p>New Beam</p>
          <Select
            name="new-beam-status-select"
            value={this.state.newBeamSelected} // initial value
            onChange={this.onNewBeamSelected} // function to call when changed
            options={newBeamApplyOptions} // pull-down options
            placeholder="Filter on whether beam changed"
          />
        </div>
      </div>
    );
  };

  renderFetchButton = () => {
    return (
      <button
        className="graph-button-fetch"
        onClick={this.fetchScanResultsConcise}>
        Fetch new scan results
      </button>
    );
  };

  // mapping from node to link for wireless links
  updateNodeToLinkMapping = topology => {
    this.linksByName = {};
    const nodeToLinkName = {};
    if (topology.links) {
      topology.links.forEach(link => {
        if (link.link_type === WIRELESS) {
          nodeToLinkName[link.a_node_name] = link.name;
          nodeToLinkName[link.z_node_name] = link.name;
        }
        this.linksByName[link.name] = link;
        this.linkNameList[link.name] = link.name;
      });
    }
    if (topology.nodes) {
      topology.nodes.forEach(node => {
        this.nodeNameList[node.name] = node.name;
      });
    }
    return nodeToLinkName;
  };

  // 2D results for PBF and IM scans
  createHeatmapArrayPbfIm = (
    rx_scan_resp,
    tx_scan_resp,
    scan_type,
    scan_mode,
  ) => {
    const routeInfoList = rx_scan_resp.routeInfoList;

    const oldNewBeams = [
      rx_scan_resp.oldBeam,
      tx_scan_resp.oldBeam,
      rx_scan_resp.newBeam,
      tx_scan_resp.newBeam,
    ];

    if (scan_type === ScanType.PBF) {
      // beam indices from left to right: [63, 62, ... 32, 0, 1, ... 31]
      // corresponding to [-32 ... -1, 0, 1, ... 31]
      oldNewBeams.forEach((beam, idx, arr) => {
        arr[idx] = beam >= 32 ? 63 - beam : beam + 32;
        arr[idx] -= 32;
      });
    }

    let minTxIndex = 0;
    let minRxIndex = 0;
    let txXY = [];
    let rxXY = [];

    if (scan_mode === ScanMode.RELATIVE) {
      const oldTxBeam = oldNewBeams[1];
      const oldRxBeam = oldNewBeams[0];
      txXY = Array.from(new Array(3), (val, index) => index + oldTxBeam - 1);
      rxXY = Array.from(new Array(3), (val, index) => index + oldRxBeam - 1);
      minTxIndex = oldTxBeam + 32 - 1;
      minRxIndex = oldRxBeam + 32 - 1;
    } else {
      txXY = Array.from(new Array(64), (val, index) => index - 32);
      rxXY = Array.from(new Array(64), (val, index) => index - 32);
    }

    const zmap = [[]]; // 2D array
    const zmapCount = [[]]; // for averaging

    for (const i in routeInfoList) {
      if (!routeInfoList[i].route) {
        console.error(
          'routeInfoList error, routeInfoList[',
          i,
          ']:',
          routeInfoList[i],
        );
        continue;
      }
      const txRoute = routeInfoList[i].route.tx;
      const rxRoute = routeInfoList[i].route.rx;

      // beam indices from left to right: [63, 62, ... 32, 0, 1, ... 31]
      const txIndex = txRoute >= 32 ? 63 - txRoute : txRoute + 32;
      const rxIndex = rxRoute >= 32 ? 63 - rxRoute : rxRoute + 32;

      // relative PBF scans are +/- 1 around the old beam
      const arrRxIndex = rxIndex - minRxIndex;
      const arrTxIndex = txIndex - minTxIndex;

      // txIndex is along the x-axis
      if (!zmap[arrRxIndex]) {
        zmap[arrRxIndex] = [];
        zmapCount[arrRxIndex] = [];
      }
      if (!zmap[arrRxIndex][arrTxIndex]) {
        zmap[arrRxIndex][arrTxIndex] = routeInfoList[i].snrEst;
        zmapCount[arrRxIndex][arrTxIndex] = 1;
      } else {
        zmap[arrRxIndex][arrTxIndex] += routeInfoList[i].snrEst;
        zmapCount[arrRxIndex][arrTxIndex] += 1;
      }
    }

    if (routeInfoList.length) {
      // do averaging
      for (let rxIndex = 0; rxIndex < zmap.length; rxIndex++) {
        if (zmap[rxIndex]) {
          for (let txIndex = 0; txIndex < zmap[rxIndex].length; txIndex++) {
            if (zmap[rxIndex][txIndex]) {
              zmap[rxIndex][txIndex] /= zmapCount[rxIndex][txIndex];
            }
          }
        }
      }

      const arrLength = scan_mode === ScanMode.RELATIVE ? 3 : 64;

      // plotly is not happy unless every array is defined
      for (let i = 0; i < arrLength; i++) {
        if (!zmap[i]) {
          zmap[i] = [];
        }
      }
      zmap[arrLength - 1].length = arrLength;
    }
    return {zmap, txXY, rxXY, oldNewBeams};
  };

  // RTCAL does a 1D scan of either TX or RX (not both)
  createHeatmapArrayRtcal = (
    rx_scan_resp,
    tx_scan_resp,
    scan_type,
    scan_sub_type,
  ) => {
    const routeInfoList = rx_scan_resp.routeInfoList;

    const oldNewBeams = [
      rx_scan_resp.oldBeam,
      tx_scan_resp.oldBeam,
      rx_scan_resp.newBeam,
      tx_scan_resp.newBeam,
    ];

    const zmap = [];
    const zmapCount = []; // for averaging
    let routeFixed = [];
    const minindex = 64;
    const arrlength = 64;

    for (const i in routeInfoList) {
      if (!routeInfoList[i].route) {
        console.error(
          'routeInfoList error, routeInfoList[',
          i,
          ']:',
          routeInfoList[i],
        );
        continue;
      }

      let route = 0;
      if (
        scan_sub_type == ScanSubType.TOP_TX_CAL ||
        scan_sub_type == ScanSubType.BOT_TX_CAL
      ) {
        route = routeInfoList[i].route.tx;
        routeFixed = [routeInfoList[i].route.rx]; // should all be the same
      } else if (
        scan_sub_type == ScanSubType.TOP_RX_CAL ||
        scan_sub_type == ScanSubType.BOT_RX_CAL
      ) {
        route = routeInfoList[i].route.rx;
        routeFixed = [routeInfoList[i].route.tx]; // should all be the same
      } else {
        // not supported at this time
        return {
          zmap: undefined,
          txXY: undefined,
          rxXY: undefined,
          oldNewBeams: undefined,
        };
      }

      const adjRoute = route - minindex;
      if (!zmap[adjRoute]) {
        zmap[adjRoute] = routeInfoList[i].snrEst;
        zmapCount[adjRoute] = 1;
      } else {
        zmap[adjRoute] += routeInfoList[i].snrEst;
        zmapCount[adjRoute] += 1;
      }
    }

    // do averaging
    for (let index = 0; index < arrlength; index++) {
      if (zmap[index]) {
        zmap[index] /= zmapCount[index];
      } else {
        zmap[index] = undefined;
      }
    }

    const xy = Array.from(new Array(arrlength), (val, index) => index);
    return {zmap, txXY: xy, rxXY: undefined, oldNewBeams};
  };

  getTableRows = () => {
    const rows = [];
    if (!this.state.scanResults || !this.state.scanResults.results) {
      return rows;
    }

    try {
      this.state.scanResults.results.forEach(scanResult => {
        if (scanResult) {
          // format some of the scan results for the table
          if (this.scanResultsRefreshed) {
            try {
              scanResult.timestamp = scanResult.timestamp
                .replace('T', ' ')
                .replace('.000Z', '');
              scanResult.scan_type = Object.keys(ScanType).find(
                key => ScanType[key] === scanResult.scan_type,
              );
              scanResult.scan_sub_type = Object.keys(ScanSubType).find(
                key => ScanSubType[key] === scanResult.scan_sub_type,
              );
              scanResult.scan_mode = Object.keys(ScanMode).find(
                key => ScanMode[key] === scanResult.scan_mode,
              );
              scanResult.apply_flag = scanResult.apply_flag ? 'true' : 'false';
              scanResult.new_beam_flag = scanResult.new_beam_flag
                ? 'true'
                : 'false';
              scanResult.combined_status =
                scanResult.combined_status === 0 ? 'OK' : 'error';
            } catch (e) {
              console.error(
                'Error formatting scan results (likely missing row) ',
                e,
              );
            }
          }

          const tableRow = [];
          this.scanChartDescription.forEach(scanChartCol => {
            if (scanResult.hasOwnProperty(scanChartCol.sqlfield)) {
              tableRow[scanChartCol.key] = scanResult[scanChartCol.sqlfield];
            } else {
              console.error(
                'scan result does not contain ',
                scanChartCol.sqlfield,
              );
            }
          });
          rows.push(tableRow);
        }
      });
      this.scanResultsRefreshed = false;
    } catch (e) {
      console.error('ERROR creating table rows:', e);
      return [];
    }
    return rows;
  };

  onSortChange = (sortBy, sortDirection) => {
    this.setState({
      sortBy,
      sortDirection,
      topLink: sortBy == 'time' ? this.state.topLink : null,
    });
  };

  // when a row is selected, show it on the map and render the heatmap
  onTableRowSelect = async row => {
    try {
      const linkName = this.state.nodeToLinkName[row.tx_node_name];
      Dispatcher.dispatch({
        actionType: Actions.LINK_SELECTED,
        link: this.linksByName[linkName],
        source: 'table',
      });
    } catch (e) {
      console.error('Error on row selection ', e);
    }
    // fetch from mysql
    const sqlfilter = this.createScanFilterRowSelect(row.rxid);
    let scanResults = undefined;
    try {
      const response = await axios.post(
        '/metrics/scan_results?topology=' + this.props.topology.name,
        sqlfilter,
      );
      scanResults = response.data;
    } catch (e) {
      console.error('ERROR reading scan results: ', e);
    }

    if (scanResults) {
      try {
        const results = scanResults.results[0];
        let heatmapResults = undefined;
        if (
          results.scan_type === ScanType.PBF ||
          results.scan_type === ScanType.IM
        ) {
          heatmapResults = this.createHeatmapArrayPbfIm(
            results.scan_resp,
            results.tx_scan_resp,
            results.scan_type,
            results.scan_mode,
          );
        } else if (results.scan_type === ScanType.RTCAL) {
          heatmapResults = this.createHeatmapArrayRtcal(
            results.scan_resp,
            results.tx_scan_resp,
            results.scan_type,
            results.scan_sub_type,
          );
        } else {
          this.setState({
            zmap: null,
            heatmaprender: true,
            heatmaptitle: {},
          });
          return; // TODO support other scan types
        }
        const heatmaptitle = {};
        heatmaptitle.title = row.tx_node_name + ' -> ' + row.rx_node_name;
        if (results.scan_type === ScanType.PBF) {
          heatmaptitle.xaxis =
            'beam index tx: ' +
            row.tx_node_name +
            ' (each index = 1.4\u00B0) <br> O (current/new beam) X (previous beam if different)';
          heatmaptitle.yaxis =
            'beam index rx: ' + row.rx_node_name + ' (each index = 1.4\u00B0)';
        } else if (results.scan_type === ScanType.IM) {
          heatmaptitle.xaxis =
            'beam index tx: ' + row.tx_node_name + ' (each index = 1.4\u00B0)';
          heatmaptitle.yaxis =
            'beam index rx: ' + row.rx_node_name + ' (each index = 1.4\u00B0)';
        } else if (results.scan_type === ScanType.RTCAL) {
          heatmaptitle.xaxis = 'RTCAL index';
          heatmaptitle.yaxis = 'average SNR (dB)';
        }

        this.setState({
          zmap: heatmapResults.zmap,
          txXY: heatmapResults.txXY,
          rxXY: heatmapResults.rxXY, // only used for 2D heatmap
          heatmaprender: true,
          oldNewBeams: heatmapResults.oldNewBeams,
          heatmaptitle,
        });
      } catch (e) {
        console.error('ERROR creating the heatmap array ', e);
        this.setState({
          zmap: null,
          heatmaprender: false,
          heatmaptitle: {},
        });
      }
    } else {
      // should never happen
      console.error('ERROR: scanResults query failed');
    }
  };

  renderScanTable = () => {
    let adjustedHeight = this.props.height - 40;
    adjustedHeight = adjustedHeight < 0 ? 0 : adjustedHeight;
    const selected = this.state.selectedLink ? [this.state.selectedLink] : [];

    return (
      <CustomTable
        rowHeight={40}
        headerHeight={this.headerHeight}
        height={adjustedHeight - 45}
        overscanRowCount={this.overscanRowCount}
        columns={this.scanChartDescription}
        data={this.getTableRows()}
        sortBy={this.state.sortBy}
        sortDirection={this.state.sortDirection}
        onRowSelect={this.onTableRowSelect}
        onSortChange={this.onSortChange}
        selected={selected}
        striped={false}
      />
    );
  };

  renderHeatmap = heatMapHeightWidth => {
    return (
      <ReactPlotlyHeatmap
        zmap={this.state.zmap}
        txXY={this.state.txXY}
        rxXY={this.state.rxXY}
        oldNewBeams={this.state.oldNewBeams}
        heatmaprender={this.state.heatmaprender}
        heatmaptitle={this.state.heatmaptitle}
        height_width={heatMapHeightWidth}
      />
    );
  };

  render() {
    const scanTable = this.renderScanTable();
    const pullDowns = this.renderSelectButtons();
    const fetchButton = this.renderFetchButton();
    const heatmap = this.renderHeatmap(500);

    return (
      <div
        style={{
          marginLeft: '10px',
          marginRight: '10px',
          overflow: 'auto',
          height: this.props.height,
        }}>
        {pullDowns}
        &nbsp;&nbsp;&nbsp;
        {fetchButton}
        <div style={{height: this.props.height + 100}}>
          <table style={{float: 'left', width: '60%'}}>
            <tbody>
              <tr>
                <td>{scanTable}</td>
              </tr>
            </tbody>
          </table>
          <table style={{float: 'right', width: '35%'}}>
            <tbody>
              <tr>
                <td>{heatmap}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
NetworkScans.propTypes = {
  topology: PropTypes.object.isRequired,
};
