import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
// tabs
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

export default class NetworkDataTable extends React.Component {
  state = {
    selectedTabIndex: 0,
    selectedNodeSite: null,
    nodesSelected: [],
    selectedLink: null,
    topology: {},
  }

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        // topology refreshed
        this.setState({
          topology: payload.topologyJson,
        });
        break;
      case Actions.NODE_SELECTED:
        this.setState({
          nodesSelected: payload.nodesSelected,
        });
        break;
    }
  }

  _getNodesRows(nodes): Array<{name:string,
                          mac_addr:string,
                          node_type:string,
                          ignited:boolean,
                          site_name:string,
                          pop_node:string,
                          ipv6:string,
                          version:string}>  {
    const rows = [];
    Object.keys(nodes).forEach(nodeName => {
      let node = nodes[nodeName];
      var ipv6 = node.status ? node.status.ipv6Address : 'Not Available';
      var version = node.status ? node.status.version.slice(28) : 'Not Available';
      rows.push(
        {
          name: node.name,
          mac_addr: node.mac_addr,
          node_type: node.node_type == 2 ? 'DN' : 'CN',
          ignited: node.is_ignited,
          site_name: node.site_name,
          pop_node: node.pop_node ? 'true' : 'false',
          ipv6: ipv6,
          version: version,
          key: node.name,
        },
      );
    });
    return rows;
  }

  _getLinksRows(links): Array<{name:string,
                          a_node_name:string,
                          z_node_name:string,
                          alive:boolean}> {
    const rows = [];
    links.forEach(link => {
      rows.push(
        {
          name: link.name,
          a_node_name: link.a_node_name,
          z_node_name: link.z_node_name,
          alive: link.is_alive,
          type: link.link_type == 1 ? 'Wireless' : 'Wired',
          key: link.name,
        },
      );
    });
    return rows;
  }

  _nodesOnRowSelect(row, isSelected) {
    let nodesSelectedTmp = this.state.nodesSelected;
    if (isSelected) {
      nodesSelectedTmp.push(row.name);
    } else {
      let nameIndex = nodesSelectedTmp.indexOf(row.name);
      if (nameIndex != -1) {
        nodesSelectedTmp.splice(nameIndex, 1);
      }
    }
    // dispatch event for the map
    Dispatcher.dispatch({
      actionType: Actions.NODE_SELECTED,
      nodesSelected: nodesSelectedTmp,
    });
  }

  _linksOnRowSelect(row, isSelected) {
    this.setState({
      selectedLink:  row,
    });
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: row,
    });
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
      selectedLink: null,
    });
    // TODO - should we null the selected node?
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_NODE_LINK_SELECTED,
    });
  }

  render() {
    var nodesSelectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(238, 193, 213)",
      onSelect: this._nodesOnRowSelect.bind(this),
      selected: this.state.nodesSelected,
    };

    var linksSelectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(238, 193, 213)",
      onSelect: this._linksOnRowSelect.bind(this)
    };

    const tableOptions = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.onSortChange,
    };

    let nodesData = [];
    let linksData = [];
    if (this.state.topology &&
        this.state.topology.nodes &&
        this.state.topology.links) {
      nodesData = this.state.topology.nodes;
      linksData = this.state.topology.links;
    }

    return (
      <Tabs
        onSelect={this._handleTabSelect.bind(this)}
        selectedIndex={this.state.selectedTabIndex}
      >
        <TabList>
          <Tab>Nodes</Tab>
          <Tab>Links</Tab>
          <Tab>Test</Tab>
        </TabList>
        <TabPanel>
          <BootstrapTable
              height="400"
              key="nodesTable"
              data={this._getNodesRows(nodesData)}
              striped={true} hover={true}
              selectRow={nodesSelectRowProp}>
            <TableHeaderColumn width="200" dataSort={true} dataField="name" isKey={ true }>Name</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="mac_addr">MAC</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="ipv6">IPv6</TableHeaderColumn>
            <TableHeaderColumn width="100" dataSort={true} dataField="node_type">Type</TableHeaderColumn>
            <TableHeaderColumn width="100"
                               dataSort={true}
                               dataField="ignited">
              Ignited
            </TableHeaderColumn>
            <TableHeaderColumn width="100"
                               dataSort={true}
                               dataField="site_name"
                               sortFunc={this._siteSortFunc}>
              Site ID
            </TableHeaderColumn>
            <TableHeaderColumn width="120" dataSort={true} dataField="pop_node">Pop Node</TableHeaderColumn>
            <TableHeaderColumn width="700" dataSort={true} dataField="version">Version</TableHeaderColumn>
          </BootstrapTable>
        </TabPanel>
        <TabPanel>
          <BootstrapTable
              height="400"
              key="linksTable"
              data={this._getLinksRows(linksData)}
              striped={true} hover={true}
              selectRow={linksSelectRowProp}>
            <TableHeaderColumn width="400" dataSort={true} dataField="name" isKey={ true }>Name</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="a_node_name">A-Node</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="z_node_name">Z-Node</TableHeaderColumn>
            <TableHeaderColumn width="100" dataSort={true} dataField="alive">Alive</TableHeaderColumn>
            <TableHeaderColumn width="100" dataSort={true} dataField="type">Type</TableHeaderColumn>
          </BootstrapTable>
        </TabPanel>
        <TabPanel>

        </TabPanel>
      </Tabs>
    );
  }
}
