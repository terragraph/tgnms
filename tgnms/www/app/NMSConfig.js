/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from './NetworkDispatcher.js';
import axios from 'axios';
import PropTypes from 'prop-types';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import React from 'react';
import swal from 'sweetalert';
/**
 * Allow editing instance configuration, such as controller + aggregator IPs.
 *
 * The config on disk is passed as a prop 'config'.
 * We need to keep a separate copy to modify and test connectivity.
 *
 * Options:
 * 1.) Output a new config (JSON) to the user that they can use to modify.
 * 2.) Modify in place and force a refresh on the server. This lacks any
 *     permissions checks.
 */
export default class NMSConfig extends React.Component {
  controllerIp: undefined;
  state = {
    pendingConfigs: {},
  };

  constructor(props) {
    super(props);
    this.downloadTopology = this.downloadTopology.bind(this);
  }

  compareConfigs(oldConfig, newConfig) {
    // compare all non-state attributes
    return (
      oldConfig.controller_ip === newConfig.controller_ip &&
      oldConfig.aggregator_ip === newConfig.aggregator_ip &&
      oldConfig.latitude === newConfig.latitude &&
      oldConfig.longitude === newConfig.longitude &&
      oldConfig.name === newConfig.name &&
      oldConfig.site_coords_override === newConfig.site_coords_override &&
      oldConfig.zoom_level === newConfig.zoom_level
    );
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.updateConfigs(nextProps);
  }

  updateConfigs(props) {
    const diskConfigs = {};
    props.config.forEach(config => {
      if (config.name in this.state.pendingConfigs) {
        // existing, compare non-state attributes
        const oldConfig = this.state.pendingConfigs[config.name];
        if (!this.compareConfigs(oldConfig, config)) {
          // use existing config
          config = oldConfig;
          // should already be set as modified
          config.modified = true;
        }
      } else {
        // new config, use online/offline status
        // new name, fetch controller ip
        if (!config.controller_ip.length) {
          // auto-fail empty address
          config.controller_online = false;
          delete config.topology;
        } else {
          config.controller_status = false;
        }
      }
      diskConfigs[config.name] = config;
    });
    // add new configs
    Object.values(this.state.pendingConfigs).forEach(config => {
      if (!(config.name in diskConfigs) && config.modified) {
        diskConfigs[config.name] = config;
      }
    });
    this.setState({
      pendingConfigs: diskConfigs,
    });
  }

  UNSAFE_componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    this.updateConfigs(this.props);
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
    }
  }

  // eslint-disable-next-line lint/no-unclear-flowtypes
  getTableRows(): Array<any> {
    return Object.values(this.state.pendingConfigs);
  }

  renderOnlineIcon(cell, row) {
    let imgFile = 'load.gif';
    if ('controller_online' in row) {
      imgFile = row.controller_online ? 'ok.png' : 'severe.png';
    }
    return (
      <span>
        {cell}
        <img
          src={'/static/images/' + imgFile}
          className="controller-status-icon"
        />
      </span>
    );
  }
  // render controller + aggregator online state
  // compare configured + new
  renderStatusColor(cell, row) {
    // color-code based on state of controller IP
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {'' + cell}
      </span>
    );
  }

  downloadTopology(name, filename) {
    axios.get('/topology/get_stateless/' + name).then(response => {
      const str = JSON.stringify(response.data.topology, null, '\t');
      const blob = new Blob([str], {type: 'text/plain;charset=utf-8'});
      window.FileSaver.saveAs(blob, filename);
    });
  }

  renderActions(cell, row) {
    return (
      <div>
        <span
          className="details-link"
          onClick={() => {
            this.downloadTopology(row.name, row.topology_file);
          }}>
          Download Topology
        </span>
      </div>
    );
  }

  render() {
    const linksSelectRowProp = {
      mode: 'radio',
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: 'rgb(183,210,255)',
      onSelect: this.tableOnRowSelect,
      selected: this.state.selectedLink ? [this.state.selectedLink.name] : [],
    };
    const tableOpts = {
      sortName: this.state.sortName,
      sortOrder: this.state.sortOrder,
    };
    const cellEditProp = {
      mode: 'click',
      blurToSave: true,
    };

    const linksTable = (
      <BootstrapTable
        key="configTable"
        cellEdit={cellEditProp}
        data={this.getTableRows()}
        striped={true}
        hover={true}
        options={tableOpts}
        selectRow={linksSelectRowProp}>
        <TableHeaderColumn
          width="200"
          dataSort={true}
          dataField="name"
          isKey={true}
          editable={false}
          sortFunc={this.linkSortFunc}>
          Name
        </TableHeaderColumn>
        <TableHeaderColumn
          width="300"
          dataSort={true}
          dataFormat={this.renderOnlineIcon}
          dataField="controller_ip">
          Controller IP
        </TableHeaderColumn>
        <TableHeaderColumn
          width="300"
          dataSort={true}
          editable={false}
          dataField="aggregator_ip">
          Aggregator IP
        </TableHeaderColumn>
        <TableHeaderColumn width="120" dataSort={true} dataField="latitude">
          Latitude
        </TableHeaderColumn>
        <TableHeaderColumn width="120" dataSort={true} dataField="longitude">
          Longitude
        </TableHeaderColumn>
        <TableHeaderColumn width="80" dataSort={true} dataField="zoom_level">
          Zoom Level
        </TableHeaderColumn>
        <TableHeaderColumn
          width="80"
          dataSort={true}
          dataField="site_coords_override">
          Site Coordinates Override
        </TableHeaderColumn>
        <TableHeaderColumn
          width="100"
          dataSort={true}
          dataFormat={this.renderStatusColor}
          editable={false}
          dataField="modified">
          Modified
        </TableHeaderColumn>
        <TableHeaderColumn
          width="120"
          dataFormat={this.renderActions.bind(this)}
          editable={false}>
          Actions
        </TableHeaderColumn>
      </BootstrapTable>
    );
    return <div className="rc-nms-config">{linksTable}</div>;
  }
}
NMSConfig.propTypes = {
  config: PropTypes.array.isRequired,
};
