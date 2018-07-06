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
import moment from 'moment';
import Datetime from 'react-datetime';
import React from 'react';
import Select from 'react-select';

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

const LINK_TYPE_X = 2;

class NodeOption extends React.Component {
  handleMouseDown = event => {
    event.preventDefault();
    event.stopPropagation();
    this.props.onSelect(this.props.option, event);
  };

  handleMouseEnter = event => {
    this.props.onFocus(this.props.option, event);
  };

  handleMouseMove = event => {
    if (this.props.isFocused) {
      return;
    }
    this.props.onFocus(this.props.option, event);
  };

  render() {
    const {name, mac_addr} = this.props.option.node;
    return (
      <div
        className="node-option"
        onMouseDown={this.handleMouseDown}
        onMouseEnter={this.handleMouseEnter}
        onMouseMove={this.handleMouseMove}>
        <strong>Name: {name}</strong>
        <p>Mac Address: {mac_addr}</p>
      </div>
    );
  }
}

export default class GraphConfigurationSelect extends React.Component {
  state = {
    endTime: new Date(),
    minAgo: 1440,

    // Node A type-ahead graphs
    nodeAOptions: [],
    nodeASelected: '',

    // Node Z options generated on Node A selection
    nodeZOptions: [],
    nodeZSelected: '',

    // time selection
    startTime: new Date(),
    useCustomTime: false,
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (this.props.globalUse) {
      const {nodeA, nodeZ} = this.props.dashboard;
      if (nodeA) {
        this.setState(
          {
            nodeASelected: {
              label: nodeA.name,
              node: nodeA,
              value: nodeA.mac_addr,
            },
            nodeZSelected: {
              label: nodeZ.name,
              node: nodeZ,
              value: nodeZ.mac_addr,
            },
          },
          () => this.setNodeZOptions(this.state.nodeASelected.node),
        );
      }
    }
    this.setNodeAOptions();
  }

  getNodeData = nodeList => {
    // return a list of node names and macs
    const nodesByName = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodesByName[node.name] = node;
    });
    return nodeList.map(nodeName => {
      return nodesByName[nodeName];
    });
  };

  setNodeAOptions = () => {
    const nodes = this.props.networkConfig.topology.nodes;
    const nodeAOptions = [];
    nodes.forEach(node => {
      nodeAOptions.push({
        label: node.name,
        node,
        value: node.mac_addr,
      });
    });
    this.setState({
      nodeAOptions,
    });
  };

  onNodeAChanged = event => {
    this.setNodeZOptions(event.node);
    this.setState({
      nodeASelected: event,
      nodeZSelected: '',
    });
    if (!this.props.globalUse) {
      if (this.props.graphType === 'Node') {
        this.props.onHandleCustomDataChange('nodes', [event.node]);
      } else {
        this.props.onHandleCustomDataChange('nodeA', event.node);
      }
    }
  };

  setNodeZOptions = nodeA => {
    // Find Node Z options based on the nodes linked to Node A
    const nodeZOptions = [];
    const {links, nodes} = this.props.networkConfig.topology;
    const linkAZOptions = links.filter(link => {
      return link.a_node_name === nodeA.name && link.link_type !== LINK_TYPE_X;
    });

    // push first direction from the links
    linkAZOptions.forEach(link => {
      const node = nodes.find(node => {
        return node.name === link.z_node_name;
      });
      nodeZOptions.push({
        label: node.name,
        node,
        value: node.mac_addr,
      });
    });
    const linkZAOptions = links.filter(link => {
      return link.z_node_name === nodeA.name && link.link_type !== LINK_TYPE_X;
    });

    // push other direction from the links, since they are bidirectional
    linkZAOptions.forEach(link => {
      const node = nodes.find(node => {
        return node.name === link.a_node_name;
      });
      nodeZOptions.push({
        label: node.name,
        node,
        value: node.mac_addr,
      });
    });
    this.setState({
      nodeZOptions,
    });
  };

  onNodeZChanged = event => {
    this.setState({
      nodeZSelected: event,
    });
    if (!this.props.globalUse) {
      this.props.onHandleCustomDataChange('nodeZ', event.node);
    }
  };

  isValidStartDate = date => {
    // TODO - more dynamic than one fixed week
    const minDate = moment().subtract(7, 'days');
    return date.toDate() >= minDate.toDate() && date.toDate() < new Date();
  };

  isValidEndDate = date => {
    // TODO - more dynamic than one fixed week
    // TODO - this should be more based on the day since that's the main view
    return date.toDate() >= this.state.startTime && date.toDate() <= new Date();
  };

  formatKeyOptions = keyOptions => {
    return keyOptions.map(key => ({mac_addr: key.mac_addr, name: key.name}));
  };

  applyToAllGraphs() {
    const nodeA = this.state.nodeASelected.node;
    const nodeZ = this.state.nodeZSelected.node;

    const startTime = this.state.useCustomTime ? this.state.startTime : null;
    const endTime = this.state.useCustomTime ? this.state.endTime : null;
    const minAgo = this.state.useCustomTime ? null : this.state.minAgo;

    if (this.props.globalUse) {
      this.props.onChangeDashboardGlobalData(
        endTime,
        minAgo,
        nodeA,
        nodeZ,
        startTime,
      );
    }
  }

  render() {
    // custom time selector enabled if checkbox is checked
    const customInputProps = {
      disabled: !this.state.useCustomTime,
    };
    const disableApplySubmit =
      this.state.nodeASelected === '' || this.state.nodeZSelected === '';
    return (
      <div className="global-data-select">
        <div className="node-box">
          {(this.props.globalUse ||
            this.props.graphType === 'Node' ||
            this.props.graphType === 'Link') && (
            <div className="node-box">
              <p>Node A</p>
              <Select
                name="node-a-select"
                value={this.state.nodeASelected}
                onChange={this.onNodeAChanged}
                options={this.state.nodeAOptions}
                optionComponent={NodeOption}
              />
            </div>
          )}
        </div>
        {(this.props.globalUse || this.props.graphType === 'Link') && (
          <div className="node-box">
            <p>Node Z</p>
            <Select
              name="node-z-select"
              value={this.state.nodeZSelected}
              onChange={this.onNodeZChanged}
              options={this.state.nodeZOptions}
              optionComponent={NodeOption}
            />
          </div>
        )}
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
              onClick={() => {
                this.setState({
                  minAgo: opts.minAgo,
                  useCustomTime: false,
                });

                if (!this.props.globalUse) {
                  this.props.onHandleCustomDataChange('useCustomTime', false);
                  this.props.onHandleCustomDataChange('minAgo', opts.minAgo);
                }
              }}>
              {opts.label}
            </button>
          ))}
        </div>
        <div id="custom-time-box">
          <span className="graph-opt-title">Custom Time</span>
          <input
            id="custom-time-checkbox"
            type="checkbox"
            onChange={clk => {
              this.setState({
                useCustomTime: clk.target.checked,
              });
              if (!this.props.globalUse) {
                this.props.onHandleCustomDataChange(
                  'useCustomTime',
                  !this.state.useCustomTime,
                );
              }
            }}
            checked={this.state.useCustomTime}
          />
          <span className="timeTitle">Start</span>
          <Datetime
            className="timePicker"
            key="startTime"
            inputProps={customInputProps}
            isValidDate={this.isValidStartDate}
            onChange={change => {
              // check whether date is valid
              if (typeof change === 'object') {
                this.setState({startTime: change.toDate()});
                if (!this.props.globalUse) {
                  this.props.onHandleCustomDataChange(
                    'startTime',
                    change.toDate(),
                  );
                }
              }
            }}
          />
          <span className="timeTitle">End</span>
          <Datetime
            open={false}
            className="timePicker"
            inputProps={customInputProps}
            isValidDate={this.isValidEndDate}
            key="endTime"
            onChange={change => {
              // check whether date is valid
              if (typeof change === 'object') {
                this.setState({endTime: change.toDate()});
                if (!this.props.globalUse) {
                  this.props.onHandleCustomDataChange(
                    'endTime',
                    change.toDate(),
                  );
                }
              }
            }}
          />
        </div>
        {this.props.globalUse && (
          <button
            className="graph-button submit-button"
            onClick={() => {
              this.applyToAllGraphs();
            }}
            disabled={disableApplySubmit}>
            Apply To All Graphs
          </button>
        )}
      </div>
    );
  }
}
