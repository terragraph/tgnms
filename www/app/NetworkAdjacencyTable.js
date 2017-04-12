import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import ipaddr from 'ipaddr.js';

export default class NetworkAdjacencyTable extends React.Component {
  constructor(props) {
    super(props);
  }

  getNodeName(mac): string {
    var name = '';
    mac = mac.replace(/\./g, ':').toUpperCase();
    Object.keys(this.props.topology.nodes).forEach(nodeName => {
      let node = this.props.topology.nodes[nodeName];
      if (node.mac_addr.toUpperCase() == mac) {
        name = node.name;
      }
    });
    return name;
  }

  getTableRows(adjMap): Array<{name:string,
                          n_name:string,
                          n_mac:string,
                          n_ipv6:string,
                          metric:number,
                          interface:string}> {
    const rows = [];
    if (!adjMap) {
      return rows;
    }

    Object.keys(adjMap).forEach(name => {
      let vec = adjMap[name].adjacencies;
      for (let j = 0; j < vec.length; j++) {
        rows.push(
          {
            name: j==0 ? this.getNodeName(name.slice(5)) : "",
            n_name: this.getNodeName(vec[j].otherNodeName.slice(5)),
            n_mac: vec[j].otherNodeName.slice(5),
            n_ipv6: ipaddr.fromByteArray(Buffer.from(vec[j].nextHopV6.addr, 'ASCII')).toString(),
            metric: vec[j].metric,
            interface: vec[j].ifName,
            key: name+j,
          },
        );
      }
    });
    return rows;
  }

  render() {

    var selectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect
    };

    if (!this.props.routing ||
        !this.props.routing.status ||
        !this.props.routing.status.adjacencyMap) {
      return (
        <div>Nothing to show</div>
      )
    }

    return (
      <BootstrapTable
          height={this.props.height + 'px'}
          key="adjacencyTable"
          data={this.getTableRows(this.props.routing.status.adjacencyMap)}
          selectRow={selectRowProp}>
        <TableHeaderColumn width="180" dataField="key" isKey hidden>key</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="name">Node Name</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="n_name">Neighbour Name</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="n_mac">Neighbour MAC</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="n_ipv6">Neighbour IPv6</TableHeaderColumn>
        <TableHeaderColumn width="80" dataField="metric">Metric</TableHeaderColumn>
        <TableHeaderColumn dataField="interface">Interface</TableHeaderColumn>
      </BootstrapTable>
    );
  }
}
