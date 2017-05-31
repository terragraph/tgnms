import React from 'react';
import { render } from 'react-dom';
import equals from "equals";
// dispatcher
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
import ReactEventChart from './ReactEventChart.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

var linkNyName = {};

export default class NetworkLinksTable extends React.Component {
  nodesByName = {}
  linksByName = {}
  state = {
    sortName: undefined,
    sortOrder: undefined,
    selectedLink: null,
    networkHealth: NetworkStore.networkHealth,
    hideWired: false,
    toplink: null,
    // 0 = no status, 1 = sent request, 2 = request success, 3 = request error
    linkRequestButtonEnabled: true,
  }

  constructor(props) {
    super(props);
    this.tableOnRowSelect = this.tableOnRowSelect.bind(this);
    this.linkSortFunc = this.linkSortFunc.bind(this);
    this.getTableRows = this.getTableRows.bind(this);
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // show initial selected link
    if (NetworkStore.selectedName &&
        NetworkStore.selectedName in this.linksByName) {
      this.setState({
        selectedLink: this.linksByName[NetworkStore.selectedName],
      });
    }
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  updateMappings(topology) {
    this.linksByName = {};
    if (topology.links) {
      topology.links.forEach(link => {
        if (this.state.networkHealth &&
            this.state.networkHealth.links &&
            link.name in this.state.networkHealth.links) {
          let nodeHealth = this.state.networkHealth.links[link.name];
          link.alive_perc = nodeHealth.alive;
          link.events = nodeHealth.events;
        }
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
          linkRequestButtonEnabled: true,
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          sortName: payload.source == "table" ? this.state.sortName : "name",
          sortOrder: payload.source == "table" ? this.state.sortOrder : "asc",
          topLink: payload.source == "table" ? this.state.topLink : payload.link,
          selectedLink: payload.link,
          linkRequestButtonEnabled: true,
        });
        break;
      case Actions.TOPOLOGY_REFRESHED:
        if (this.state.selectedLink) {
          // check if we need to update selected link
          payload.networkConfig.topology.links.forEach(link => {
            if (link.name == this.state.selectedLink.name) {
              // compare objects
              if (!equals(link, this.state.selectedLink)) {
                this.setState({
                  selectedLink: link,
                });
              }
            }
          });
        }
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          networkHealth: payload.health,
        });
        break;
    }
  }

  linkSortFunc(a, b, order) {   // order is desc or asc
    if (this.state.topLink) {
      if (a.name == this.state.topLink.name) {
        return -1;
      } else if (b.name == this.state.topLink.name) {
        return 1;
      }
    }

    if (order === 'desc') {
      if (a.name > b.name) {
        return -1;
      } else if (a.name < b.name) {
        return 1;
      }
      return 0;
    } else {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }
      return 0;
    }
  }

  onSortChange(sortName, sortOrder) {
    this.setState({
      sortName,
      sortOrder,
      toplink: sortName=="name" ? this.state.toplink : null,
    });
  }

  getTableRows(): Array<{name:string,
                         a_node_name:string,
                         z_node_name:string,
                         alive:boolean}> {
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
      rows.push({
        name: link.name,
        a_node_name: link.a_node_name,
        z_node_name: link.z_node_name,
        alive: link.is_alive,
        type: link.link_type == 1 ? 'Wireless' : 'Wired',
        alive_perc: link.alive_perc,
        linkup_attempts: linkupAttempts,
      });
    });
    return rows;
  }

  tableOnRowSelect(row, isSelected) {
    Dispatcher.dispatch({
      actionType: Actions.LINK_SELECTED,
      link: this.linksByName[row.name],
      source: "table",
    });
  }

  renderAlivePerc(cell, row) {
    let cellColor = 'red';
    let cellText = '-';
    if (row.type == "Wired") {
      // color wired links as unavailable
      cellColor = 'grey';
      cellText = 'X';
    } else if (cell) {
      cellText = Math.round(cell * 100) / 100;
      if (cellText >= 99.99) {
        cellColor = 'green';
      } else if (cellText >= 99) {
        cellColor = 'yellowgreen';
      } else {
        cellColor = 'red';
      }
    }
    return (
      <span style={{color: cellColor}}>
        {"" + cellText}
      </span>
    );
  }

  renderStatusColor(cell, row) {
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {"" + cell}
      </span>);
  }

  render() {
    // update topology to health mappings
    this.updateMappings(this.props.topology);
    var linksSelectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect,
      selected: this.state.selectedLink ? [this.state.selectedLink.name] : [],
    };
    const tableOpts = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
      onSortChange: this.onSortChange.bind(this),
    };

    let linksTable =
      <BootstrapTable
          height={(this.props.height - (this.state.selectedLink ? 100 : 0)) + 'px'}
          key="linksTable"
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}>
       <TableHeaderColumn width="350"
                          dataSort={true}
                          dataField="name"
                          isKey={ true }
                          sortFunc={this.linkSortFunc}>
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
                           dataFormat={this.renderStatusColor}
                           dataField="alive">
          Alive
        </TableHeaderColumn>
        <TableHeaderColumn width="140"
                           dataSort={true}
                           dataField="alive_perc"
                           dataFormat={this.renderAlivePerc}>
          Uptime (24 hours)
        </TableHeaderColumn>
        <TableHeaderColumn dataSort={true}
                           dataField="type">
          Type
        </TableHeaderColumn>
        <TableHeaderColumn dataSort={true}
                           dataField="linkup_attempts">
          Attempts
        </TableHeaderColumn>
      </BootstrapTable>;
    let eventChart;
    if (this.state.selectedLink &&
        this.state.selectedLink.a_node_name in this.nodesByName &&
        this.state.selectedLink.z_node_name in this.nodesByName) {
      // chart options
      let aNode = this.nodesByName[this.state.selectedLink.a_node_name];
      let zNode = this.nodesByName[this.state.selectedLink.z_node_name];
      let opts = [{
        type: 'link',
        a_node: {name: aNode.name, mac: aNode.mac_addr},
        z_node: {name: zNode.name, mac: zNode.mac_addr},
        keys: ['link_status'],
      }];
      let link = this.linksByName[this.state.selectedLink.name];
      if (link.events && link.events.length > 0) {
        let startTime = this.state.networkHealth.start;
        let endTime = this.state.networkHealth.end;
        eventChart =
          <li key="eventsChart" style={{height: '75px'}}>
            <ReactEventChart options={opts}
                             events={link.events}
                             startTime={startTime}
                             endTime={endTime}
                             size="small" />
          </li>;
      }
    }
    return (
      <ul style={{listStyleType: 'none', paddingLeft: '0px'}}>
        {eventChart}
        <li key="linksTable">
          <button className={this.state.hideWired ? 'graph-button graph-button-selected' : 'graph-button'}
                  onClick={btn => this.setState({hideWired: !this.state.hideWired})}>
            Hide Wired
          </button>
          {linksTable}
        </li>
      </ul>
    );
  }
}
NetworkLinksTable.propTypes = {
  topology: React.PropTypes.object.isRequired,
};
