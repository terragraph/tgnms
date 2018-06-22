/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// Form contained in CreateGraphModal that has inputs for node specific graphs

import React from 'react';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import {
  fetchKeyData,
  shouldUpdateGraphFormOptions,
} from '../../helpers/NetworkDashboardsHelper.js';
import PropTypes from 'prop-types';
import Select from 'react-select';
import {clone, isEqual} from 'lodash-es';

const initialState = {
  // Indicator for whether the AsyncTypeahead is still waiting on data
  nodeKeyIsLoading: false,
  // Drop-down options for the node-specific key options
  nodeKeyOptions: [],
  // Array of node-specific keys selected by the user
  nodeKeysSelected: [],
  // Drop-down options for the selected nodes
  nodeSelectOptions: [],
  // Array of nodes selected by the user
  nodesSelected: [],
};

export default class NodeGraphForm extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired,
    defaultNodeFormData: PropTypes.shape({
      nodeKeyIsLoading: PropTypes.bool,
      nodeKeyOptions: PropTypes.array,
      nodeKeysSelected: PropTypes.array,
      nodeSelectOptions: PropTypes.array,
      nodesSelected: PropTypes.array,
    }),
    editGraphMode: PropTypes.bool,
    generalFormData: PropTypes.object.isRequired,
    onSubmitGraph: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequired,
  };

  state = clone(initialState);

  componentDidMount() {
    this.setNodeSelectOptions();
  }

  static getDerivedStateFromProps(props, state) {
    // If user is editing a graph, prepopulate form with graph's existing data
    if (props.editGraphMode && isEqual(initialState, state)) {
      return {...props.defaultNodeFormData};
    }
    // Otherwise, the user is creating a graph so form should be blank initially
    return null;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (
      shouldUpdateGraphFormOptions(
        prevProps.dashboard,
        this.props.dashboard,
        prevProps.generalFormData,
        this.props.generalFormData,
      )
    ) {
      this.setNodeSelectOptions();
    }
  }

  nodeKeySelectionChanged = selectedOpts => {
    this.setState({
      nodeKeysSelected: selectedOpts,
    });
  };

  // Set the node options based on the nodeA and nodeZ in the dashboard or the
  // custom data the user specifies
  setNodeSelectOptions = () => {
    const {generalFormData} = this.props;
    const {nodeA, nodeZ} = generalFormData.useDashboardGraphConfigChecked
      ? this.props.dashboard
      : generalFormData.customData;
    const nodeSelectOptions = [];
    if (nodeA) {
      nodeSelectOptions.push({
        label: nodeA.name,
        node: nodeA,
        value: nodeA.name,
      });
    }
    if (nodeZ) {
      nodeSelectOptions.push({
        label: nodeZ.name,
        node: nodeZ,
        value: nodeZ.name,
      });
    }
    this.setState({
      nodeSelectOptions,
    });
  };

  onNodesSelectChanged = event => {
    this.setState({nodesSelected: event});
  };

  onNodeKeyChanged = event => {
    this.setState({nodeKeysSelected: event.value});
  };

  // Format pull-down menu options for key selection for React Select
  formatNodeKeyOptions = keyOptions => {
    return keyOptions
      .filter((key, index) => {
        return index > 0 && key.keyId !== keyOptions[index - 1].keyId;
      })
      .map((key, index) => {
        // aggregate data for this key, remove duplicates
        return {name: key.displayName, node: key.nodeName, key};
      });
  };

  // Asynchronously make a query to the stats_ta backend to fetch key data based
  // on the key the user types into the AsyncTypeahead
  onNodeKeySearch = query => {
    this.setState({
      nodeKeyIsLoading: true,
      nodeKeyOptions: [],
    });
    const nodes = this.props.generalFormData.useDashboardGraphConfigChecked
      ? this.state.nodesSelected.map(nodeObj => nodeObj.node)
      : this.props.generalFormData.customData.nodes;

    fetchKeyData([query], this.props.topologyName)
      .then(graphData => {
        const nodeMacAddrs = new Set(nodes.map(node => node.mac_addr));
        // temporarily filter keys to find node-specific keys (without mac_addr)
        // TODO: will add change to backend
        const keyData = graphData.keyData.filter(
          keyObj =>
            !RegExp('\\d').test(keyObj.key) && nodeMacAddrs.has(keyObj.node),
        );

        this.setState({
          nodeKeyIsLoading: false,
          nodeKeyOptions: this.formatNodeKeyOptions(keyData),
        });
      })
      .catch(err => {
        console.error('Error getting node key options', err);
        this.setState({
          nodeKeyIsLoading: false,
          nodeKeyOptions: [],
        });
      });
  };

  // Add new graph from the node form data and add the graph to the dashboard
  onSubmitNodeGraph = () => {
    const nodes = [];
    const {nodeA, nodeZ} = this.props.dashboard;
    let graphName = '';
    const {generalFormData} = this.props;

    if (!generalFormData.useDashboardGraphConfigChecked) {
      nodes.push('Custom');
      graphName = generalFormData.customData.nodes
        .map(nodes => nodes.name)
        .join(',');
    } else {
      this.state.nodesSelected.forEach(nodeSelected => {
        if (nodeA.name === nodeSelected.node.name) {
          nodes.push('nodeA');
        } else if (nodeZ.name === nodeSelected.node.name) {
          nodes.push('nodeZ');
        }
      });
      graphName = this.state.nodesSelected
        .map(nodeSelected => nodeSelected.node.name)
        .join(',');
    }

    const selectedNodeKeys = this.state.nodeKeysSelected.map(
      nodeKey => nodeKey.key,
    );
    const {
      endTime,
      minAgo,
      startTime,
    } = generalFormData.useDashboardGraphConfigChecked
      ? this.props.dashboard
      : generalFormData.customData;

    const graphFormData = {
      generalFormData,
      nodeGraphData: this.state,
    };

    const inputData = {
      endTime,
      keys: selectedNodeKeys,
      minAgo,
      name: graphName,
      startTime,
      setup: {
        graphFormData,
        graphType: 'node',
        isCustom: !generalFormData.useDashboardGraphConfigChecked,
        nodes,
      },
    };

    this.props.onSubmitGraph('node', inputData, this.props.editGraphMode);
  };

  render() {
    const {nodeA} = this.props.dashboard;
    const nodesSelected = this.props.generalFormData
      .useDashboardGraphConfigChecked
      ? this.state.nodesSelected
      : this.props.generalFormData.customData.nodes;
    const disableNodeSubmit =
      nodesSelected.length === 0 || this.state.nodeKeysSelected.length === 0;

    return (
      <div>
        {nodeA ? (
          <div className="graph-form">
            <h4>Node Graph</h4>
            {this.props.generalFormData.useDashboardGraphConfigChecked && (
              <div id="node-key-box" className="input-box">
                <p>Node(s)</p>
                <Select
                  name="graph-type-select"
                  multi
                  value={this.state.nodesSelected}
                  onChange={this.onNodesSelectChanged}
                  options={this.state.nodeSelectOptions}
                />
              </div>
            )}
            <div className="input-box">
              <p>Key</p>
              <AsyncTypeahead
                key="keys"
                labelKey="name"
                multiple
                placeholder="Enter node key name..."
                ref={ref => (this._typeaheadKey = ref)}
                isLoading={this.state.nodeKeyIsLoading}
                onSearch={this.onNodeKeySearch}
                onChange={this.nodeKeySelectionChanged}
                selected={this.state.nodeKeysSelected}
                renderMenuItemChildren={this.renderTypeaheadKeyMenu}
                options={this.state.nodeKeyOptions}
              />
            </div>
            <button
              className="graph-button submit-button"
              onClick={this.onSubmitNodeGraph}
              disabled={disableNodeSubmit}>
              Submit
            </button>
          </div>
        ) : (
          <div className="graph-form">
            <h4>Node Graph</h4>
            <h5>
              Please specify Node A in the global data inputs to create a node
              graph
            </h5>
          </div>
        )}
      </div>
    );
  }
}
