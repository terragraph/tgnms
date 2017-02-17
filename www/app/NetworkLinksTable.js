import React from 'react';
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
import ReactEventChart from './ReactEventChart.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

export default class NetworkLinksTable extends React.Component {
  state = {
    selectedLink: null,
    networkHealth: {},
    nodesByName: {},
  }

  nodesByName = {}

  constructor(props) {
    super(props);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    this.setState({
      networkHealth: NetworkStore.networkHealth,
    });
    // index nodes by name
    this.props.topology.nodes.forEach(node => {
      this.nodesByName[node.name] = node;
    });
  }

  componentWillUpdate() {
    // index nodes by name
    this.props.topology.nodes.forEach(node => {
      this.nodesByName[node.name] = node;
    });
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedLink: null,
        });
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          networkHealth: payload.health,
        });
        break;
    }
  }

  getTableRows(links): Array<{name:string,
                              a_node_name:string,
                              z_node_name:string,
                              alive:boolean}> {
    const rows = [];
    links.forEach(link => {
      rows.push({
        name: link.name,
        a_node_name: link.a_node_name,
        z_node_name: link.z_node_name,
        alive: link.is_alive,
        type: link.link_type == 1 ? 'Wireless' : 'Wired',
        alive_perc: link.alive_perc,
        snr_health_perc: link.snr_health_perc,
        key: link.name,
      });
    });
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    this.setState({
      selectedLink:  row,
    });
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: row,
    });
  }

  render() {
    var linksSelectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect
    };

    let linksData = [];
    if (this.props.topology &&
        this.props.topology.links) {
      linksData = this.props.topology.links.map(link => {
        if (link.a_node_name in this.state.networkHealth.links &&
            link.z_node_name in this.state.networkHealth.links[link.a_node_name]) {
          let nodeHealth = this.state.networkHealth.links[link.a_node_name]
                                                         [link.z_node_name];
          link.alive_perc = nodeHealth.alive;
          link.snr_health_perc = nodeHealth.snr;
        }
        return link;
      });
    }
    let linksTable =
      <BootstrapTable
          height={this.props.height}
          key="linksTable"
          data={this.getTableRows(linksData)}
          striped={true} hover={true}
          selectRow={linksSelectRowProp}>
        <TableHeaderColumn width="350"
                           dataSort={true}
                           dataField="name" isKey={ true }>
          Name
        </TableHeaderColumn>
        <TableHeaderColumn width="180"
                           dataSort={true}
                           dataField="a_node_name">
          A-Node
        </TableHeaderColumn>
        <TableHeaderColumn width="180"
                           dataSort={true}
                           dataField="z_node_name">
          Z-Node
        </TableHeaderColumn>
        <TableHeaderColumn width="80"
                           dataSort={true}
                           dataField="alive">
          Alive
        </TableHeaderColumn>
        <TableHeaderColumn width="140"
                           dataSort={true}
                           dataField="alive_perc">
          Uptime (24 hours)
        </TableHeaderColumn>
        <TableHeaderColumn width="100"
                           dataSort={true}
                           dataField="snr_health_perc">
          SNR %
        </TableHeaderColumn>
        <TableHeaderColumn dataSort={true}
                           dataField="type">
          Type
        </TableHeaderColumn>
      </BootstrapTable>;
    if (this.state.selectedLink) {
      // chart options
      let aNode = this.nodesByName[this.state.selectedLink.a_node_name];
      let zNode = this.nodesByName[this.state.selectedLink.z_node_name];
      let opts = [{
        type: 'link',
        a_node: {name: aNode.name, mac: aNode.mac_addr},
        z_node: {name: zNode.name, mac: zNode.mac_addr},
        keys: ['link_status'],
      }];
      return (
        <ul style={{listStyleType: 'none', paddingLeft: '0px'}}>
          <li key="eventsChart" style={{height: '100px'}}>
            <ReactEventChart options={opts} size="small" />
          </li>
          <li key="linksTable" style={{height: '400px'}}>
            {linksTable}
          </li>
        </ul>
      );
    }
    return linksTable;
  }
}
