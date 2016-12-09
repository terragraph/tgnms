import React from 'react';
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
var ipaddr = require('ipaddr.js');

var WidthProvider = require('react-grid-layout').WidthProvider;
var ReactGridLayout = require('react-grid-layout');
ReactGridLayout = WidthProvider(ReactGridLayout);

export default class NetworkRoutingTable extends React.Component {
  state = {
    selectedMac: null,
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
      case Actions.TOPOLOGY_SELECTED:
        this.setState({
          selectedMac: null,
        });
        break;
    }
  }

  getTableRows(nodes): Array<{name:string,
                              mac:string}>  {
    const rows = [];
    Object.keys(nodes).forEach(nodeName => {
      let node = nodes[nodeName];
      rows.push(
        {
          name: node.name,
          mac: node.mac_addr,
          key: node.name,
        },
      );
    });
    return rows;
  }

  bin2hex (s) {
    var i
    var l
    var o = ''
    var n

    s += ''

    for (i = 0, l = s.length; i < l; i++) {
      n = s.charCodeAt(i)
        .toString(16)
      o += n.length < 2 ? '0' + n : n
    }

    return o
  }

  getRoutingTableRows(routing): Array<{name:string,
                          via:string,
                          interface:string}> {
    const rows = [];
    if (!routing || !this.state.selectedMac) {
      return rows;
    }

    if (!routing || !this.state.selectedMac) {
      return rows;
    }

    let routingTable = routing[this.state.selectedMac];
    if (!routingTable) {
      return rows;
    }

    let routes = routingTable.routes;
    for (let i = 0; i < routes.length; i++) {
      let dest = routes[i].dest;
      let nexthops = routes[i].nexthops;
      var dest_addr = ipaddr.fromByteArray(Buffer.from(dest.prefixAddress.addr, 'ASCII'));
      for (let j = 0; j < nexthops.length; j++) {
        let nextHop = nexthops[j];
        var nextHop_addr = ipaddr.fromByteArray(Buffer.from(nextHop.addr, 'ASCII'));
        rows.push(
          {
            ip: j==0 ? dest_addr : "",
            n_ip: nextHop_addr,
            n_ifName: nextHop.ifName,
            n_port: nextHop.port,
            key: dest_addr+j,
          },
        );
      }
    }
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    this.setState({
      selectedMac: row.mac,
    });
    // dispatch event for the map
    Dispatcher.dispatch({
      actionType: Actions.NODE_SELECTED,
      nodesSelected: [row.name],
    });
  }

  render() {

    var selectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(238, 193, 213)",
      onSelect: this.tableOnRowSelect.bind(this),
    };

    if (!this.props.topology) {
      return (
        <div>Nothing to show</div>
      )
    }

    var layout = [
      {i: 'a', x: 0, y: 0, w: 2, h: 1, static: true},
      {i: 'b', x: 2, y: 0, w: 10, h: 1, static: true}
    ];
    return (
      <ReactGridLayout className="layout" layout={layout} cols={12} rowHeight={this.props.height-30}>
        <div key={'a'}>
          <BootstrapTable
              height={(this.props.height-50)+'px'}
              key="nodeSelectTable"
              data={this.getTableRows(this.props.topology.nodes)}
              selectRow={selectRowProp}>
            <TableHeaderColumn width="180" dataField="name" isKey>Name</TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="mac" hidden>Mac</TableHeaderColumn>
          </BootstrapTable>
        </div>
        <div key={'b'}>
        <BootstrapTable
            height={(this.props.height-50)+'px'}
            key="routingTable"
            data={this.getRoutingTableRows(this.props.routing)}>
          <TableHeaderColumn width="180" dataField="key" isKey hidden>key</TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="ip">Destination</TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="n_ip">Via</TableHeaderColumn>
          <TableHeaderColumn width="80" dataField="n_port">Port</TableHeaderColumn>
          <TableHeaderColumn dataField="n_ifName">Interface</TableHeaderColumn>
        </BootstrapTable>
        </div>
      </ReactGridLayout>
    );
  }
}
