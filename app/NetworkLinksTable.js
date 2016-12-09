import React from 'react';
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

export default class NetworkLinksTable extends React.Component {
  state = {
    selectedLink: null,
  }

  constructor(props) {
    super(props);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
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
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedLink: null,
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
      bgColor: "rgb(238, 193, 213)",
      onSelect: this.tableOnRowSelect
    };

    let linksData = [];
    if (this.props.topology &&
        this.props.topology.links) {
      linksData = this.props.topology.links;
    }

    return (
      <BootstrapTable
          height={this.props.height}
          key="linksTable"
          data={this.getTableRows(linksData)}
          striped={true} hover={true}
          selectRow={linksSelectRowProp}>
        <TableHeaderColumn width="350" dataSort={true} dataField="name" isKey={ true }>Name</TableHeaderColumn>
        <TableHeaderColumn width="180" dataSort={true} dataField="a_node_name">A-Node</TableHeaderColumn>
        <TableHeaderColumn width="180" dataSort={true} dataField="z_node_name">Z-Node</TableHeaderColumn>
        <TableHeaderColumn width="80" dataSort={true} dataField="alive">Alive</TableHeaderColumn>
        <TableHeaderColumn dataSort={true} dataField="type">Type</TableHeaderColumn>
      </BootstrapTable>
    );
  }
}
