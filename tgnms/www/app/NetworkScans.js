import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import equals from "equals";
// dispatcher
import { Actions } from "./constants/NetworkConstants.js";
import Dispatcher from "./NetworkDispatcher.js";
import NetworkStore from "./stores/NetworkStore.js";
import ReactEventChart from "./ReactEventChart.js";
//import ReactPlotlyHeatmap from "./ReactPlotlyHeatmap.js";
import { availabilityColor } from "./NetworkHelper.js";
import { variableColorDown, variableColorUp } from "./NetworkHelper.js";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";

const SECONDS_HOUR = 60 * 60;
const SECONDS_DAY = SECONDS_HOUR * 24;
const INVALID_VALUE = 255;
const HEATMAPSIZE = 64;
const WIRELESS = 1;
const WIRED = 2;
const NODE_FILTER_INIT = ["","undefined"];

const ScanType = {
  'PBF' : 1,
  'IM' : 2,
  'RTCAL' : 3,
  'CBF_TX' : 4,
  'CBF_RX' : 5
};


export default class NetworkScans extends React.Component {
  nodesByName = {};
  linksByName = {};
  linkNameList = {};
  nodeNameList = {};
  filterSource = "dropdown";
  state = {
    scanResults: NetworkStore.scanResults,
    zmap: undefined,
    nodeToLinkName: undefined,
    selectedLink: NetworkStore.selectedName,
    selectedNode : null,
    sortName: "link_name",
    sortOrder: "asc",
    topLink: null,
    heatmaprender : true,
    heatmaptitle: undefined,
    nodeFilter: NODE_FILTER_INIT
  };

  constructor(props) {
    super(props);
    this.linkSortFunc = this.linkSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this)
    );
    let nodeToLinkName = this.updateNodeToLinkMapping(this.props.topology);
    this.setState({nodeToLinkName: nodeToLinkName});
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.SCAN_REFRESHED: // when we get mySQL results
        this.setState({
          scanResults: payload.scanResults
        });
        // if (payload.scanResults.results.length && payload.scanResults.rx_node_name) {
        //   if (payload.scanResults.results[0].json_obj.hasOwnProperty(payload.scanResults.results[0].rx_node_name))
        //   {
        //       let zmap = this.createHeatmapArray(payload.scanResults.results[0].json_obj[payload.scanResults.rx_node_name]);
        //       this.setState({
        //         zmap: zmap,
        //         heatmaprender : true
        //       });
        //     }
        // }
        // else {
        //   console.error('ERROR: unexpected scan results:', payload.scanResults);
        // }
        break;
      case Actions.TOPOLOGY_REFRESHED:
        let nodeToLinkName = this.updateNodeToLinkMapping(this.props.topology);
        this.setState({ nodeToLinkName : nodeToLinkName, // TODO: why is nodeToLinkName stored as state but others are stored as globals?
                        heatmaprender : false });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedLink: null,
          selectedNode: null
        });
        break;
      case Actions.LINK_SELECTED:
        if (payload.source === "map") {
          this.setState({
            selectedLink: payload.link.name,
            heatmaprender : false,
            topLink: payload.link
          });

          // fill in the table filter with the selected link
          this.filterSource = "map";
          this.refs.linkName.applyFilter(payload.link.name);
          this.filterSource = "map";
          this.refs.txNodeName.cleanFiltered();
        }
        break;
      case Actions.NODE_SELECTED:
        if (payload.source === "map") {

          this.setState({
            selectedNode: payload.nodeSelected,
            selectedLink: null,
            heatmaprender : false
          });
          // fill in the table filter with the selected node
          this.filterSource = "map";
          this.refs.txNodeName.applyFilter(payload.nodeSelected);
          this.filterSource = "map";
          this.refs.linkName.cleanFiltered();
        }
        break;
    }
  }

  // mapping from node to link for wireless links
  updateNodeToLinkMapping(topology) {
    this.linksByName = {};
    let nodeToLinkName = {};
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
  }

  create2DArray(rows) {
    var arr = new Array(rows);

    for (var i=0;i<rows;i++) {
       arr[i] = new Array(rows);
    }
    return arr;
  }

  createHeatmapArray(json_obj) {
    let routeInfoList = json_obj.routeInfoList;
    let zmap = this.create2DArray(HEATMAPSIZE);
    for (let i in routeInfoList) {
      let txRoute = routeInfoList[i].route.tx;
      let rxRoute = routeInfoList[i].route.rx;
        if ((txRoute >= HEATMAPSIZE) ||
            (rxRoute >= HEATMAPSIZE) ||
            (txRoute === undefined) ||
            (rxRoute === undefined)) {
            console.error('createHeatmapArray out of bounds  tx:', txRoute, ' rx:', rxRoute);
            break;
        }
        // beam indices from left to right: [63, 62, ... 32, 0, 1, ... 31]
        let txIndex = (txRoute >= 32) ? 63 - txRoute: txRoute + 32;
        let rxIndex = (rxRoute >= 32) ? 63 - rxRoute: rxRoute + 32;

        // txIndex is along the x-axis
        zmap[rxIndex][txIndex] =
          routeInfoList[i].snrEst;
    }
    return zmap;
  }

  // scanResults is the routeInfoList
  getTableRows()
  // : Array<{ //TODO(csm) what does this Array do?
  //   name: string,
  //   a_node_name: string,
  //   z_node_name: string,
  //   alive: boolean
  // }> 
  {
    const rows = [];
    if (!this.state.scanResults || !this.state.scanResults.results) {
      console.log('no scanResults');
      return rows;
    }

    try {
      for (var i = 0; i < this.state.scanResults.results.length; i++) {
        let scanResults = this.state.scanResults.results[i];

        if (scanResults) {
          let numResults = 0;
          if (scanResults.json_obj) {
            numResults = (scanResults.json_obj[scanResults.rx_node_name].routeInfoList).length;
          }

          if (!this.state.nodeToLinkName) {
              console.error("nodeToLinkName mapping is missing");
          }
          else if (!this.state.nodeToLinkName[scanResults.tx_node_name]) {
            console.error("no nodeToLinkName mapping for ", scanResults.tx_node_name);
          }
          else {
            let timestamp = scanResults.timestamp.replace('T',' ').replace('.000Z','');
            let scan_type = Object.keys(ScanType).find(key => ScanType[key] === scanResults.scan_type);
            rows.push({
              link_name: this.state.nodeToLinkName[scanResults.tx_node_name],
              token: scanResults.token,
              a_node_name: scanResults.tx_node_name,
              z_node_name: scanResults.rx_node_name,
              scan_type: scan_type,
              time: timestamp,
              tx_power: scanResults.tx_power,
              index: i,
              num_results: numResults
            });
          }
        }
      }
    } catch (e) {
      console.log("DEBUG: scanResults:", this.state.scanResults);
      console.error ('ERROR creating table rows:', e);
      return [];
    }
    return rows;
  }

  linkSortFuncHelper(a, b, order) {
    if (order === "desc") {
      if (a.link_name > b.link_name) {
        return -1;
      } else if (a.link_name < b.link_name) {
        return 1;
      }
      // both entries have the same name, sort based on a/z node name
      if (a.a_node_name > a.z_node_name) {
        return -1;
      } else {
        return +1;
      }
    } else {
      if (a.link_name < b.link_name) {
        return -1;
      } else if (a.link_name > b.link_name) {
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

  // a and b are the two rows being compared
  linkSortFunc(a, b, order) {
    // order is desc or asc
    if (this.state.topLink) {
      if (a.link_name == this.state.topLink.link_name) {
        if (a.link_name == b.link_name) {
          return this.linkSortFuncHelper(a, b, order);
        }
        else {
          return -1;
        }
      } else if (b.link_name == this.state.topLink.link_name) {
        if (a.link_name == b.link_name) {
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
      toplink: sortName == "link_name" ? this.state.toplink : null
    });
  }

  onFilterChange(filterObj) {
    let nodeFilter = NODE_FILTER_INIT.slice();
    if (filterObj.link_name) {
      try {
        if (this.filterSource !== "map") {
          Dispatcher.dispatch({
            actionType: Actions.LINK_SELECTED,
            link: this.linksByName[filterObj.link_name.value],
            source: "table"
          });
        }
        nodeFilter[0] = this.linksByName[filterObj.link_name.value].a_node_name;
        nodeFilter[1] = this.linksByName[filterObj.link_name.value].z_node_name;
      }
      catch(e) {console.error("ERROR: NetworkScans.js onFilterChange filterObj:", filterObj, e);}
      this.setState({nodeFilter: nodeFilter});
    }
    else if (filterObj.a_node_name) {
      try {
        if (this.filterSource !== "map") {
          Dispatcher.dispatch({
            actionType: Actions.NODE_SELECTED,
            nodeSelected: filterObj.a_node_name.value,
            source: "table"
          });
        }
        nodeFilter[0] = filterObj.a_node_name.value;
      }
      catch(e) {console.error("ERROR: node NetworkScans.js onFilterChange filterObj:", filterObj, e);}
      this.setState({nodeFilter: nodeFilter});
    }
    else {
      this.setState({nodeFilter: NODE_FILTER_INIT});
    }
    this.filterSource = "dropdown";
  }

  // when a row is selected, show it on the map and render the heatmap
  tableOnRowSelect(row, isSelected) {
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: this.linksByName[row.link_name],
      source: "table"
    });
    let zmap = this.createHeatmapArray(this.state.scanResults.results[row.index].json_obj[row.z_node_name]);
    let heatmaptitle = {};
    heatmaptitle.title = row.a_node_name + " -> " + row.z_node_name;
    heatmaptitle.xaxis = "beam index tx: " + row.a_node_name + " (each index = 1.4\u00B0)";
    heatmaptitle.yaxis = "beam index rx: " + row.z_node_name + " (each index = 1.4\u00B0)";
    this.setState({
      zmap: zmap,
      heatmaprender : true,
      heatmaptitle : heatmaptitle
    });
  }

  handlerClickCleanFiltered() {
    this.refs.txNodeName.cleanFiltered();
    this.refs.linkName.cleanFiltered();
    this.setState({nodeFilter: NODE_FILTER_INIT});
  }


  enumFormatter(cell, row, enumObject) {
    return enumObject[cell];
  }

  renderScanTable() {
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
      onSortChange: this.onSortChange.bind(this),
      onFilterChange: this.onFilterChange.bind(this)
    };
    if (true) {
      return (
        <BootstrapTable
          height={adjustedHeight + "px"}
          key="scansTable"
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}
          condensed
        >
        <TableHeaderColumn
          dataField="index"
          hidden={true}
          isKey={true}
        >
          HIDDEN
        </TableHeaderColumn>
        <TableHeaderColumn
          width="14%"
          // dataSort={true}
          ref='linkName'
          dataField="link_name"
          filterFormatted dataFormat={ this.enumFormatter }
              formatExtraData={ this.linkNameList } filter={ { type: 'SelectFilter', options: this.linkNameList }}
          // sortFunc={this.linkSortFunc}
        >
          Name
          <br/><a onClick={ this.handlerClickCleanFiltered.bind(this) } style={ { cursor: 'pointer' } }>clear filters</a>
        </TableHeaderColumn>
        <TableHeaderColumn
          width="14%"
          dataSort={true}
          dataField="a_node_name"
          ref='txNodeName'
          filterFormatted dataFormat={ this.enumFormatter }
              formatExtraData={ this.nodeNameList } filter={ { type: 'SelectFilter', options: this.nodeNameList }}
        >
          NodeTx
        </TableHeaderColumn>
        <TableHeaderColumn
          width="14%"
          dataSort={true}
          dataField="z_node_name"
        >
          NodeRx
        </TableHeaderColumn>
        <TableHeaderColumn
          width="10%"
          dataSort={true}
          dataField="token"
          // sortFunc={this.linkSortFunc}
        >
          Token
        </TableHeaderColumn>
        <TableHeaderColumn
          width="10%"
          dataSort={true}
          dataField="tx_power"
          // sortFunc={this.linkSortFunc}
        >
          tx Power
        </TableHeaderColumn>
          <TableHeaderColumn
            width="14%"
            dataSort={true}
            dataField="time"
          >
            Time
          </TableHeaderColumn>
          <TableHeaderColumn
            width="12%"
            dataSort={true}
            // dataFormat={this.renderStatusColor}
            dataField="scan_type"
          >
            Scan Type
          </TableHeaderColumn>
          <TableHeaderColumn
            width="12%"
            dataSort={true}
            // dataFormat={this.renderStatusColor}
            dataField="num_results"
          >
            #Results
          </TableHeaderColumn>
        </BootstrapTable>
      );
    }
  }

  // there are three buttons -
  //  1. refresh/fetch the first page
  //  2. to fetch the next page
  //  3. the fetch the previous page
  filterHelper(nodeFilter) {
    const fetchCount = 4; //TODO change to 100
    let result = [];
    for (let i = 0; i < 3; i++) {
        result[i] = {};
        result[i].disabled = true;
        result[i].filter = {};
        result[i].filter.row_count = fetchCount;
        result[i].filter.offset = 0;
        result[i].filter.nodeFilter = nodeFilter;
    }
    result[0].key = "initialFetch";
    result[1].key = "nextPage";
    result[2].key = "prevPage";
    result[0].disabled = false; // always enabled
    let buttontxt = "";
    if (nodeFilter[0] !== "") {
      buttontxt = " node " + nodeFilter[0];
    }
    if (nodeFilter[1] !== "undefined") {
      buttontxt = buttontxt + " or " + nodeFilter[1];
    }
    result[0].buttontxt = "Fetch 1st page/refresh" + buttontxt;
    result[1].buttontxt = "next page (" + fetchCount + ")" + buttontxt;
    result[2].buttontxt = "previous page (" + fetchCount + ")" + buttontxt;

    if (!this.state.scanResults) {
      return result; // no results fetched yet
    }
    else if ((this.state.scanResults.filter.nodeFilter[0] !== nodeFilter[0]) ||
             (this.state.scanResults.filter.nodeFilter[1] !== nodeFilter[1])) {
      return result;  // filter changed, so only option is refresh
    }
    else {
      try {
        let currentOffset = this.state.scanResults.filter.offset;
        if (this.state.scanResults.results.length === fetchCount) {
          result[1].disabled = false;
          result[1].filter.offset = currentOffset + fetchCount;
        }
        if (currentOffset > 0) {
          result[2].disabled = false;
          result[2].filter.offset = Math.max(currentOffset - fetchCount, 0);
        }
      } catch (e) {
        console.error ('ERROR in NetworkScans filterHelper:', e);
        return result;
      }
    }
    return result;
  }

  render() {
    let scanTable = this.renderScanTable();

    let buttonResult = this.filterHelper(this.state.nodeFilter);
    let fetchButton = [];
    for (let i = 0; i < 3; i++) {
      fetchButton[i] = <button
        key={buttonResult[i].key}
        disabled={buttonResult[i].disabled}
        className={
           buttonResult[i].disabled
           ? "graph-button-fetch-disabled"
           : "graph-button-fetch"
        }
        onClick={btn => Dispatcher.dispatch({
          actionType: Actions.SCAN_FETCH,
          mysqlfilter: buttonResult[i].filter
        })}
      >
        {buttonResult[i].buttontxt}
      </button>
    }
    let showResultsMsg = "";
    try {
      showResultsMsg = " Showing Results "
          + this.state.scanResults.filter.offset
          + " to "
          + (this.state.scanResults.filter.offset +
             this.state.scanResults.results.length - 1);
    } catch (e) {}

    let heatMapHeightWidth = 500;
// temp disabled
/*            <ReactPlotlyHeatmap
              zmap={this.state.zmap}
              heatmaprender={this.state.heatmaprender}
              heatmaptitle={this.state.heatmaptitle}
              height_width={heatMapHeightWidth}
            />*/
    return (
        <div style={{ marginLeft: "10px", marginRight: "10px", overflow: "auto", height: this.props.height}}>
          {fetchButton[0]}
          {fetchButton[1]}
          {fetchButton[2]}
          &nbsp;&nbsp;&nbsp;
          {showResultsMsg}
          <div style={{height: this.props.height + 100}}>
            <table style={{ float: "left", width: "60%" }}>
              <tbody>
                <tr>
                  <td>{scanTable}</td>
                </tr>
              </tbody>
            </table>
            <table style={{ float: "right", width: "35%" }}>
              <tbody>
                <tr>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    );
  }
}
NetworkScans.propTypes = {
  topology: PropTypes.object.isRequired
};
