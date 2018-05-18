/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'react-tabs/style/react-tabs.css';

import Dispatcher from './NetworkDispatcher.js';
// dispatcher
import {Actions} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import PropTypes from 'prop-types';
import AsyncButton from 'react-async-button';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import {render} from 'react-dom';
import NumericInput from 'react-numeric-input';
// tabs
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import React from 'react';

class ListEditor extends React.Component {
  constructor(props) {
    super(props);
    this.updateData = this.updateData.bind(this);
    this.state = {selectedItem: null};
  }
  focus() {}
  updateData() {
    if (this.state.selectedItem) {
      this.props.onUpdate({item: this.state.selectedItem});
    } else if (this.props.items) {
      this.props.onUpdate({item: this.props.items[0]});
    }
  }
  selectChange(val) {
    this.setState({
      selectedItem: val.label,
    });
  }
  render() {
    return (
      <span>
        <select
          value={this.state.selectedItem}
          onChange={ev => {
            this.setState({selectedItem: ev.currentTarget.value});
          }}>
          {this.props.items.map(keyName => (
            <option key={keyName} value={keyName}>
              {keyName}
            </option>
          ))}
        </select>
        <button
          className="btn btn-info btn-xs textarea-save-btn"
          onClick={this.updateData}>
          save
        </button>
      </span>
    );
  }
}

class NumberEditor extends React.Component {
  constructor(props) {
    super(props);
    this.updateData = this.updateData.bind(this);
    this.state = {value: props.defaultValue.value};
  }
  focus() {
    this.refs.inputRef.focus();
  }
  updateData() {
    this.props.onUpdate({value: parseFloat(this.state.value)});
  }
  render() {
    return (
      <span>
        <input
          ref="inputRef"
          className={
            (this.props.editorClass || '') + ' form-control editor edit-text'
          }
          style={{display: 'inline', width: '50%'}}
          type="text"
          value={this.state.value}
          onKeyDown={this.props.onKeyDown}
          onChange={ev => {
            this.setState({value: ev.currentTarget.value});
          }}
        />
        <button
          className="btn btn-info btn-xs textarea-save-btn"
          onClick={this.updateData}>
          save
        </button>
      </span>
    );
  }
}

const Spinner = () => (
  <div className="spinner">
    <div className="double-bounce1" />
    <div className="double-bounce2" />
  </div>
);

const alertLevels = ['Info', 'Warning', 'Critical'];
const alertComparators = ['GT', 'GTE', 'LT', 'LTE'];

export default class NetworkAlerts extends React.Component {
  state = {
    selectedTabIndex: 0,
    alertsConfigJson: null,
    alertsConfigRows: [],
    alertsSelected: [],
    alertsConfigSelected: [],
    from: 0,
    size: 500,
    alertsJson: null,
  };

  constructor(props) {
    super(props);
    this.getConfigClick = this.getConfigClick.bind(this);
    this.setConfigClick = this.setConfigClick.bind(this);
    this.getAlertsClick = this.getAlertsClick.bind(this);
    this.getAlerts = this.getAlerts.bind(this);
    this.alertsConfigOnRowSelect = this.alertsConfigOnRowSelect.bind(this);
    this.alertsOnRowSelect = this.alertsOnRowSelect.bind(this);
    this.handleSizeChange = this.handleSizeChange.bind(this);
    this.handleFromChange = this.handleFromChange.bind(this);
    this.getAlertsTableRows = this.getAlertsTableRows.bind(this);
  }

  getConfigClick(e) {
    return new Promise((resolve, reject) => {
      const exec = new Request(
        '/aggregator/getAlertsConfig/' + this.props.networkName,
        {credentials: 'same-origin'},
      );
      fetch(exec).then(
        function(response) {
          if (response.status == 200) {
            response.json().then(
              function(json) {
                const rows = [];
                var index = 0;
                json.alerts.forEach(alertConf => {
                  rows.push({
                    id: alertConf.id,
                    key: alertConf.key,
                    comp: {item: alertComparators[alertConf.comp]},
                    threshold: {value: alertConf.threshold},
                    level: {item: alertLevels[alertConf.level]},
                    node_mac: alertConf.node_mac,
                    _id: index,
                  });
                  index++;
                });

                this.setState({
                  alertsConfigJson: json,
                  alertsConfigRows: rows,
                });

                resolve();
              }.bind(this),
            );
          } else {
            reject();
          }
        }.bind(this),
      );
    });
  }

  setConfigClick(e) {
    return new Promise((resolve, reject) => {
      var alertsConfigMap = {};
      if (this.state.alertsConfigRows) {
        //Check data
        var errors = false;
        this.state.alertsConfigRows.forEach(row => {
          if (row.id == '' || row.id == '-') {
            alert('ID of row ' + row._id + ' is invalid');
            reject();
            errors = true;
          }
          if (row.key == '' || row.key == '-') {
            alert('Key of row ' + row._id + ' is invalid');
            reject();
            errors = true;
          }
          if (isNaN(row.threshold.value)) {
            alert('Threshold of row ' + row._id + ' is invalid');
            reject();
            errors = true;
          }
          if (alertsConfigMap[row.id]) {
            alert('ID of row ' + row._id + ' is not uneque');
            reject();
            errors = true;
          }
          alertsConfigMap[row.id] = row;
        });
      }

      if (
        !errors &&
        window.confirm('Are you sure you want to overwrite Alerts Config?')
      ) {
        const f = new Request(
          '/aggregator/setAlertsConfig/' +
            this.props.networkName +
            '/' +
            JSON.stringify(this.state.alertsConfigRows),
          {credentials: 'same-origin'},
        );
        fetch(f).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              if (json.success) {
                resolve();
              } else {
                reject();
              }
            });
          } else {
            reject();
          }
        });
      } else {
        reject();
      }
    });
  }

  cellListFormatter(cell, row) {
    if (cell) {
      return cell.item;
    }
    return 'null';
  }

  cellNumberFormatter(cell, row) {
    if (cell) {
      return cell.value;
    }
    return NaN;
  }

  getAlerts(network) {
    const exec = new Request(
      '/getAlerts/' + network + '/' + this.state.from + '/' + this.state.size,
      {credentials: 'same-origin'},
    );
    fetch(exec).then(
      function(response) {
        if (response.status == 200) {
          response.json().then(
            function(json) {
              this.setState({
                alertsJson: json,
              });
            }.bind(this),
          );
        } else {
          this.setState({
            alertsJson: null,
          });
        }
      }.bind(this),
    );
  }

  getAlertsClick(e) {
    return new Promise((resolve, reject) => {
      const exec = new Request(
        '/getAlerts/' +
          this.props.networkName +
          '/' +
          this.state.from +
          '/' +
          this.state.size,
        {credentials: 'same-origin'},
      );
      fetch(exec).then(
        function(response) {
          if (response.status == 200) {
            response.json().then(
              function(json) {
                this.setState({
                  alertsJson: json,
                });
                resolve();
              }.bind(this),
            );
          } else {
            this.setState({
              alertsJson: null,
            });
            reject();
          }
        }.bind(this),
      );
    });
  }

  addAlertsConfigRow() {
    const rows = this.state.alertsConfigRows;
    var row = {
      _id: rows.length,
      id: '-',
      key: '-',
      comp: {item: alertComparators[0]},
      threshold: NaN,
      level: {item: alertLevels[0]},
      node_mac: '',
    };
    rows.push(row);
    this.setState({
      alertsConfigRows: rows,
    });
  }

  deleteAlertsConfigRows() {
    const rows = this.state.alertsConfigRows;
    var newRows = [];
    var newId = 0;
    rows.forEach(row => {
      var selected = false;
      this.state.alertsConfigSelected.forEach(id => {
        if (id == row._id) {
          selected = true;
        }
      });

      if (!selected) {
        row._id = newId;
        newId++;
        newRows.push(row);
      }
    });
    this.setState({
      alertsConfigRows: newRows,
      alertsConfigSelected: [],
    });
  }

  deleteSelectedAlerts() {
    var alertIds = [];
    if (this.state.alertsSelected && this.state.alertsSelected.length > 0) {
      this.state.alertsSelected.forEach(id => {
        alertIds.push(id);
      });
      const exec = new Request('/deleteAlerts/' + JSON.stringify(alertIds), {
        credentials: 'same-origin',
      });
      fetch(exec);
      this.setState({
        alertsSelected: [],
      });
      this.getAlerts(this.props.networkName);
    }
  }

  clearAllAlerts() {
    const exec = new Request('/clearAlerts/' + this.props.networkName, {
      credentials: 'same-origin',
    });
    fetch(exec);
    this.setState({
      alertsSelected: [],
    });
    this.getAlerts(this.props.networkName);
  }

  alertsConfigOnRowSelect(row, isSelected) {
    if (isSelected) {
      this.setState({
        alertsConfigSelected: [...this.state.alertsConfigSelected, row._id],
      });
    } else {
      this.setState({
        alertsConfigSelected: this.state.alertsConfigSelected.filter(
          it => it !== row._id,
        ),
      });
    }
  }

  alertsOnRowSelect(row, isSelected) {
    if (isSelected) {
      this.setState({
        alertsSelected: [...this.state.alertsSelected, row._id],
      });
    } else {
      this.setState({
        alertsSelected: this.state.alertsSelected.filter(it => it !== row._id),
      });
    }
  }

  UNSAFE_componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    this.getAlerts(this.props.networkName);
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
    clearInterval(this.timer);
  }

  handleDispatchEvent(payload) {
    // TODO - this needs to compare props change
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.setState({
          alertsConfigJson: null,
          alertsConfigRows: [],
          alertsSelected: [],
          alertsConfigSelected: [],
          selectedTabIndex: 0,
          networkName: payload.networkName,
          alertsJson: null,
        });
        this.getAlerts(payload.networkName);
        break;
        break;
    }
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
    });
  }

  getAlertsTableRows(
    alertsJson,
  ): Array<{
    _id: number,
    timestamp: string,
    node_mac: string,
    alert_id: string,
    alert_key: string,
    trigger_key: string,
    trigger_value: number,
    alert_comparator: string,
    alert_threshold: number,
    alert_level: string,
  }> {
    const rows = [];
    if (alertsJson) {
      alertsJson.forEach(alert => {
        rows.push({
          _id: alert.id,
          timestamp: alert.timestamp,
          node_mac: alert.mac,
          alert_id: alert.alert_id,
          alert_regex: alert.alert_regex,
          trigger_key: alert.trigger_key,
          trigger_value: alert.trigger_value,
          alert_comparator: alert.alert_comparator,
          alert_threshold: alert.alert_threshold,
          alert_level: alert.alert_level,
        });
      });
    }
    return rows;
  }

  columnClassNameFormat(row, rowIdx) {
    if (row.alert_level == 'ALERT_CRITICAL') {
      return 'td-column-function-alert-critical';
    } else if (row.alert_level == 'ALERT_WARNING') {
      return 'td-column-function-alert-warning';
    } else {
      return 'td-column-function-alert-info';
    }
  }

  handleFromChange(val) {
    this.setState({
      from: val,
    });
  }
  handleSizeChange(val) {
    this.setState({
      size: val,
    });
  }

  render() {
    const createListEditor = (onUpdate, props) => (
      <ListEditor onUpdate={onUpdate} {...props} />
    );
    const createNumberEditor = (onUpdate, props) => (
      <NumberEditor onUpdate={onUpdate} {...props} />
    );

    const alertsConfigCellEditProp = {
      mode: 'click',
      blurToSave: true,
    };

    var alertsConfigSelectRowProp = {
      mode: 'checkbox',
      clickToSelect: true,
      bgColor: 'rgb(150, 150, 250)',
      onSelect: this.alertsConfigOnRowSelect,
      selected: this.state.alertsConfigSelected,
    };

    var alertsSelectRowProp = {
      mode: 'checkbox',
      clickToSelect: true,
      bgColor: 'rgb(150, 150, 250)',
      onSelect: this.alertsOnRowSelect,
      selected: this.state.alertsSelected,
    };

    return (
      <Tabs
        onSelect={this._handleTabSelect.bind(this)}
        selectedIndex={this.state.selectedTabIndex}>
        <TabList>
          <Tab>Alerts</Tab>
          <Tab>Config</Tab>
        </TabList>
        <TabPanel>
          <div>
            <table style={{borderCollapse: 'separate', borderSpacing: '10px'}}>
              <tbody>
                <tr>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={this.deleteSelectedAlerts.bind(this)}>
                      Delete Selected
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={this.clearAllAlerts.bind(this)}>
                      Clear All
                    </button>
                  </td>
                  <td>
                    <AsyncButton
                      className="btn btn-primary"
                      text="Get Alerts"
                      pendingText="Requesting..."
                      fulFilledText="Get Alerts"
                      fulFilledClass="btn-success"
                      rejectedText="Get Alerts"
                      rejectedClass="btn-danger"
                      onClick={this.getAlertsClick}>
                      {({buttonText, isPending}) => (
                        <span>
                          {isPending && <Spinner />}
                          <span>{buttonText}</span>
                        </span>
                      )}
                    </AsyncButton>
                  </td>
                  <td>From:</td>
                  <td width={80}>
                    <NumericInput
                      className="form-control"
                      style={false}
                      value={this.state.from}
                      onChange={this.handleFromChange}
                    />
                  </td>
                  <td>Size:</td>
                  <td width={80}>
                    <NumericInput
                      className="form-control"
                      style={false}
                      value={this.state.size}
                      onChange={this.handleSizeChange}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <BootstrapTable
            key="alertsTable"
            trClassName={this.columnClassNameFormat}
            data={this.getAlertsTableRows(this.state.alertsJson)}
            selectRow={alertsSelectRowProp}>
            <TableHeaderColumn dataField="_id" isKey hidden>
              Id
            </TableHeaderColumn>
            <TableHeaderColumn dataField="timestamp">Time</TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="node_mac">
              Node
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="alert_id">
              ID
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="alert_regex">
              RegEx
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="trigger_key">
              Trigger Key
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="trigger_value">
              Trigger Value
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="alert_comparator">
              Comparator
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="alert_threshold">
              Threshold
            </TableHeaderColumn>
            <TableHeaderColumn dataSort={true} dataField="alert_level">
              Level
            </TableHeaderColumn>
          </BootstrapTable>
        </TabPanel>
        <TabPanel>
          <div>
            <table style={{borderCollapse: 'separate', borderSpacing: '10px'}}>
              <tbody>
                <tr>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={this.addAlertsConfigRow.bind(this)}>
                      Add Alert
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={this.deleteAlertsConfigRows.bind(this)}>
                      Delete Alert
                    </button>
                  </td>
                  <td>
                    <AsyncButton
                      className="btn btn-primary"
                      text="Remote Get"
                      pendingText="Requesting..."
                      fulFilledText="Remote Get"
                      fulFilledClass="btn-success"
                      rejectedText="Remote Get"
                      rejectedClass="btn-danger"
                      onClick={this.getConfigClick}>
                      {({buttonText, isPending}) => (
                        <span>
                          {isPending && <Spinner />}
                          <span>{buttonText}</span>
                        </span>
                      )}
                    </AsyncButton>
                  </td>
                  <td>
                    <AsyncButton
                      className="btn btn-primary"
                      text="Remote Set"
                      pendingText="Requesting..."
                      fulFilledText="Remote Set"
                      fulFilledClass="btn-success"
                      rejectedText="Remote Set"
                      rejectedClass="btn-danger"
                      onClick={this.setConfigClick}>
                      {({buttonText, isPending}) => (
                        <span>
                          {isPending && <Spinner />}
                          <span>{buttonText}</span>
                        </span>
                      )}
                    </AsyncButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <BootstrapTable
            data={this.state.alertsConfigRows}
            cellEdit={alertsConfigCellEditProp}
            selectRow={alertsConfigSelectRowProp}>
            <TableHeaderColumn dataField="_id" hidden isKey={true}>
              _id
            </TableHeaderColumn>
            <TableHeaderColumn width="200" dataField="id" editable>
              ID
            </TableHeaderColumn>
            <TableHeaderColumn width="200" editable dataField="key">
              Key RegEx
            </TableHeaderColumn>
            <TableHeaderColumn
              width="120"
              editable
              dataField="comp"
              dataFormat={this.cellListFormatter}
              customEditor={{
                getElement: createListEditor,
                customEditorParameters: {items: alertComparators},
              }}>
              Comparator
            </TableHeaderColumn>
            <TableHeaderColumn
              width="150"
              editable
              dataField="threshold"
              customEditor={{getElement: createNumberEditor}}
              dataFormat={this.cellNumberFormatter}>
              Threshold
            </TableHeaderColumn>
            <TableHeaderColumn
              width="120"
              editable
              dataField="level"
              dataFormat={this.cellListFormatter}
              customEditor={{
                getElement: createListEditor,
                customEditorParameters: {items: alertLevels},
              }}>
              Level
            </TableHeaderColumn>
          </BootstrapTable>
        </TabPanel>
      </Tabs>
    );
  }
}
NetworkAlerts.propTypes = {
  networkName: PropTypes.string.isRequired,
};
