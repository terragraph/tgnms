/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-datetime/css/react-datetime.css';

import Dispatcher from './NetworkDispatcher.js';
import ReactMultiGraph from './ReactMultiGraph.js';
import {Actions} from './constants/NetworkConstants.js';
import axios from 'axios';
import moment from 'moment';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import Datetime from 'react-datetime';
import React from 'react';
import {Glyphicon} from 'react-bootstrap';

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

const GRAPH_AGG_OPTS = [
  {
    name: 'top',
    title: 'Top',
  },
  {
    name: 'bottom',
    title: 'Bottom',
  },
  {
    name: 'avg',
    title: 'Avg + Min/Max',
  },
  {
    name: 'sum',
    title: 'Sum',
  },
  {
    name: 'count',
    title: 'Count',
  },
  /*  {
    name: 'split',
    title: 'Split',
  },
  {
    name: 'groupby_site',
    title: 'Group By Site',
  },*/
  // group by link
];

export default class NetworkStats extends React.Component {
  state = {
    // type-ahead data
    keyOptions: [],
    // type-ahead graphs
    keysSelected: [],
    // time selection
    useCustomTime: false,
    // simple minutes ago, won't have to adjust the start/end time displayed
    minAgo: 60,
    // specific start+end time, doesn't support 'now' yet
    startTime: new Date(),
    endTime: new Date(),

    graphAggType: 'top',
    keyIsLoading: false,
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

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      keysSelected: selectedOpts,
    });
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
    const retKeys = [];
    keyOptions.forEach(keyList => {
      // aggregate data for this key
      retKeys.push({name: keyList[0].displayName, data: keyList});
    });
    return retKeys;
  }

  renderTypeaheadKeyMenu(option, props, index) {
    return [
      <strong key="name">{option.name}</strong>,
      <div key="data">Nodes: {option.data.length}</div>,
    ];
  }

  render() {
    // index nodes by name
    const nodeMacList = [];
    const nodeNameList = [];
    Object.keys(this.props.networkConfig.topology.nodes).map(nodeIndex => {
      const node = this.props.networkConfig.topology.nodes[nodeIndex];
      nodeMacList.push(node.mac_addr);
      nodeNameList.push(node.name);
    });
    // nodes list
    const nodes = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodes[node.mac_addr] = {
        name: node.name,
        version: 'Unknown',
      };
    });
    // index nodes
    const nodesByName = {};
    this.props.networkConfig.topology.nodes.forEach(node => {
      nodesByName[node.name] = {
        name: node.name,
        mac_addr: node.mac_addr,
        site_name: node.site_name,
      };
    });
    // construct links
    const links = {};
    const linkRows = [];
    this.props.networkConfig.topology.links.forEach(link => {
      // skipped wired links
      if (link.link_type === 2) {
        return;
      }
      linkRows.push({
        name: link.name,
      });
      links[link.name] = {
        a_node: {
          name: link.a_node_name,
          mac: nodesByName[link.a_node_name].mac_addr,
        },
        z_node: {
          name: link.z_node_name,
          mac: nodesByName[link.z_node_name].mac_addr,
        },
      };
    });
    // all graphs
    let pos = 0;
    const multiGraphs = this.state.keysSelected.map(keyIds => {
      const graphOpts = {
        type: 'key_ids',
        key_ids: keyIds.data.map(data => data.keyId),
        data: keyIds.data,
        agg_type: this.state.graphAggType,
      };
      if (this.state.useCustomTime) {
        graphOpts.start_ts = this.state.startTime.getTime() / 1000;
        graphOpts.end_ts = this.state.endTime.getTime() / 1000;
      } else {
        graphOpts.min_ago = this.state.minAgo;
      }
      pos++;
      return <ReactMultiGraph options={[graphOpts]} key={pos} size="large" />;
    });
    // custom time selector
    let customInputProps = {};
    if (!this.state.useCustomTime) {
      customInputProps = {disabled: true};
    }

    return (
      <div width="800">
        <AsyncTypeahead
          key="keys"
          labelKey="name"
          multiple
          placeholder="Enter metric/key name"
          ref={ref => (this._typeaheadKey = ref)}
          isLoading={this.state.keyIsLoading}
          onSearch={query => {
            const topoName = this.props.networkConfig.topology.name;
            this.setState({keyIsLoading: true, keyOptions: []});
            axios.get('/stats_ta/' + topoName + '/' + query).then(response =>
              this.setState({
                keyIsLoading: false,
                keyOptions: this.formatKeyOptions(response.data),
              }),
            );
          }}
          selected={this.state.keysSelected}
          onChange={this.metricSelectionChanged.bind(this)}
          useCache={false}
          emptyLabel={false}
          filterBy={(opt, txt) => {
            return true;
          }}
          renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(this)}
          options={this.state.keyOptions}
        />
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
        <br />
        <span className="graph-opt-title">Custom Time</span>
        <button
          label="Custom"
          key="customButton"
          className={
            this.state.useCustomTime
              ? 'graph-button graph-button-selected'
              : 'graph-button'
          }
          onClick={clk =>
            this.setState({
              useCustomTime: !this.state.useCustomTime,
            })
          }>
          Custom
        </button>
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
        <br />
        <span className="graph-opt-title">Graph Aggregation</span>
        {GRAPH_AGG_OPTS.map(opts => (
          <button
            label={opts.name}
            key={opts.name}
            className={
              opts.name === this.state.graphAggType
                ? 'graph-button graph-button-selected'
                : 'graph-button'
            }
            onClick={clk => this.setState({graphAggType: opts.name})}>
            {opts.title}
          </button>
        ))}
        {multiGraphs}
      </div>
    );
  }
}
