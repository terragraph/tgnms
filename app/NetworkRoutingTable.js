import React from 'react';
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

import ipaddr from 'ipaddr.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ReactGridLayout, { WidthProvider } from 'react-grid-layout';
const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);

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
    // node ip -> name
    let ipToName = {};
    this.props.topology.nodes.forEach(node => {
      if (node.status &&
          node.status.ipv6Address &&
          node.status.ipv6Address.length) {
        let nodeParts = ipaddr.parse(node.status.ipv6Address);
        if (nodeParts.parts.length != 8) {
          return;
        }
        // only use the first 64 bits
        for (let i = 4; i < 8; i++ ) {
          nodeParts.parts[i] = 0;
        }
        ipToName[nodeParts.toString()] = node.name;
      }
    });

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
      let destAddr = ipaddr.fromByteArray(Buffer.from(dest.prefixAddress.addr, 'ASCII')).toString();
      let destHost = destAddr in ipToName ? ipToName[destAddr] : '';
      for (let j = 0; j < nexthops.length; j++) {
        let nextHop = nexthops[j];
        let nextHopAddr = ipaddr.fromByteArray(Buffer.from(nextHop.addr, 'ASCII')).toString();
        // match dest to a node address
        rows.push(
          {
            dst_ip: j==0 ? destAddr : "",
            dst_host: destHost,
            n_ip: nextHopAddr,
            n_ifName: nextHop.ifName,
            n_port: nextHop.port,
            key: destAddr+j,
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
      bgColor: "rgb(183,210,255)",
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
      <ReactGridLayoutWidthProvider
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={this.props.height-30}>
        <div key={'a'}>
          <BootstrapTable
              height={(this.props.height-50)+'px'}
              key="nodeSelectTable"
              data={this.getTableRows(this.props.topology.nodes)}
              selectRow={selectRowProp}>
            <TableHeaderColumn width="180" dataField="name" isKey>
              Name
            </TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="mac" hidden>
              Mac
            </TableHeaderColumn>
          </BootstrapTable>
        </div>
        <div key={'b'}>
        <BootstrapTable
            height={(this.props.height-50)+'px'}
            key="routingTable"
            data={this.getRoutingTableRows(this.props.routing)}>
          <TableHeaderColumn width="180" dataField="key" isKey hidden>
            key
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="dst_ip">
            Destination IP
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="dst_host">
            Destination Host
          </TableHeaderColumn>
          <TableHeaderColumn width="180" dataField="n_ip">
            Via
          </TableHeaderColumn>
          <TableHeaderColumn width="80" dataField="n_port">
            Port
          </TableHeaderColumn>
          <TableHeaderColumn dataField="n_ifName">
            Interface
          </TableHeaderColumn>
        </BootstrapTable>
        </div>
      </ReactGridLayoutWidthProvider>
    );
  }
}

NetworkRoutingTable.propTypes = {
  height: React.PropTypes.number.isRequired,
  topology: React.PropTypes.object.isRequired,
  routing: React.PropTypes.object,
};
