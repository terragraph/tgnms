import React from 'react';
import { render } from 'react-dom';
import equals from "equals";
// dispatcher
import { Actions } from './constants/NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './stores/NetworkStore.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';
var FileSaver = require('file-saver');
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
  controllerIp: undefined
  state = {
    pendingConfigs: {},
  }

  constructor(props) {
    super(props);
    this.downloadTopology = this.downloadTopology.bind(this);
  }

  saveConfig() {
    // push config to server
    swal({
      title: "Are you sure?",
      text: "This will overwrite the config on disk",
      showCancelButton: true,
    }, function() {
      // do it!
      let topologies = Object.values(this.state.pendingConfigs).map(config => {
        let topology_file_name = 'topology_file' in config ?
          config.topology_file :
          config.name.replace(/\s+/g, '_') + ".json";
        let newConfig = {
          ...config,
          topology_file: topology_file_name,
        };
        // don't store the state
        delete newConfig['name'];
        delete newConfig['controller_online'];
        delete newConfig['aggregator_online'];
        delete newConfig['modified'];
        return newConfig;
      });
      let configSave = new Request('/config/save', {
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({
          use_tile_proxy: false,
          refresh_interval: 5000,
          topologies: topologies,
        }, null, 4),
      });
      fetch(configSave).then(function(response) {
        if (response.status == 200) {
          response.json().then(function(json) {
            swal({title: "Config saved!"});
          });
        } else {
          swal({title: "Failed updating config"});
        }
      }.bind(this));
    }.bind(this));
  }

  compareConfigs(oldConfig, newConfig) {
    // compare all non-state attributes
    return (oldConfig.controller_ip == newConfig.controller_ip &&
            oldConfig.aggregator_ip == newConfig.aggregator_ip &&
            oldConfig.latitude == newConfig.latitude &&
            oldConfig.longitude == newConfig.longitude &&
            oldConfig.name == newConfig.name &&
            oldConfig.site_coords_override == newConfig.site_coords_override &&
            oldConfig.zoom_level == newConfig.zoom_level);
  }

  componentWillReceiveProps(nextProps) {
    this.updateConfigs(nextProps);
  }

  updateConfigs(props) {
    let diskConfigs = {};
    props.config.forEach(config => {
      if (config.name in this.state.pendingConfigs) {
        // existing, compare non-state attributes
        let oldConfig = this.state.pendingConfigs[config.name];
        if (!this.compareConfigs(this.state.pendingConfigs[config.name], config)) {
          // use existing config
          config = this.state.pendingConfigs[config.name];
          // should already be set as modified
          config.modified = true;
        }
      } else {
        // new config, use online/offline status
        // new name, fetch controller ip
        if (!config.controller_ip.length) {
          // auto-fail empty address
          config.controller_online = false;
          delete config['topology'];
        } else {
          let controllerTopo = new Request(
            '/topology/fetch/' + config.controller_ip,
            {
              credentials: 'same-origin',
            });
          fetch(controllerTopo).then(function(response) {
            if (response.status == 200) {
              response.json().then(function(json) {
                config.controller_status = true;
                config.topology = json;
              });
            } else {
              config.controller_online = false;
              delete config['topology'];
            }
          }.bind(this));
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

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
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

  getTableRows(): Array<> {
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
        <img src={"/static/images/" + imgFile}
             className="controller-status-icon" />
      </span>
    );
  }
  // render controller + aggregator online state
  // compare configured + new
  renderStatusColor(cell, row) {
    // color-code based on state of controller IP
    return (
      <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
        {"" + cell}
      </span>);
  }

  downloadTopology(name, filename) {
    let topoGetFetch = new Request('/topology/get_stateless/' +
      name, {"credentials": "same-origin"});
    fetch(topoGetFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          let str = JSON.stringify(json.topology, null, '\t');
          var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
          FileSaver.saveAs(blob, filename);
        }.bind(this));
      }
    }.bind(this));
  }

  renderActions(cell, row) {
    return (
      <div><span className="details-link" onClick={() => {this.downloadTopology(row.name, row.topology_file)}}>Download Topology</span></div>);
  }

  beforeSaveCell(row, cellName, cellValue) {
    if (cellName == 'controller_ip') {
      if (row.controller_ip == cellValue) {
        // unchanged
        return false;
      }
      // ensure IP address not in use
      let ipInUse = false;
      Object.values(this.state.pendingConfigs).forEach(config => {
        if (cellValue == config.controller_ip) {
          ipInUse = true;
          swal({
            title: "IP in use",
            text: "IP already in use by <b>" + config.name + "</b>",
            html: true,
          });
        }
      });
      if (ipInUse) {
        return false;
      }
      row.modified = true;
      // save the old if we need to roll-back
      row.old_controller_ip = row.controller_ip;
      // unset the address so we can re-check the controller+agg
      delete row['controller_online'];
      delete row['topology'];
      // TODO - handle aggregator checks
//      delete row['aggregator_online'];
      let controllerTopo = new Request('/topology/fetch/' + cellValue, {
        credentials: 'same-origin',
      });
      fetch(controllerTopo).then(function(response) {
        if (response.status == 200) {
          response.json().then(function(json) {
            let newConfigs = this.state.pendingConfigs;
            if (row.name != json.name) {
              swal({
                title: "Topology mis-match",
                text: "The new topology name doesn't match the existing." +
                      "<br />Refusing to update controller IP.<br /><br />" +
                      "New: <b>" + json.name + "</b><br />" +
                      "Existing: <b>" + row.name + "</b>",
                html: true,
              });
              // use the old address
              newConfigs[row.name].controller_ip = newConfigs[row.name].old_controller_ip;
            } else if (json.name.length == 0) {
              swal({
                title: "Missing topology name",
                text: "The new topology doesn't have a name set, " +
                      "please set one and try again."
              });
              // use the old address
              newConfigs[row.name].controller_ip = newConfigs[row.name].old_controller_ip;
            } else {
              newConfigs[row.name].controller_online = true;
              newConfigs[row.name].controller_ip = cellValue;
              newConfigs[row.name].topology = json;
            }
            this.setState({
              pendingConfigs: newConfigs,
            });
          }.bind(this));
        } else {
          // work-around due to bug in sweetalert
          // https://github.com/t4t5/sweetalert/issues/632
          let _this = this;
          // failed, prompt to update address
          swal({
            title: "Controller offline",
            text: "The controller <b>" + cellValue + "</b> is not responding" +
                  ", are you sure you want to make this change?",
            html: true,
            showCancelButton: true,
            confirmButtonText: "Use New",
            cancelButtonText: "Use Existing",
          }, function (isConfirm) {
            let newConfigs = _this.state.pendingConfigs;
            if (isConfirm) {
              // user confirmed to update address
              newConfigs[row.name].controller_online = false;
              delete newConfigs[row.name]['topology'];
            } else {
              // user cancelled, restore old address
              newConfigs[row.name].controller_ip = newConfigs[row.name].old_controller_ip;
              delete newConfigs[row.name]['old_controller_ip'];
            }
            _this.setState({
              pendingConfigs: newConfigs,
            });
          });
        }
      }.bind(this));
    }
    return true;
  }

  addNewRow() {
    let controllerIp = this.controllerIp.value;
    // sanity check input
    if (controllerIp.length == 0) {
      return;
    }
    // verify ip isn't a duplicate
    let found = null;
    Object.values(this.state.pendingConfigs).forEach(config => {
      if (config.controller_ip == controllerIp) {
        found = config;
      }
    });
    if (found != null) {
      swal({
        title: "Existing controller",
        text: "Topology already exists for '" + found.name + "'!",
      });
      return;
    }
    // clear current value
    this.controllerIp.value = '';
    // fetch topology data
    let controllerTopo = new Request('/topology/fetch/' + controllerIp, {
      credentials: 'same-origin',
    });
    fetch(controllerTopo).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          // build new config struct
          if (json.name.length == 0) {
            swal({
              title: "Missing topology name",
              text: "The new topology doesn't have a name set, " +
                    "please set one and try again."
            });
            return;
          }
          let newConfig = {
            controller_ip: controllerIp,
            controller_online: true,
            aggregator_ip: controllerIp,
            name: json.name,
            modified: true,
            topology: json,
            // default data
            latitude: 37.4848280435154,
            longitude: -122.1472245455607,
            zoom_level: 18,
          };
          let newConfigs = this.state.pendingConfigs;
          if (json.name in this.state.pendingConfigs) {
            // we matched an existing topology
            swal({
              title: "Existing topology",
              text: "A topology exists with the same name <b>" +
                    json.name + "</b>, overwrite?",
              html: true,
              confirmButtonText: "Overwrite",
              showCancelButton: true,
            }, function(isConfirm) {
              newConfigs[json.name] = newConfig;
              this.setState({
                pendingConfigs: newConfigs,
              });
            }.bind(this));
          } else {
            // looks new, add
            newConfigs[json.name] = newConfig;
            this.setState({
              pendingConfigs: newConfigs,
            });
          }
        }.bind(this));
      } else {
        swal({
          title: "Failed to connect",
          text: "Unable to connect to " + controllerIp + "<br />Add anyways?",
          html: true,
          showCancelButton: true,
        }, function() {
          let newConfig = {
            controller_ip: controllerIp,
            controller_online: false,
            aggregator_ip: controllerIp,
            name: 'Unknown topology',
            modified: true,
          };
          let newConfigs = this.state.pendingConfigs;
          newConfigs[newConfig.name] = newConfig;
          this.setState({
            pendingConfigs: newConfigs,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  render() {
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
    };
    const cellEditProp = {
      mode: 'click',
      blurToSave: true,
      beforeSaveCell: this.beforeSaveCell.bind(this),
    };

    let linksTable =
      <BootstrapTable
          key="configTable"
          cellEdit={cellEditProp}
          data={this.getTableRows()}
          striped={true}
          hover={true}
          options={tableOpts}
          selectRow={linksSelectRowProp}>
       <TableHeaderColumn width="200"
                          dataSort={true}
                          dataField="name"
                          isKey={ true }
                          editable={false}
                          sortFunc={this.linkSortFunc}>
          Name
        </TableHeaderColumn>
        <TableHeaderColumn width="300"
                           dataSort={true}
                           dataFormat={this.renderOnlineIcon}
                           dataField="controller_ip">
          Controller IP
        </TableHeaderColumn>
        <TableHeaderColumn width="300"
                           dataSort={true}
                           editable={false}
                           dataField="aggregator_ip">
          Aggregator IP
        </TableHeaderColumn>
        <TableHeaderColumn width="120"
                           dataSort={true}
                           dataField="latitude">
          Latitude
        </TableHeaderColumn>
        <TableHeaderColumn width="120"
                           dataSort={true}
                           dataField="longitude">
          Longitude
        </TableHeaderColumn>
        <TableHeaderColumn width="80"
                           dataSort={true}
                           dataField="zoom_level">
          Zoom Level
        </TableHeaderColumn>
        <TableHeaderColumn width="80"
                           dataSort={true}
                           dataField="site_coords_override">
          Site Coordinates Override
        </TableHeaderColumn>
        <TableHeaderColumn width="100"
                           dataSort={true}
                           dataFormat={this.renderStatusColor}
                           editable={false}
                           dataField="modified">
          Modified
        </TableHeaderColumn>
        <TableHeaderColumn width="120"
                           dataFormat={this.renderActions.bind(this)}
                           editable={false}>
          Actions
        </TableHeaderColumn>
      </BootstrapTable>;
    return (
      <div className='rc-nms-config'>
        <h3>Config editing is mostly working, but has brought up issues with the way we instantiate props/state in some components. There are still bugs to work out and to make this process much more solid. Please don't save the config without checking with Paul/Tariq for now.</h3>
        {linksTable}
        <div style={{border: '1px solid #ccc'}}>
          <span style={{marginRight: '10px'}}>Controller IP</span>
          <input ref={(input) => {this.controllerIp = input}} />
          <button onClick={this.addNewRow.bind(this)} className="graph-button">
            Add Topology
          </button>
        </div>
        <button onClick={this.saveConfig.bind(this)} className="graph-button">
          Save Config
        </button>
      </div>
    );
  }
}
NMSConfig.propTypes = {
  config: React.PropTypes.array.isRequired,
};
