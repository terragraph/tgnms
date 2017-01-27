import React from 'react';
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
import AsyncButton from 'react-async-button';

class ListEditor extends React.Component {
  constructor(props) {
    super(props);
    this.updateData = this.updateData.bind(this);
    this.state = { selectedItem: null };
  }
  focus() {

  }
  updateData() {
    if (this.state.selectedItem) {
      this.props.onUpdate({ item: this.state.selectedItem });
    } else if (this.props.items) {
      this.props.onUpdate({ item: this.props.items[0] });
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
         onChange={ (ev) => { this.setState({ selectedItem: ev.currentTarget.value }); } } >
         { this.props.items.map(keyName => (<option key={ keyName } value={ keyName }>{ keyName }</option>)) }
        </select>
        <button
          className='btn btn-info btn-xs textarea-save-btn'
          onClick={ this.updateData }>
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
    this.state = { value: props.defaultValue.value};
  }
  focus() {
    this.refs.inputRef.focus();
  }
  updateData() {
    this.props.onUpdate({ value: this.state.value});
  }
  render() {
    return (
      <span>
        <input
          ref='inputRef'
          className={ ( this.props.editorClass || '') + ' form-control editor edit-text' }
          style={ { display: 'inline', width: '50%' } }
          type='text'
          value={ this.state.value }
          onKeyDown={ this.props.onKeyDown }
          onChange={ (ev) => { this.setState({ value: parseInt(ev.currentTarget.value, 10) }); } } />
        <button
          className='btn btn-info btn-xs textarea-save-btn'
          onClick={ this.updateData }>
          save
        </button>
      </span>
    );
  }
}
// tabs
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

const Spinner = () => (
  <div className='spinner'>
    <div className='double-bounce1'></div>
    <div className='double-bounce2'></div>
  </div>
)

const alertLevels = [ 'Info', 'Warning', 'Critical'];
const alertComparators = [ 'GT', 'GTE', 'LT', 'LTE'];

export default class NetworkAlerts extends React.Component {
  state = {
    selectedTabIndex: 0,
    topology: {},
    alertsConfigJson: null,
    alertsRows: [],
    alertsConfigRows: [],
    alertsSelected: [],
    alertsConfigSelected: [],
  }

  constructor(props) {
    super(props);
    this.getConfigClick = this.getConfigClick.bind(this);
    this.setConfigClick = this.setConfigClick.bind(this);
    this.refreshAlerts = this.refreshAlerts.bind(this);
    this.alertsConfigOnRowSelect = this.alertsConfigOnRowSelect.bind(this);
    this.alertsOnRowSelect = this.alertsOnRowSelect.bind(this);
    this.updateAlertsTableRows = this.updateAlertsTableRows.bind(this);
  }

  getConfigClick(e) {
    var networkName = NetworkStore.networkName;
    if (this.state.topology && this.state.topology.name) {
      networkName = this.state.topology.name;
    }
    return new Promise((resolve, reject) => {
      let exec = new Request('/aggregator\/getAlertsConfig/'+networkName);
      fetch(exec).then(function(response) {
        if (response.status == 200) {
          response.json().then(function(json) {
            const rows = [];
            var index = 0;
            json.alerts.forEach(alertConf => {
              rows.push(
                {
                  id: alertConf.id,
                  key: alertConf.key,
                  comp: {item: alertComparators[alertConf.comp]},
                  threshold: {value: alertConf.threshold},
                  level: {item: alertLevels[alertConf.level]},
                  node_mac: alertConf.node_mac,
                  _id: index,
                },
              );
              index++;
            });

            this.setState({
              alertsConfigJson: json,
              alertsConfigRows: rows,
            });

            resolve();
          }.bind(this));
        } else {
          reject();
        }
      }.bind(this));
    });
  }

  setConfigClick(e) {
    var networkName = NetworkStore.networkName;
    if (this.state.topology && this.state.topology.name) {
      networkName = this.state.topology.name;
    }

    return new Promise((resolve, reject) => {

      var alertsConfigMap = {};
      if(this.state.alertsConfigRows) {
        //Check data
        var errors = false;
        this.state.alertsConfigRows.forEach( row => {
          if (row.id == "" || row.id == "-") {
            alert("ID of row " + row._id + " is invalid");
            reject();
            errors = true;
          }
          if (row.key == "" || row.key == "-") {
            alert("Key of row " + row._id + " is invalid");
            reject();
            errors = true;
          }
          if (isNaN(row.threshold.value)) {
            alert("Threshold of row " + row._id + " is invalid");
            reject();
            errors = true;
          }
          if (alertsConfigMap[row.id]) {
            alert("ID of row " + row._id + " is not uneque");
            reject();
            errors = true;
          }
          alertsConfigMap[row.id] = row;
        });
      }

      if (!errors &&
          confirm('Are you sure you want to overwrite Alerts Config?')) {
        let exec = new Request('/aggregator\/setAlertsConfig/'+networkName+'/'+JSON.stringify(this.state.alertsConfigRows));
        fetch(exec).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              if (json.success) {
                resolve();
              } else {
                reject();
              }
            }.bind(this));
          } else {
            reject();
          }
        }.bind(this));
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

  refreshAlerts() {
    var networkName = NetworkStore.networkName;
    if (this.state.topology && this.state.topology.name) {
      networkName = this.state.topology.name;
    }

    let exec = new Request('/elastic/getAlerts/'+ networkName);
    fetch(exec).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.updateAlertsTableRows(json);
        }.bind(this));
      } else {
        this.updateAlertsTableRows(null);
      }
    }.bind(this));

  }

  addAlertsConfigRow () {
    let rows = this.state.alertsConfigRows;
    var row = {
      "_id": rows.length,
      id: "-",
      key: "-",
      comp: {item: alertComparators[0]},
      threshold: NaN,
      level: {item: alertLevels[0]},
      node_mac: "",
    };
    rows.push(row);
    this.setState({
      alertsConfigRows: rows,
    });
  }

  deleteAlertsConfigRows () {
    let rows = this.state.alertsConfigRows;
    var newRows = [];
    var newId = 0;
    rows.forEach(row => {
      var selected = false;
      this.state.alertsConfigSelected.forEach(id => {
        if (id == row._id) {
          selected = true;
        }
      });

      if(!selected) {
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

  deleteSelectedAlerts () {
    var networkName = NetworkStore.networkName;
    if (this.state.topology && this.state.topology.name) {
      networkName = this.state.topology.name;
    }
    var alertIds = []
    if(this.state.alertsSelected && this.state.alertsSelected.length > 0) {
      this.state.alertsSelected.forEach( id => {
        alertIds.push(id);
      });
      let exec = new Request('/elastic/deleteAlerts/'+ networkName+'/'+JSON.stringify(alertIds));
      fetch(exec);
      this.setState({
        alertsSelected: [],
      });
    }
  }

  clearAllAlerts () {
    var networkName = NetworkStore.networkName;
    if (this.state.topology && this.state.topology.name) {
      networkName = this.state.topology.name;
    }
    let exec = new Request('/elastic/clearAlerts/'+ networkName);
    fetch(exec);
    this.setState({
      alertsSelected: [],
    });
  }

  alertsConfigOnRowSelect(row, isSelected) {
    if (isSelected) {
      this.setState({
        alertsConfigSelected: [ ...this.state.alertsConfigSelected, row._id ]
      });
    } else {
      this.setState({ alertsConfigSelected: this.state.alertsConfigSelected.filter(it => it !== row._id) });
    }
  }

  alertsOnRowSelect(row, isSelected) {
    if (isSelected) {
      this.setState({
        alertsSelected: [ ...this.state.alertsSelected, row._id ]
      });
    } else {
      this.setState({ alertsSelected: this.state.alertsSelected.filter(it => it !== row._id) });
    }
  }

  componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    if (NetworkStore.networkName && NetworkStore.networkConfig) {
      this.setState(
        this.updateTopologyState(NetworkStore.networkConfig)
      );
      this.refreshAlerts();
    }
    //schedule fixed interval refresh
    this.timer = setInterval(this.refreshAlerts, 10000);
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
    clearInterval(this.timer);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.setState({
          alertsConfigJson: null,
          alertsRows: [],
          alertsConfigRows: [],
          alertsSelected: [],
          alertsConfigSelected: [],
        });
        break;
      case Actions.TOPOLOGY_REFRESHED:
        // topology refreshed
        this.setState(this.updateTopologyState(payload.networkConfig));
        this.refreshAlerts();
        break;
    }
  }

  updateTopologyState(networkConfig) {
    let topologyJson = networkConfig.topology;
    let nodesByMac = {};
    Object.keys(topologyJson.nodes).map(nodeIndex => {
      let node = topologyJson.nodes[nodeIndex];
      nodesByMac[node.mac_addr] = node;
    });
    return {
      topology: topologyJson,
      nodesByMac: nodesByMac,
    };
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
    });
  }

  updateAlertsTableRows(alertsJson) {
    const rows = [];
    if (alertsJson) {
      alertsJson.forEach(alert => {
        var time = new Date(alert._source.timestamp*1000).toISOString()
            .replace(/T/, ' ').replace(/\..+/, '');
        var node = this.state.nodesByMac[alert._source.mac];
        var nodeName = node.name ? node.name : "";
        rows.push(
          {
            _id: alert._id,
            timestamp: time,
            node_name: nodeName + " (" + alert._source.mac + ")",
            alert_id: alert._source.id,
            alert_key: alert._source.alert_key,
            stat_key: alert._source.stat_key,
            stat_value: alert._source.value,
            alert_comp: alert._source.comp,
            alert_threshold: alert._source.threshold,
            alert_level: alert._source.level,
          },
        );
      });
    }
    this.setState({
      alertsRows: rows,
    });
  }

  columnClassNameFormat(row, rowIdx) {
    if (row.alert_level == "ALERT_CRITICAL") {
      return 'td-column-function-alert-critical';
    } else if (row.alert_level == "ALERT_WARNING") {
      return 'td-column-function-alert-warning';
    } else {
      return 'td-column-function-alert-info';
    }
  }

  render() {
    const createListEditor = (onUpdate, props) => (<ListEditor onUpdate={ onUpdate } {...props}/>);
    const createNumberEditor = (onUpdate, props) => (<NumberEditor onUpdate={ onUpdate } {...props}/>);

    const alertsConfigCellEditProp = {
      mode: 'click',
      blurToSave: true
    };

    var alertsConfigSelectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      bgColor: "rgb(150, 150, 250)",
      onSelect: this.alertsConfigOnRowSelect,
      selected: this.state.alertsConfigSelected,
    };

    var alertsSelectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      bgColor: "rgb(150, 150, 250)",
      onSelect: this.alertsOnRowSelect,
      selected: this.state.alertsSelected,
    };

    return (
      <Tabs
        onSelect={this._handleTabSelect.bind(this)}
        selectedIndex={this.state.selectedTabIndex}
      >
        <TabList>
          <Tab>Alerts</Tab>
          <Tab>Config</Tab>
        </TabList>
        <TabPanel>
          <div>
            <table style={{"borderCollapse":"separate", "borderSpacing": "10px"}}>
             <tbody>
              <tr>
                <td>
                  <button className="btn btn-primary" onClick={this.deleteSelectedAlerts.bind(this)}>Delete Selected</button>
                </td>
                <td>
                  <button className="btn btn-primary" onClick={this.clearAllAlerts.bind(this)}>Clear All</button>
                </td>
              </tr>
             </tbody>
            </table>
          </div>
          <BootstrapTable
              key="alertsTable"
              trClassName={this.columnClassNameFormat}
              data={this.state.alertsRows}
              selectRow={ alertsSelectRowProp }>
            <TableHeaderColumn width="350" dataSort={true} dataField="_id" isKey hidden>Id</TableHeaderColumn>
            <TableHeaderColumn width="180" dataField="timestamp">Time</TableHeaderColumn>
            <TableHeaderColumn width="180" dataSort={true} dataField="node_name">Node</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="alert_id">ID</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="alert_key">RegEx</TableHeaderColumn>
            <TableHeaderColumn width="200" dataSort={true} dataField="stat_key">Key</TableHeaderColumn>
            <TableHeaderColumn width="100" dataSort={true} dataField="stat_value">Value</TableHeaderColumn>
            <TableHeaderColumn width="120" dataSort={true} dataField="alert_comp">Comparator</TableHeaderColumn>
            <TableHeaderColumn width="100" dataSort={true} dataField="alert_threshold">Threshold</TableHeaderColumn>
            <TableHeaderColumn width="140" dataSort={true} dataField="alert_level">Level</TableHeaderColumn>
          </BootstrapTable>
        </TabPanel>
        <TabPanel>
          <div>
            <table style={{"borderCollapse":"separate", "borderSpacing": "10px"}}>
             <tbody>
              <tr>
                <td>
                  <button className="btn btn-primary" onClick={this.addAlertsConfigRow.bind(this)}>Add Alert</button>
                </td>
                <td>
                  <button className="btn btn-primary" onClick={this.deleteAlertsConfigRows.bind(this)}>Delete Alert</button>
                </td>
                <td>
                  <AsyncButton
                    className="btn btn-primary"
                    text='Remote Get'
                    pendingText='Requesting...'
                    fulFilledText='Remote Get'
                    fulFilledClass="btn-success"
                    rejectedText='Remote Get'
                    rejectedClass="btn-danger"
                    onClick={this.getConfigClick}>
                    {
                      ({ buttonText, isPending }) => (
                        <span>
                          { isPending && <Spinner />}
                          <span>{buttonText}</span>
                        </span>
                      )
                    }
                  </AsyncButton>
                </td>
                <td>
                  <AsyncButton
                    className="btn btn-primary"
                    text='Remote Set'
                    pendingText='Requesting...'
                    fulFilledText='Remote Set'
                    fulFilledClass="btn-success"
                    rejectedText='Remote Set'
                    rejectedClass="btn-danger"
                    onClick={this.setConfigClick}>
                    {
                      ({ buttonText, isPending }) => (
                        <span>
                          { isPending && <Spinner />}
                          <span>{buttonText}</span>
                        </span>
                      )
                    }
                  </AsyncButton>
                </td>
              </tr>
             </tbody>
            </table>
          </div>
          <BootstrapTable
              data={ this.state.alertsConfigRows }
              cellEdit={ alertsConfigCellEditProp }
              selectRow={ alertsConfigSelectRowProp }>
            <TableHeaderColumn dataField='_id' hidden isKey={ true }>_id</TableHeaderColumn>
            <TableHeaderColumn width="200" dataField='id' editable >ID</TableHeaderColumn>
            <TableHeaderColumn width="200" editable dataField='key'>Key RegEx</TableHeaderColumn>
            <TableHeaderColumn width="120" editable dataField='comp'
            dataFormat={ this.cellListFormatter }
            customEditor={ { getElement: createListEditor, customEditorParameters: { items: alertComparators } } }>Comparator</TableHeaderColumn>
            <TableHeaderColumn width="150" editable dataField='threshold'
            customEditor={ { getElement: createNumberEditor } }
            dataFormat={ this.cellNumberFormatter }>
            Threshold</TableHeaderColumn>
            <TableHeaderColumn width="120" editable dataField='level'
            dataFormat={ this.cellListFormatter }
            customEditor={ { getElement: createListEditor, customEditorParameters: { items: alertLevels } } }>Level</TableHeaderColumn>
          </BootstrapTable>
        </TabPanel>
      </Tabs>
    );
  }
}
