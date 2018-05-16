/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from "react";
import { render } from "react-dom";
// dispatcher
import { Actions } from "./constants/NetworkConstants.js";
import Dispatcher from "./NetworkDispatcher.js";

import ipaddr from "ipaddr.js";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";
import ReactGridLayout, { WidthProvider } from "react-grid-layout";
const ReactGridLayoutWidthProvider = WidthProvider(ReactGridLayout);

export default class NetworkRoutingTable extends React.Component {
  state = {
    selectedSourceNode: null,
    routingTableRows: []
  };

  constructor(props) {
    super(props);
    this.getRoutingTableRows = this.getRoutingTableRows.bind(this);
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

  componentDidUpdate() {
    if (
      this.state.destinationPrefix &&
      this.state.selectedSourceNode &&
      this.nodeMacToNode[this.state.selectedSourceNode.mac] &&
      this.globalPrefixToNode[this.state.destinationPrefix]
    ) {
      // Because we can not dispatch withing a dispatch, delay by 1 ms
      setTimeout(
        function() {
          this.calcRoutingPath(
            this.nodeMacToNode[this.state.selectedSourceNode.mac],
            this.globalPrefixToNode[this.state.destinationPrefix]
          );
        }.bind(this),
        1
      );
    }
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.setState({
          selectedSourceNode: null
        });
        break;
    }
  }

  getTableRows(
    nodes
  ): Array<{
    name: string,
    _name: string,
    mac: string
  }> {
    const rows = [];
    Object.keys(nodes).forEach(nodeName => {
      let node = nodes[nodeName];
      rows.push({
        name: node.name + (node.pop_node ? " (POP)" : ""),
        _name: node.name,
        mac: node.mac_addr.toUpperCase(),
        key: node.name
      });
    });
    return rows;
  }

  bin2hex(s) {
    var i;
    var l;
    var o = "";
    var n;

    s += "";

    for (i = 0, l = s.length; i < l; i++) {
      n = s.charCodeAt(i).toString(16);
      o += n.length < 2 ? "0" + n : n;
    }

    return o;
  }

  getIpv6Prefix64(ipv6) {
    try {
      let nodeParts = ipaddr.parse(ipv6);
      if (nodeParts.parts.length != 8) {
        return "";
      }
      // only use the first 64 bits
      for (let i = 4; i < 8; i++) {
        nodeParts.parts[i] = 0;
      }
      return nodeParts.toString();
    } catch (ex) {
      return "";
    }
  }

  getRoutingTableRows(routing) {
    // node ip -> name
    const rows = [];
    if (!routing || !this.state.selectedSourceNode) {
      return rows;
    }
    if (!routing.hasOwnProperty(this.state.selectedSourceNode.mac)) {
      return rows;
    }
    let routingTable = routing[this.state.selectedSourceNode.mac];
    if (
      !this.props.routing ||
      !this.props.routing.hasOwnProperty("AdjMapAcuum") ||
      !this.props.routing.AdjMapAcuum.hasOwnProperty(
        this.state.selectedSourceNode.mac.toUpperCase()
      )
    ) {
      return rows;
    }

    let nodeAdj = this.props.routing.AdjMapAcuum[
      this.state.selectedSourceNode.mac.toUpperCase()
    ];

    if (!routingTable) {
      return rows;
    }

    let routes = routingTable.routes;
    for (let i = 0; i < routes.length; i++) {
      let dest = routes[i].dest;
      let nexthops = routes[i].nexthops;
      let destAddr = ipaddr
        .fromByteArray(Buffer.from(dest.prefixAddress.addr, "ASCII"))
        .toString();
      let destNode =
        destAddr in this.globalPrefixToNode
          ? this.globalPrefixToNode[destAddr]
          : null;
      for (let j = 0; j < nexthops.length; j++) {
        let nextHop = nexthops[j];
        let nextHopAddr = ipaddr
          .fromByteArray(Buffer.from(nextHop.addr, "ASCII"))
          .toString();
        var nextHopHost = "";
        if (nodeAdj) {
          let nextHopMac = nodeAdj[nextHopAddr];
          if (nextHopMac) {
            let nextHopNode = this.nodeMacToNode[nextHopMac];
            nextHopHost = nextHopNode ? nextHopNode.name : "-";
          }
        }
        // match dest to a node address
        rows.push({
          dst_ip_hidden: destAddr,
          dst_ip: j == 0 ? destAddr : "=",
          dst_host: destNode
            ? destNode.name + (destNode.pop_node ? " (POP)" : "")
            : "-",
          n_host: nextHopHost,
          n_ip: nextHopAddr,
          n_ifName: nextHop.ifName,
          n_port: nextHop.port,
          key: destAddr + j
        });
      }
    }
    this.routingTableRows = rows;
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    this.setState({
      selectedSourceNode: row,
      destinationRowsSelected: [],
      destinationPrefix: null
    });
    // dispatch event for the map
    Dispatcher.dispatch({ actionType: Actions.CLEAR_ROUTE });
    Dispatcher.dispatch({
      actionType: Actions.NODE_SELECTED,
      nodeSelected: row._name,
      source: "routingTable"
    });
  }

  calcRoutingPath(src, finalDest) {
    var myStack = [];
    var validRoute = false;

    if (!src || !finalDest || this.globalPrefixToNode.length < 1) {
      Dispatcher.dispatch({ actionType: Actions.CLEAR_ROUTE });
      return;
    }

    //push source to stack
    myStack.push({
      node: src,
      weight: 100,
      visitedSoFar: []
    });
    let visitedLinksWeights = {};

    //while stack not empty
    while (myStack.length > 0) {
      // pop node
      let currentNode = myStack.pop();
      // TODO - sanity checks
      let routingObj = this.statusReports[
        currentNode.node.mac_addr.toUpperCase()
      ];

      if (!routingObj) {
        console.error("Missing status report for node");
        console.log(currentNode);
        continue;
      }

      if (finalDest.name == currentNode.node.name) {
        // reached desination node
        validRoute = true;
        continue;
      }
      currentNode.visitedSoFar.push(currentNode.node.name);

      Object(routingObj.routes).forEach(destObj => {
        let destAddr = ipaddr
          .fromByteArray(Buffer.from(destObj.dest.prefixAddress.addr, "ASCII"))
          .toString();
        let destNode = this.globalPrefixToNode[destAddr];

        if (destNode && destNode.name == finalDest.name) {
          Object(destObj.nexthops).forEach(hop => {
            let nodeAdj = this.props.routing.AdjMapAcuum[
              currentNode.node.mac_addr.toUpperCase()
            ];
            let nextHopAddr = ipaddr
              .fromByteArray(Buffer.from(hop.addr, "ASCII"))
              .toString();
            if (nodeAdj) {
              // push next hops to stack
              let nextHopMac = nodeAdj[nextHopAddr];
              let nextHopNode = this.nodeMacToNode[nextHopMac];
              let addedWeight = currentNode.weight / destObj.nexthops.length;
              if (
                !nextHopNode ||
                !nextHopNode.name ||
                currentNode.visitedSoFar.includes(nextHopNode.name)
              ) {
                console.error("loop detected");
                console.log(currentNode);
                console.log(nextHopNode);
                console.log(visitedLinksWeights);
                console.log(myStack);
                return;
              }
              var visitedSoFar = currentNode.visitedSoFar.slice();
              myStack.push({
                node: nextHopNode,
                weight: addedWeight,
                visitedSoFar: visitedSoFar
              });
              let linkname =
                currentNode.node.name < nextHopNode.name
                  ? "link-" + currentNode.node.name + "-" + nextHopNode.name
                  : "link-" + nextHopNode.name + "-" + currentNode.node.name;
              if (visitedLinksWeights[linkname]) {
                visitedLinksWeights[linkname] += addedWeight;
              } else {
                visitedLinksWeights[linkname] = addedWeight;
              }
            } else {
              console.error("Node Adj missing");
              console.log(currentNode);
            }
          });
        }
      });
    }

    if (validRoute) {
      // dispatch event for the map
      Dispatcher.dispatch({
        actionType: Actions.DISPLAY_ROUTE,
        routeWeights: visitedLinksWeights,
        routeSourceNode: src,
        routeDestNode: finalDest
      });
    }
  }

  routingTableOnRowSelect(selectedRow, isSelected) {
    if (isSelected) {
      var selected = [];
      Object(this.routingTableRows).forEach(row => {
        if (row.dst_ip_hidden == selectedRow.dst_ip_hidden)
          selected.push(row.key);
      });
      this.setState({
        destinationRowsSelected: selected,
        destinationPrefix: selectedRow.dst_ip_hidden
      });
      this.calcRoutingPath(
        this.nodeMacToNode[this.state.selectedSourceNode.mac],
        this.globalPrefixToNode[selectedRow.dst_ip_hidden]
      );
    } else {
      this.setState({
        destinationRowsSelected: [],
        destinationPrefix: null
      });
      Dispatcher.dispatch({ actionType: Actions.CLEAR_ROUTE });
    }
  }

  render() {
    var selectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect.bind(this)
    };

    var routingSelectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.routingTableOnRowSelect.bind(this),
      selected: this.state.destinationRowsSelected
    };

    if (!this.props.topology) {
      return <div>Nothing to show</div>;
    }

    var layout = [
      { i: "a", x: 0, y: 0, w: 2, h: 1, static: true },
      { i: "b", x: 2, y: 0, w: 10, h: 1, static: true }
    ];

    this.globalPrefixToNode = {};
    this.nodeMacToNode = {};

    this.props.topology.nodes.forEach(node => {
      if (
        node.status_dump &&
        node.status_dump.ipv6Address &&
        node.status_dump.ipv6Address.length
      ) {
        let prefix = this.getIpv6Prefix64(node.status_dump.ipv6Address);
        this.globalPrefixToNode[prefix] = node;
        this.nodeMacToNode[node.mac_addr.toUpperCase()] = node;
      }
    });

    if (this.props.routing.status.statusReports) {
      this.statusReports = {};
      Object.keys(this.props.routing.status.statusReports).forEach(mac => {
        this.statusReports[
          mac.toUpperCase()
        ] = this.props.routing.status.statusReports[mac];
      });
    }

    return (
      <ReactGridLayoutWidthProvider
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={this.props.height - 30}
      >
        <div key={"a"}>
          <BootstrapTable
            height={this.props.height - 50 + "px"}
            key="nodeSelectTable"
            data={this.getTableRows(this.props.topology.nodes)}
            selectRow={selectRowProp}
          >
            <TableHeaderColumn width="180" dataField="name" isKey dataSort>
              Name
            </TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="mac" hidden>
              Mac
            </TableHeaderColumn>
          </BootstrapTable>
        </div>
        <div key={"b"}>
          <BootstrapTable
            height={this.props.height - 50 + "px"}
            key="routingTable"
            data={this.getRoutingTableRows(this.statusReports)}
            selectRow={routingSelectRowProp}
          >
            <TableHeaderColumn width="180" dataField="key" isKey hidden>
              key
            </TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="dst_ip">
              Destination Prefix
            </TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="dst_host">
              Destination Host
            </TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="n_host">
              Via Host
            </TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="n_ip">
              Via IP
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
