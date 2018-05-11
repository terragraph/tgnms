import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import equals from "equals";
// dispatcher
import { Actions } from "./constants/NetworkConstants.js";
import Dispatcher from "./NetworkDispatcher.js";
import NetworkStore from "./stores/NetworkStore.js";
import ReactEventChart from "./ReactEventChart.js";
import { availabilityColor } from "./NetworkHelper.js";
import { variableColorDown, variableColorUp } from "./NetworkHelper.js";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";

var SECONDS_HOUR = 60 * 60;
var SECONDS_DAY = SECONDS_HOUR * 24;
var INVALID_VALUE = 255;

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
    showAnalyzer: false
  };

  constructor(props) {
    super(props);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
    this.linkSortFunc = this.linkSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
    this.getTableRowsAnalyzer = this.getTableRowsAnalyzer.bind(this);
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this)
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
          let nodeHealth = this.state.linkHealth.metrics[link.name];
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
          linkRequestButtonEnabled: true
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          sortName: payload.source == "table" ? this.state.sortName : "name",
          sortOrder: payload.source == "table" ? this.state.sortOrder : "asc",
          topLink:
            payload.source == "table" ? this.state.topLink : payload.link,
          selectedLink: payload.link.name,
          linkRequestButtonEnabled: true
        });
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          linkHealth: payload.linkHealth
        });
        break;
      case Actions.ANALYZER_REFRESHED:
        this.setState({
          analyzerTable: payload.analyzerTable
        });
        break;
      }
  }

  linkSortFuncHelper(a, b, order) {
    if (order === "desc") {
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
        }
        else {
          return -1;
        }
      } else if (b.name == this.state.topLink.name) {
        if (a.name == b.name) {
          return this.linkSortFuncHelper(a, b, order);
        }
        else {
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
      toplink: sortName == "name" ? this.state.toplink : null
    });
  }

  formatAnalyzerValue(obj, propertyName) {
    return obj.hasOwnProperty(propertyName)
      ? obj[propertyName] == INVALID_VALUE ? "-" : obj[propertyName]
      : "-";
  }

  getTableRows(): Array<{
    name: string,
    a_node_name: string,
    z_node_name: string,
    alive: boolean
  }> {
    const rows = [];
    Object.keys(this.linksByName).forEach(linkName => {
      let link = this.linksByName[linkName];
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
      let aNode = this.nodesByName[link.a_node_name];
      let zNode = this.nodesByName[link.z_node_name];
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
        type: link.link_type == 1 ? "Wireless" : "Wired",
        alive_perc: link.alive_perc,
        linkup_attempts: linkupAttempts,
        distance: link.distance
      });
    });
    return rows;
  }

  getTableRowsAnalyzer(): Array<{
    name: string,
    a_node_name: string,
    z_node_name: string,
    alive: boolean
  }> {
    const rows = [];
    if (!this.linksByName) {
      return;
    }
    Object.keys(this.linksByName).forEach(linkName => {
      let link = this.linksByName[linkName];
      if (!this.state.analyzerTable || !this.state.analyzerTable.metrics) {
        return;
      }
      let analyzerLink = this.state.analyzerTable.metrics.hasOwnProperty(
        linkName
      )
        ? this.state.analyzerTable.metrics[linkName]
        : [];
      let analyzerLinkA = analyzerLink.hasOwnProperty("A")
        ? analyzerLink["A"]
        : analyzerLink;
      let analyzerLinkZ = analyzerLink.hasOwnProperty("Z")
        ? analyzerLink["Z"]
        : analyzerLink;
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
      let aNode = this.nodesByName[link.a_node_name];
      let zNode = this.nodesByName[link.z_node_name];
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
        type: link.link_type == 1 ? "Wireless" : "Wired",
        alive_perc: link.alive_perc,
        fw_restarts: analyzerLinkA["flaps"],
        uptime: analyzerLinkA["uptime"] / 60.0,
        mcs: this.formatAnalyzerValue(analyzerLinkA, "avgmcs"),
        snr: this.formatAnalyzerValue(analyzerLinkZ, "avgsnr"),
        per: this.formatAnalyzerValue(analyzerLinkA, "avgper"),
        tputPPS: this.formatAnalyzerValue(analyzerLinkA, "tput"),
        txpower: this.formatAnalyzerValue(analyzerLinkA, "avgtxpower"),
        distance: link.distance
      });
      // this is the Z->A link
      rows.push({
        name: link.name,
        a_node_name: link.z_node_name,
        z_node_name: link.a_node_name,
        alive: link.is_alive,
        type: link.link_type == 1 ? "Wireless" : "Wired",
        alive_perc: link.alive_perc,
        fw_restarts: analyzerLinkZ["flaps"],
        uptime: analyzerLinkZ["uptime"] / 60.0,
        mcs: this.formatAnalyzerValue(analyzerLinkZ, "avgmcs"),
        snr: this.formatAnalyzerValue(analyzerLinkA, "avgsnr"),
        per: this.formatAnalyzerValue(analyzerLinkZ, "avgper"),
        tputPPS: this.formatAnalyzerValue(analyzerLinkZ, "tput"),
        txpower: this.formatAnalyzerValue(analyzerLinkZ, "avgtxpower"),
        distance: link.distance
      });
    });
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: this.linksByName[row.name],
      source: "table"
    });
  }

  renderNameWithStatsLinks(cell, row) {
    let linkStyle = {
      color: "blue",
      cursor: "pointer",
      paddingLeft: "5px"
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
              viewName: "stats",
              nodeRestrictor: row.name
            });
          }}
        >
          Link
        </span>
        <span
          style={linkStyle}
          onClick={click => {
            Dispatcher.dispatch({
              actionType: Actions.VIEW_SELECTED,
              viewName: "stats",
              nodeRestrictor: [row.a_node_name, row.z_node_name].join(",")
            });
          }}
        >
          Nodes
        </span>
      </span>
    );
  }

  // convert time in ms to hh:MM:ss<AM/PM> format
  // used by the function that creates the Scuba dashboard link
  hhMMss(tm) {
    let tmm = new Date(tm);
    let seconds = tmm.getSeconds();
    let minutes = tmm.getMinutes();
    let hour = tmm.getHours();
    let ampm = "";
    if (hour > 12) {
      hour = hour - 12;
      ampm = "PM";
    } else {
      ampm = "AM";
    }
    return hour + ":" + minutes + ":" + seconds + ampm;
  }

  // create a link to an ODS Chart
  renderODSLink(row) {
    let aNode = this.nodesByName[row.a_node_name];
    let zNode = this.nodesByName[row.z_node_name];
    if (!aNode || !zNode) {
      return;
    }
    let keystr = {keys: [
      {
        keyname: "phystatus.ssnrEst",
        az: "Z"
      },
      {
        keyname: "staPkt.mcs",
        az: "A"
      },
      {
        keyname: "staPkt.txPowerIndex",
        az: "A"
      }]};

    let url = 'https://our.intern.facebook.com/intern/ods/chart/?submitted=1&period={"minutes_back":"60"}&chart_params={"type":"linechart","renderer":"highcharts","y_min":"","y_max":""}';
    let queries = {};
    let i = 0;

    queries["active"] = true;
    queries["source"] = "ods";
    keystr.keys.forEach(keyData => {
      if (keyData.az === "Z") {
        queries["key"] = "tgf." + zNode.mac_addr + "." + keyData.keyname;
        queries["entity"] = "CXL-Node-Test-" + aNode.mac_addr;
      }
      else {
        queries["key"] = "tgf." + aNode.mac_addr + "." + keyData.keyname;
        queries["entity"] = "CXL-Node-Test-" + zNode.mac_addr;
      }
      url = url + "&queries["+i+"]=" + JSON.stringify(queries);
      i = i + 1;
    });

    return url;
  }

  // create a link to the high frequency Scuba dashboard
  renderScubaLink(row) {
    let aNode = this.nodesByName[row.a_node_name];
    let zNode = this.nodesByName[row.z_node_name];
    if (!aNode || !zNode) {
      return;
    }
    let now = new Date();
    // put in a two minute window because it takes some time for data to
    // reach Scuba
    let endTms = now.getTime() - 120 * 1000; // ms since 1970
    let endTs = (endTms / 1000.0).toFixed(0);
    let startTms = endTms - (SECONDS_HOUR - 120) * 1000;
    let startTs = (startTms / 1000.0).toFixed(0);

    let url =
      "https://our.intern.facebook.com/intern/network/terragraph/link_log/?";
    let node_a = "node_a=" + aNode.mac_addr;
    let node_z = "&node_z=" + zNode.mac_addr;

    // getTimezoneOffset is the difference between UTC and local in
    // minutes
    let hour_diff = now.getTimezoneOffset() / 60;
    let start_time = (startTs - hour_diff * SECONDS_HOUR) % SECONDS_DAY;
    let start_date = (startTs - start_time) * 1000; // ms
    // local time display
    let start_time_local = this.hhMMss(startTms);
    let start_time_display = "&start_time_display=" + start_time_local;

    let end_time = (endTs - hour_diff * SECONDS_HOUR) % SECONDS_DAY;
    let end_date = (endTs - end_time) * 1000; // ms
    // local time display
    let end_time_local = this.hhMMss(endTms);
    let end_time_display = "&end_time_display=" + end_time_local;

    // Calculate configs based on (startT - endT): sample ratio and sample
    // num
    let total_sample_num = endTs - startTs;
    // more than 3700 samples gets slow for Scuba fetch
    let sampling_ratio = Math.ceil(total_sample_num / 3700).toFixed(0);
    // assume 1 sample/second
    let sample_num = (total_sample_num / sampling_ratio).toFixed(0);
    let sample = "&sample=" + sample_num;
    let sampling_ratio_txt = "&sampling_ratio=" + sampling_ratio;
    let myURL =
      url +
      node_a +
      "&start_date=" +
      start_date +
      start_time_display +
      "&start_time=" +
      start_time +
      sample +
      sampling_ratio_txt +
      node_z +
      "&end_date=" +
      end_date +
      end_time_display +
      "&end_time=" +
      end_time;
    return myURL;
  }

  // this creates a link to a Scuba dashboard showing the last one hour of
  // PHY statistics; the link will only work when connected to the FB
  // corporate network
  renderDashboardLink(cell, row) {
    let fbinternal = false;
    if (this.props.instance.hasOwnProperty("fbinternal")) {
      fbinternal = this.props.instance.fbinternal;
    }

    // if the field doesn't exist, don't display the link
    if (
      !this.nodesByName.hasOwnProperty(row.a_node_name) ||
      !this.nodesByName.hasOwnProperty(row.z_node_name)
    ) {
      return;
    }
    let scubaURL = this.renderScubaLink(row);
    let odsURL = this.renderODSLink(row);

    if (fbinternal) {
      return (
        <span>
          {" "}
          {cell}
          {" "}
          <a
            href={scubaURL}
            target="_new"
          >
            (Scuba)
          </a>
          <a
            href={odsURL}
            target="_new"
          >
            (ODS)
          </a>
        </span>
      );
    }
    else {
      return (
        <span> {cell} </span>
      );
    }
  }

  renderAlivePerc(cell, row) {
    let cellColor = "red";
    let cellText = "-";
    if (row.type == "Wired") {
      // color wired links as unavailable
      cellColor = "grey";
      cellText = "X";
    } else if (cell) {
      cellText = Math.round(cell * 100) / 100;
      cellColor = availabilityColor(cellText);
    }
    return <span style={{ color: cellColor }}>{"" + cellText}</span>;
  }

  // round and set color
  renderFloatPoint(cell, row, tpxx) {
    let cellColor = "red";
    let cellText = "-";
    if (!isNaN(cell)) {
      switch (tpxx) {
        case "mcs":
          // if value>thresh1 green, elseif >thresh2 orange, else red
          cellText = cell.toFixed(1);
          cellColor = variableColorUp(cell, 9, 5);
          break;
        case "snr":
          cellText = cell.toFixed(1);
          cellColor = variableColorUp(cell, 12, 9);
          break;
        case "txpower":
          cellText = cell.toFixed(1);
          cellColor = variableColorUp(cell, 0, 0);
          break;
        case "tput":
          cellText = cell.toFixed(0);
          cellColor = variableColorUp(cell, 0, 0);
          break;
        case "per":
          cellText = cell.toExponential(2);
          // if value<thresh1 green, elseif <thresh2 orange, else red
          cellColor = variableColorDown(cell, 0.005, 0.01);
          break;
        case "uptime":
          cellText = cell.toFixed(0);
          cellColor = variableColorUp(cell, 59, 59);
          break;
        case "fw_restarts":
          cellText = cell.toFixed(0);
          cellColor = variableColorDown(cell, 0, 1);
          break;
      }
    }

    return <span style={{ color: cellColor }}>{"" + cellText}</span>;
  }

  renderLinkAvailability(cell, row) {
    if (row && row.name) {
      let link = this.linksByName[row.name];
      if (link && link.events && link.events.length > 0) {
        let startTime = this.state.linkHealth.start;
        let endTime = this.state.linkHealth.end;
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
      <span style={{ color: cell ? "forestgreen" : "firebrick" }}>
        {"" + cell}
      </span>
    );
  }

  renderLinksTable() {
    //let adjustedHeight = this.props.height - (this.state.selectedLink ? 100 : 0);
    let adjustedHeight = this.props.height - 40;
    adjustedHeight = adjustedHeight < 0 ? 0 : adjustedHeight;
    var linksSelectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect,
      selected: this.state.selectedLink ? [this.state.selectedLink] : []
    };
    const tableOpts = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.onSortChange.bind(this)
    };
    if (this.state.showAnalyzer) {
      return (
        <BootstrapTable
          height={adjustedHeight + "px"}
          key="linksTable"
          data={this.getTableRowsAnalyzer()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}
        >
        <TableHeaderColumn
          width="350"
          dataSort={true}
          dataField="name"
          isKey={true}
          dataFormat={this.renderDashboardLink.bind(this)}
          sortFunc={this.linkSortFunc}
        >
          Name
        </TableHeaderColumn>
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="a_node_name"
          >
            A-Node
          </TableHeaderColumn>
          <TableHeaderColumn
            width="120"
            dataSort={true}
            dataField="z_node_name"
          >
            Z-Node
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderStatusColor}
            dataField="alive"
          >
            Alive
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={"mcs"}
            dataField="mcs"
          >
            Avg MCS
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={"snr"}
            dataField="snr"
          >
            Avg SNR
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={"per"}
            dataField="per"
          >
            Avg PER
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={"tput"}
            dataField="tputPPS"
          >
            Avg tput(PPS)
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderFloatPoint}
            formatExtraData={"txpower"}
            dataField="txpower"
          >
            Avg txPower
          </TableHeaderColumn>
          <TableHeaderColumn
            dataSort={true}
            width="80"
            dataFormat={this.renderFloatPoint}
            formatExtraData={"fw_restarts"}
            dataField="fw_restarts"
          >
            #Restarts
          </TableHeaderColumn>
          <TableHeaderColumn
            dataSort={true}
            width="80"
            dataFormat={this.renderFloatPoint}
            formatExtraData={"uptime"}
            dataField="uptime"
          >
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
          height={adjustedHeight + "px"}
          key="linksTable"
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}
        >
          <TableHeaderColumn
            width="150"
            dataSort={true}
            dataField="name"
            dataFormat={this.renderNameWithStatsLinks.bind(this)}
            isKey={true}
            sortFunc={this.linkSortFunc}
          >
            Name
          </TableHeaderColumn>
          <TableHeaderColumn
            width="80"
            dataSort={true}
            dataFormat={this.renderStatusColor}
            dataField="alive"
          >
            Alive
          </TableHeaderColumn>
          <TableHeaderColumn
            width="140"
            dataSort={true}
            dataField="alive_perc"
            dataFormat={this.renderAlivePerc}
          >
            Uptime (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn
            width="700"
            dataSort={true}
            dataField="availability_chart"
            dataFormat={this.renderLinkAvailability.bind(this)}
          >
            Availability (24 hours)
          </TableHeaderColumn>
          <TableHeaderColumn
            dataSort={true}
            width="100"
            dataField="linkup_attempts"
          >
            Attempts
          </TableHeaderColumn>
          <TableHeaderColumn dataSort={true} width="100" dataField="distance">
            Distance (m)
          </TableHeaderColumn>
        </BootstrapTable>
      );
    } else {
      return (
        <BootstrapTable
          height={adjustedHeight + "px"}
          key="linksTable"
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}
        >
          <TableHeaderColumn
            width="350"
            dataSort={true}
            dataField="name"
            isKey={true}
            sortFunc={this.linkSortFunc}
          >
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
            dataField="alive"
          >
            Alive
          </TableHeaderColumn>
          <TableHeaderColumn
            width="140"
            dataSort={true}
            dataField="alive_perc"
            dataFormat={this.renderAlivePerc}
          >
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
    let linksTable = this.renderLinksTable();
    return (
      <ul style={{ listStyleType: "none", paddingLeft: "0px" }}>
        <li key="linksTable">
          <button
            className={
              this.state.hideWired
                ? "graph-button graph-button-selected"
                : "graph-button"
            }
            onClick={btn => this.setState({ hideWired: !this.state.hideWired })}
          >
            Hide Wired
          </button>
          <button
            className={
              this.state.hideDnToDnLinks
                ? "graph-button graph-button-selected"
                : "graph-button"
            }
            onClick={btn =>
              this.setState({ hideDnToDnLinks: !this.state.hideDnToDnLinks })
            }
          >
            CNs Only
          </button>
          &nbsp;&nbsp;&nbsp;
          <button
            className={
              this.state.showEventsChart
                ? "graph-button graph-button-selected"
                : "graph-button"
            }
            onClick={btn =>
              this.setState({ showEventsChart: !this.state.showEventsChart, showAnalyzer: false })
            }
          >
            Show Link Events
          </button>
          <button
            className={
              this.state.showAnalyzer
                ? "graph-button graph-button-selected"
                : "graph-button"
            }
            onClick={btn =>
              this.setState({ showAnalyzer: !this.state.showAnalyzer, showEventsChart: false })
            }
          >
            Link Stats
          </button>
          {linksTable}
        </li>
      </ul>
    );
  }
}
NetworkLinksTable.propTypes = {
  topology: PropTypes.object.isRequired
};
