/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-datetime/css/react-datetime.css';

import Dispatcher from '../../NetworkDispatcher.js';
import {Actions} from '../../constants/NetworkConstants.js';
import NetworkStore from '../../stores/NetworkStore.js';
import equals from 'equals';
import moment from 'moment';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import {Menu, MenuItem, Token, AsyncTypeahead} from 'react-bootstrap-typeahead';
import Datetime from 'react-datetime';
import {render} from 'react-dom';
import {SpringGrid} from 'react-stonecutter';
import React from 'react';
import axios from 'axios';

const TIME_PICKER_OPTS = [
  {
    label: '30 Minutes',
    minAgo: 30,
  },
  {
    label: '60 Minutes',
    minAgo: 60,
  },
  {
    label: '2 Hours',
    minAgo: 60 * 2,
  },
  {
    label: '6 Hours',
    minAgo: 60 * 6,
  },
  {
    label: '12 Hours',
    minAgo: 60 * 12,
  },
  {
    label: '1 Day',
    minAgo: 60 * 24,
  },
  {
    label: '3 Days',
    minAgo: 60 * 24 * 3,
  },
];

const MenuDivider = props => <li className="divider" role="separator" />;
const MenuHeader = props => <li {...props} className="dropdown-header" />;

export default class GlobalDataSelect extends React.Component {
  state = {
    // Node A type-ahead graphs
    nodeAKeysSelected: this.props.dashboard.nodeA
      ? [this.props.dashboard.nodeA]
      : [],
    nodeAKeyIsLoading: false,
    nodeAKeyOptions: [],

    // Node Z options generated on Node A selection
    nodeZOptions: this.props.dashboard.nodeA
      ? this.getNodeZOptions(this.props.dashboard.nodeA)
      : [],

    // time selection
    useCustomTime: false,
    // simple minutes ago, won't have to adjust the start/end time displayed
    minAgo: 60,
    // specific start+end time, doesn't support 'now' yet
    startTime: new Date(),
    endTime: new Date(),
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        // TODO - this needs to be a comparison of topology names in props
        // clear selected data
        this._typeaheadKey.getInstance().clear();
        break;
    }
  }

  getNodeData(nodeList) {
    // return a list of node names and macs
    const nodesByName = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodesByName[node.name] = node;
    });
    return nodeList.map(nodeName => {
      return nodesByName[nodeName];
    });
  }

  metricSelectionNodeAChanged(selectedOpts) {
    if (selectedOpts.length === 0) {
      return;
    }
    const nodeZOptions = this.getNodeZOptions(selectedOpts[0]);
    this.setState({
      nodeAKeysSelected: selectedOpts,
      nodeZOptions,
    });
  }

  getNodeZOptions(nodeA) {
    // Find Node Z options based on the nodes linked to Node A
    const nodeZOptions = [];
    const {links, nodes} = this.props.networkConfig.topology;

    const linkAZOptions = links.filter(link => {
      return link.a_node_name === nodeA.name;
    });
    linkAZOptions.forEach(link => {
      const nodeZ = nodes.find(node => {
        return node.name === link.z_node_name;
      });
      nodeZOptions.push(nodeZ);
    });
    return nodeZOptions;
  }

  isValidStartDate(date) {
    // TODO - more dynamic than one fixed week
    const minDate = moment().subtract(7, 'days');
    return date.toDate() >= minDate.toDate() && date.toDate() < new Date();
  }

  isValidEndDate(date) {
    // TODO - more dynamic than one fixed week
    // TODO - this should be more based on the day since that's the main view
    return date.toDate() >= this.state.startTime && date.toDate() <= new Date();
  }

  formatKeyOptions(keyOptions) {
    return keyOptions.map(key => ({name: key.name, mac_addr: key.mac_addr}));
  }

  renderTypeaheadKeyMenu(option, props, index) {
    return [
      <strong key="name">Name: {option.name}</strong>,
      <div key="data">Mac Address: {option.mac_addr}</div>,
    ];
  }

  createLinkGraph() {
    const nodeA = this.state.nodeAKeysSelected[0];
    const nodeZSelection = document.getElementById('node-z-select');
    const nodeZ = this.state.nodeZOptions[nodeZSelection.selectedIndex];
    // TODO For now, hardcoded to get the SNR stat, will change in the customizing form task
    const key = 'latpcstats.txpowerhistogram';

    axios
      .get(
        `/stats_ta/${this.props.networkConfig.topology.name}/tgf.${
          nodeZ.mac_addr
        }.${key}`,
      )
      .then(resp => {
        const name = nodeA.name + ' -> ' + nodeZ.name + ' ' + key;
        let startTime = moment()
          .subtract(this.state.minAgo, 'minutes')
          .toDate();
        let endTime = moment().toDate();
        if (this.state.useCustomTime) {
          startTime = this.state.startTime;
          endTime = this.state.endTime;
        }

        const keyIds = [];
        const dataResp = [];
        resp.data.forEach(point => {
          point.forEach(val => {
            keyIds.push(val.keyId);
            dataResp.push(val);
          });
        });

        this.props.onChangeDashboardGlobalData(
          nodeA,
          nodeZ,
          startTime,
          endTime,
        );
        this.props.addLinkGraph(name, startTime, endTime, dataResp, keyIds);
      });
  }

  render() {
    // custom time selector enabled if checkbox is checked
    const customInputProps = {
      disabled: !this.state.useCustomTime,
    };

    return (
      <div id="global-data-select">
        <h3>Global Data</h3>
        <div className="node-box">
          <p>Node A</p>
          <AsyncTypeahead
            key="keys"
            labelKey="name"
            placeholder={
              this.props.dashboard.nodeA
                ? this.props.dashboard.nodeA.name
                : 'Enter node name...'
            }
            ref={ref => (this._typeaheadKey = ref)}
            isLoading={this.state.nodeAKeyIsLoading}
            onSearch={query => {
              const nodes = this.props.networkConfig.topology.nodes;
              const filteredNodes = nodes.filter(node => {
                return (
                  node.name.includes(query) || node.mac_addr.includes(query)
                );
              });
              this.setState({
                nodeAKeyIsLoading: true,
                nodeAKeyOptions: this.formatKeyOptions(filteredNodes),
              });
            }}
            onChange={this.metricSelectionNodeAChanged.bind(this)}
            onInputChange={val => this.setState({nodeAKeysSelected: val})}
            useCache={false}
            emptyLabel={false}
            filterBy={(opt, txt) => {
              return true;
            }}
            renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(this)}
            options={this.state.nodeAKeyOptions}
          />
        </div>
        <div className="node-box">
          <p>Node Z</p>
          <select id="node-z-select">
            {this.state.nodeZOptions.map((node, index) => (
              <option key={index} value={node.mac_addr}>
                {node.name}
              </option>
            ))}
          </select>
        </div>
        <div id="time-window-box">
          <span className="graph-opt-title">Time Window</span>
          {TIME_PICKER_OPTS.map(opts => (
            <button
              label={opts.label}
              key={opts.label}
              className={
                !this.state.useCustomTime && opts.minAgo === this.state.minAgo
                  ? 'graph-button graph-button-selected'
                  : 'graph-button'
              }
              onClick={clk =>
                this.setState({
                  useCustomTime: false,
                  minAgo: opts.minAgo,
                })
              }>
              {opts.label}
            </button>
          ))}
        </div>
        <div id="custom-time-box">
          <span className="graph-opt-title">Custom Time</span>
          <input
            id="custom-time-checkbox"
            type="checkbox"
            onChange={clk =>
              this.setState({
                useCustomTime: !this.state.useCustomTime,
              })
            }
          />
          <span className="timeTitle">Start</span>
          <Datetime
            className="timePicker"
            key="startTime"
            inputProps={customInputProps}
            isValidDate={this.isValidStartDate.bind(this)}
            onChange={change => {
              if (typeof change === 'object') {
                this.setState({startTime: change.toDate()});
              }
            }}
          />
          <span className="timeTitle">End</span>
          <Datetime
            open={false}
            className="timePicker"
            inputProps={customInputProps}
            isValidDate={this.isValidEndDate.bind(this)}
            key="endTime"
            onChange={change => {
              if (typeof change === 'object') {
                this.setState({endTime: change.toDate()});
              }
            }}
          />
        </div>
        <button
          className="graph-button submit-button"
          onClick={() => {
            this.createLinkGraph();
          }}>
          Submit
        </button>
      </div>
    );
  }
}
