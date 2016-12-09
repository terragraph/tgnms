import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

export default class NetworkAdjacencyTable extends React.Component {
  constructor(props) {
    super(props);
  }

  getNodeName(mac): string {
    var name = '';
    mac = mac.replace(/\./g, ':');
    Object.keys(this.props.topology.nodes).forEach(nodeName => {
      let node = this.props.topology.nodes[nodeName];
      if (node.mac_addr == mac) {
        name = node.name;
      }
    });
    return name;
  }

  getTableRows(adjMap): Array<{name:string,
                          n_name:string,
                          n_mac:string,
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
      bgColor: "rgb(238, 193, 213)",
      onSelect: this.tableOnRowSelect
    };

    if (!this.props.adjacencies) {
      return (
        <div>Nothing to show</div>
      )
    }

    return (
      <BootstrapTable
          height={this.props.height}
          key="adjacencyTable"
          data={this.getTableRows(this.props.adjacencies)}
          selectRow={selectRowProp}>
        <TableHeaderColumn width="180" dataField="key" isKey hidden>key</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="name">Node Name</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="n_name">Neighbour Name</TableHeaderColumn>
        <TableHeaderColumn width="180" dataField="n_mac">Neighbour MAC</TableHeaderColumn>
        <TableHeaderColumn width="80" dataField="metric">Metric</TableHeaderColumn>
        <TableHeaderColumn dataField="interface">Interface</TableHeaderColumn>
      </BootstrapTable>
    );
  }
}
