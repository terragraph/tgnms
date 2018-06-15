/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import GlobalDataSelect from './GlobalDataSelect';
import NetworkAggregationForm from './NetworkAggregationForm';
import {
  formatKeyHelper,
  fetchKeyData,
} from '../../helpers/NetworkDashboardsHelper.js';
import React from 'react';
import axios from 'axios';
import Select from 'react-select';
import Modal from 'react-modal';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import {isEqual, cloneDeep} from 'lodash-es';
import {Glyphicon} from 'react-bootstrap';

const initialState = {
  // overall state
  customGraphChecked: false,
  customData: {
    nodeA: '',
    nodeZ: '',
    nodes: [],
    minAgo: 60,
    useCustomTime: false,
  },
  graphNameInput: '',
  graphTypeSelected: 'link',
  keyIds: [],

  // link form state
  linkDirectionOptions: [],
  linkDirectionSelected: '',
  linkKeyOptions: [],
  linkKeySelected: '',

  // network form state
  networkMetricOptions: [],
  networkMetricSelected: '',

  // node form state
  nodeKeyIsLoading: false,
  nodeKeyOptions: [],
  nodeKeysSelected: [],
  nodeSelectOptions: [],
  nodesSelected: [],
};

export default class CreateGraphModal extends React.Component {
  state = cloneDeep(initialState);

  handleGraphNameChange = event => {
    this.setState({graphNameInput: event.target.value});
  };

  onGraphTypeChange = event => {
    this.setState({graphTypeSelected: event.value});
  };

  componentWillMount() {
    Modal.setAppElement('body');
    this.setLinkKeyOptions();
    this.setNodeSelectOptions();
    this.setLinkDirectionOptions();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.modalIsOpen && this.props.modalIsOpen) {
      // reset the state when the modal is opened again and not in edit graph mode
      // prepopulate data if editing an already existing graph
      const {editGraphMode, graphInEditMode} = this.props;
      const newState = editGraphMode
        ? graphInEditMode.setup.graphFormData
        : cloneDeep(initialState);

      this.setState(newState, () => {
        this.setLinkKeyOptions();
        this.setNodeSelectOptions();
        this.setLinkDirectionOptions();
      });
    } else if (
      !isEqual(prevProps.dashboard, this.props.dashboard) ||
      prevState.customGraphChecked !== this.state.customGraphChecked ||
      !isEqual(prevState.customData, this.state.customData)
    ) {
      this.setLinkKeyOptions();
      this.setNodeSelectOptions();
      this.setLinkDirectionOptions();
    }
  }

  onHandleCustomDataChange = (keyName, data) => {
    const newCustomData = {
      ...this.state.customData,
      [keyName]: data,
    };
    this.setState({customData: newCustomData, nodesSelected: []});
  };

  // link form functions
  setLinkKeyOptions = () => {
    let {nodeA, nodeZ} = this.state.customGraphChecked
      ? this.state.customData
      : this.props.dashboard;

    if (!nodeA || !nodeZ) {
      return;
    }
    // change direction based on user selection
    if (this.state.linkDirectionSelected.includes('Z -> A')) {
      const temp = nodeA;
      nodeA = nodeZ;
      nodeZ = temp;
    }
    return axios
      .get(
        `/stats_ta/${this.props.networkConfig.topology.name}/tgf.${
          nodeZ.mac_addr
        }`,
      )
      .then(resp => {
        const keys = resp.data;
        let keyOptions = keys.filter(keyObj => {
          return keyObj[0].node === nodeA.mac_addr;
        });
        keyOptions = keyOptions.map(keyObj => {
          return {label: keyObj[0].key, value: keyObj[0].key};
        });
        this.setState({
          linkKeyOptions: keyOptions,
        });
      })
      .catch(err => {
        console.error('Error getting link key options', err);
        this.setState({
          linkKeyOptions: [],
        });
      });
  };

  onLinkKeyChanged = event => {
    this.setState({linkKeySelected: event.value});
  };

  onLinkDirectionChanged = event => {
    this.setState({linkDirectionSelected: event.value}, () =>
      this.setLinkKeyOptions(),
    );
  };

  setLinkDirectionOptions = () => {
    const {nodeA, nodeZ} = this.state.customGraphChecked
      ? this.state.customData
      : this.props.dashboard;
    const linkDirectionOptions = [];
    let initialSelection = '';
    if (nodeA && nodeZ) {
      const azDirection = 'A -> Z: ' + nodeA.name + ' -> ' + nodeZ.name;
      const zaDirection = 'Z -> A: ' + nodeZ.name + ' -> ' + nodeA.name;
      linkDirectionOptions.push({label: azDirection, value: azDirection});
      linkDirectionOptions.push({label: zaDirection, value: zaDirection});
      initialSelection = linkDirectionOptions[0].value;
    }
    this.setState({
      linkDirectionOptions,
      linkDirectionSelected: initialSelection,
    });
  };

  // node form functions
  setNodeSelectOptions = () => {
    const {nodeA, nodeZ} = this.state.customGraphChecked
      ? this.state.customData
      : this.props.dashboard;
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

  // Network form functions
  onNetworkMetricChanged = event => {
    this.setState({networkMetricSelected: event.value});
  };

  setNetworkMetricOptions = () => {
    // TODO get all the network metric options
    // currently there are no network keys in the backend
    return [];
  };

  formatNodeKeyOptions = keyOptions => {
    let retKeys = keyOptions.filter((key, index) => {
      return index > 0 && key.keyId !== keyOptions[index - 1].keyId;
    });
    retKeys = retKeys.map((key, index) => {
      // aggregate data for this key, remove duplicates
      return {name: key.displayName, node: key.nodeName, key};
    });
    return retKeys;
  };

  renderTypeaheadKeyMenu = (option, props, index) => {
    return [
      <div key="option" className="typeahead-option">
        <strong key="name">{option.name}</strong>
        <div key="data">Node: {option.node}</div>
      </div>,
    ];
  };

  metricSelectionChanged = selectedOpts => {
    // update graph options
    this.setState({
      nodeKeysSelected: selectedOpts,
    });
  };

  onNodeKeySearch = query => {
    this.setState({
      nodeKeyIsLoading: true,
      nodeKeyOptions: [],
    });
    const nodes = this.state.customGraphChecked
      ? this.state.customData.nodes
      : this.state.nodesSelected.map(nodeObj => nodeObj.node);

    fetchKeyData([query], this.props.networkConfig.topology.name)
      .then(graphData => {
        let keyData = graphData.keyData;
        nodes.forEach(node => {
          keyData = keyData.filter(keyObj => {
            return (
              !RegExp('\\d').test(keyObj.key) && keyObj.node === node.mac_addr
            );
          });
        });

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

  onSubmitLinkGraph = () => {
    const key = this.state.linkKeySelected;
    const {startTime, endTime, minAgo, nodeA, nodeZ} = this.state
      .customGraphChecked
      ? this.state.customData
      : this.props.dashboard;
    const direction = this.state.linkDirectionSelected.includes('Z -> A')
      ? 'Z -> A'
      : 'A -> Z';
    const setup = {
      graphType: 'link',
      direction,
      graphFormData: this.state,
    };
    const name = `${direction} ${nodeA.name} -> ${
      nodeZ.name
    } : ${formatKeyHelper(key)}`;

    const inputData = {
      startTime,
      endTime,
      minAgo,
      nodeA,
      nodeZ,
      direction,
      setup,
      name,
      key,
    };

    this.props.onSubmitNewGraph('link', inputData);
  };

  onSubmitNodeGraph = () => {
    const nodes = [];
    let graphName = '';
    if (this.state.customGraphChecked) {
      nodes.push('Custom');
      graphName = this.state.customData.nodes
        .map(nodes => nodes.name)
        .join(',');
    } else {
      this.state.nodesSelected.forEach(nodeSelected => {
        const {nodeA, nodeZ} = this.props.dashboard;
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
    const {startTime, endTime, minAgo} = this.state.customGraphChecked
      ? this.state.customData
      : this.props.dashboard;

    const inputData = {
      startTime,
      endTime,
      minAgo,
      setup: {
        graphType: 'node',
        nodes,
        graphFormData: this.state,
      },
      name: graphName,
      keys: selectedNodeKeys,
    };

    this.props.onSubmitNewGraph('node', inputData);
  };

  render() {
    const {nodeA, nodeZ} = this.props.dashboard;
    const disableLinkSubmit = this.state.linkKeySelected === '';
    let disableNodeSubmit = false;
    if (this.state.customGraphChecked) {
      disableNodeSubmit =
        this.state.customData.nodes.length === 0 ||
        this.state.nodeKeysSelected.length === 0;
    } else {
      disableNodeSubmit =
        this.state.nodesSelected.length === 0 ||
        this.state.nodeKeysSelected.length === 0;
    }

    return (
      <div className="create-graph-modal">
        <Modal
          isOpen={this.props.modalIsOpen}
          onRequestClose={this.props.closeModal}>
          <div className="close-modal-button" onClick={this.props.closeModal}>
            <Glyphicon glyph="remove" />
          </div>
          <div className="create-graph-modal-content">
            {
              <h3>
                {this.props.editGraphMode ? 'Edit Graph' : 'Create New Graph'}
              </h3>
            }
            <div className="input-box">
              <p>Graph Type</p>
              <Select
                name="graph-type-select"
                value={this.state.graphTypeSelected}
                onChange={this.onGraphTypeChange}
                options={[
                  {label: 'Link', value: 'Link'},
                  {label: 'Node', value: 'Node'},
                  {label: 'Network', value: 'Network'},
                ]}
              />
            </div>
            <div className="input-box">
              <span>Create a Custom Graph</span>
              <input
                id="custom-graph-checkbox"
                type="checkbox"
                onChange={clk => {
                  this.setState({
                    customGraphChecked: clk.target.checked,
                  });
                }}
                checked={this.state.customGraphChecked}
              />
            </div>
            <div>
              {this.state.customGraphChecked && (
                <GlobalDataSelect
                  dashboard={this.props.dashboard}
                  networkConfig={this.props.networkConfig}
                  globalUse={false}
                  onHandleCustomDataChange={this.onHandleCustomDataChange}
                  graphType={this.state.graphTypeSelected}
                />
              )}
            </div>
            {this.state.graphTypeSelected === 'Link' && (
              <div>
                {nodeA && nodeZ ? (
                  <div className="graph-form">
                    <h4>{this.state.graphTypeSelected + ' Graph'}</h4>
                    <div className="input-box">
                      <p>Direction</p>
                      <Select
                        name="graph-type-select"
                        value={this.state.linkDirectionSelected}
                        onChange={this.onLinkDirectionChanged}
                        options={this.state.linkDirectionOptions}
                      />
                    </div>
                    <div className="input-box">
                      <p>Key</p>
                      <Select
                        name="graph-type-select"
                        value={this.state.linkKeySelected}
                        onChange={this.onLinkKeyChanged}
                        options={this.state.linkKeyOptions}
                      />
                    </div>
                    <button
                      className={
                        disableLinkSubmit
                          ? 'graph-button disabled-button'
                          : 'graph-button submit-button'
                      }
                      onClick={this.onSubmitLinkGraph}
                      disabled={disableLinkSubmit}>
                      Submit
                    </button>
                  </div>
                ) : (
                  <div className="graph-form">
                    <h4>{this.state.graphTypeSelected + ' Graph'}</h4>
                    <h5>
                      Please specify both Node A and Node Z in the global data
                      inputs to create a link graph
                    </h5>
                  </div>
                )}
              </div>
            )}
            {this.state.graphTypeSelected === 'Node' && (
              <div>
                {nodeA ? (
                  <div className="graph-form">
                    <h4>{this.state.graphTypeSelected + ' Graph'}</h4>
                    {!this.state.customGraphChecked && (
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
                        selected={this.state.nodeKeysSelected}
                        onChange={this.metricSelectionChanged}
                        useCache={false}
                        emptyLabel={false}
                        filterBy={(opt, txt) => {
                          return true;
                        }}
                        renderMenuItemChildren={this.renderTypeaheadKeyMenu}
                        options={this.state.nodeKeyOptions}
                      />
                    </div>
                    <button
                      className={
                        disableNodeSubmit
                          ? 'graph-button disabled-button'
                          : 'graph-button submit-button'
                      }
                      onClick={this.onSubmitNodeGraph}
                      disabled={disableNodeSubmit}>
                      Submit
                    </button>
                  </div>
                ) : (
                  <div className="graph-form">
                    <h4>{this.state.graphTypeSelected + ' Graph'}</h4>
                    <h5>
                      Please specify Node A in the global data inputs to create
                      a link graph
                    </h5>
                  </div>
                )}
              </div>
            )}
            {this.state.graphTypeSelected === 'Network' && (
              <div className="graph-form">
                <NetworkAggregationForm
                  topologyName={this.props.networkConfig.topology.name}
                  onSubmitNewGraph={this.props.onSubmitNewGraph}
                  dashboard={this.props.dashboard}
                  customData={this.state.customData}
                  customGraphChecked={this.state.customGraphChecked}
                />
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
  }
}
