/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import axios from 'axios';
import Select from 'react-select';
import Modal from 'react-modal';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';

export default class CreateGraphModal extends React.Component {
  state = {
    // overall state
    graphTypeSelected: 'link',

    // link form state
    linkKeySelected: '',
    linkKeyOptions: [],
    linkDirectionSelected: '',
    linkDirectionOptions: [],

    // node form state
    nodeSelected: '',
    nodeSelectOptions: this.getNodeSelectOptions(),
    nodeKeyIsLoading: false,
    nodeKeyOptions: [],
    nodeKeysSelected: [],

    // network form state
    networkMetricSelected: '',
    networkMetricOptions: this.getNetworkMetricOptions(),
  };

  onGraphTypeChange(event) {
    this.setState({graphTypeSelected: event.value});
  }

  componentWillMount() {
    Modal.setAppElement('body');
    this.setLinkKeyOptions();
    // this.setNodeKeyOptions();
    this.setLinkDirectionOptions();
  }

  // link form functions
  setLinkKeyOptions() {
    let {nodeA, nodeZ} = this.props.dashboard;

    if (!(nodeA && nodeZ)) {
      return;
    }
    // change direction based on user selection
    if (this.state.linkDirectionSelected.includes('Z -> A')) {
      const temp = nodeA;
      nodeA = nodeZ;
      nodeZ = temp;
    }
    const keyOptions = [];
    return axios
      .get(`/stats_ta/${this.props.topologyName}/tgf.${nodeZ.mac_addr}`)
      .then(resp => {
        const keys = resp.data;
        keys.forEach(keyObj => {
          if (keyObj[0].node === nodeA.mac_addr) {
            keyOptions.push({value: keyObj[0].key, label: keyObj[0].key});
          }
        });
        this.setState({
          linkKeyOptions: keyOptions,
        });
      })
      .catch(err => {
        console.log('Error getting link key options', err);
        this.setState({
          linkKeyOptions: [],
        });
      });
  }

  onLinkKeyChanged(event) {
    this.setState({linkKeySelected: event.value});
  }

  onLinkDirectionChanged(event) {
    this.setState({linkDirectionSelected: event.value}, () =>
      this.setLinkKeyOptions(),
    );
  }

  setLinkDirectionOptions() {
    const {nodeA, nodeZ} = this.props.dashboard;
    const linkDirectionOptions = [];
    if (nodeA && nodeZ) {
      const azDirection = 'A -> Z: ' + nodeA.name + ' -> ' + nodeZ.name;
      const zaDirection = 'Z -> A: ' + nodeZ.name + ' -> ' + nodeA.name;
      linkDirectionOptions.push({value: azDirection, label: azDirection});
      linkDirectionOptions.push({value: zaDirection, label: zaDirection});
    }
    this.setState({
      linkDirectionOptions,
      linkDirectionSelected: linkDirectionOptions[0].value,
    });
  }

  // node form functions
  getNodeSelectOptions() {
    const {nodeA, nodeZ} = this.props.dashboard;
    const nodeSelectOptions = [];
    if (nodeA) {
      nodeSelectOptions.push({
        value: nodeA.name,
        label: nodeA.name,
        node: nodeA,
      });
    }
    if (nodeZ) {
      nodeSelectOptions.push({
        value: nodeZ.name,
        label: nodeZ.name,
        node: nodeZ,
      });
    }
    return nodeSelectOptions;
  }

  onNodesSelectChanged(event) {
    this.setState({nodesSelected: event});
  }

  onNodeKeyChanged(event) {
    this.setState({nodeKeySelected: event.value});
  }

  // Network form functions
  onNetworkMetricChanged(event) {
    this.setState({networkMetricSelected: event.value});
  }

  getNetworkMetricOptions() {
    // TODO get all the network metric options
    // currently there are no network keys in the backend
    return [];
  }

  formatNodeKeyOptions(keyOptions) {
    const retKeys = [];
    keyOptions.forEach((key, index) => {
      // aggregate data for this key, remove duplicates
      if (index > 0 && key.keyId !== keyOptions[index - 1].keyId) {
        retKeys.push({name: key.displayName, node: key.nodeName, key});
      }
    });
    return retKeys;
  }

  renderTypeaheadKeyMenu(option, props, index) {
    return [
      <div className="typeahead-option">
        <strong key="name">{option.name}</strong>,
        <div key="data">Node: {option.node}</div>,
      </div>,
    ];
  }

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      nodeKeysSelected: selectedOpts,
    });
  }

  render() {
    const {nodeA, nodeZ} = this.props.dashboard;
    return (
      <div className="create-graph-modal">
        <Modal
          isOpen={this.props.modalIsOpen}
          onRequestClose={() => this.props.closeModal()}>
          <div className="create-graph-modal-content">
            <h3>Create New Graph</h3>
            <div className="input-box">
              <p>Graph Type</p>
              <Select
                name="graph-type-select"
                value={this.state.graphTypeSelected}
                onChange={event => this.onGraphTypeChange(event)}
                options={[
                  {value: 'Link', label: 'Link'},
                  {value: 'Node', label: 'Node'},
                  {value: 'Network', label: 'Network'},
                ]}
              />
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
                        onChange={event => this.onLinkDirectionChanged(event)}
                        options={this.state.linkDirectionOptions}
                      />
                    </div>
                    <div className="input-box">
                      <p>Key</p>
                      <Select
                        name="graph-type-select"
                        value={this.state.linkKeySelected}
                        onChange={event => this.onLinkKeyChanged(event)}
                        options={this.state.linkKeyOptions}
                      />
                    </div>
                    <button
                      className="graph-button submit-button"
                      onClick={() => {
                        console.log('wow you made a graph!');
                      }}>
                      Submit
                    </button>
                  </div>
                ) : (
                  <div className="graph-form">
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
                    <div className="input-box">
                      <p>Node(s)</p>
                      <Select
                        name="graph-type-select"
                        multi
                        value={this.state.nodesSelected}
                        onChange={event => this.onNodesSelectChanged(event)}
                        options={this.state.nodeSelectOptions}
                      />
                    </div>
                    <div id="node-key-box" className="input-box">
                      <p>Key</p>
                      <AsyncTypeahead
                        key="keys"
                        labelKey="name"
                        multiple
                        placeholder="Enter node key name..."
                        ref={ref => (this._typeaheadKey = ref)}
                        isLoading={this.state.nodeKeyIsLoading}
                        onSearch={query => {
                          this.setState({
                            nodeKeyIsLoading: true,
                            nodeKeyOptions: [],
                          });
                          const selectedNodes = this.state.nodesSelected;
                          axios
                            .get(
                              `/stats_ta/${this.props.topologyName}/${query}`,
                            )
                            .then(resp => {
                              const keys = resp.data;
                              const keyOptions = [];
                              keys.forEach(keyArr => {
                                keyArr.forEach(keyObj => {
                                  // check to make sure key is a node key by making sure there is no mac address
                                  // in the key and that the key contains the selected node
                                  selectedNodes.forEach(nodeObj => {
                                    const selectedNode = nodeObj.node;
                                    if (
                                      keyObj.node === selectedNode.mac_addr &&
                                      !/\d/.test(keyObj.key)
                                    ) {
                                      keyOptions.push(keyObj);
                                    }
                                  });
                                });
                              });
                              this.setState({
                                nodeKeyIsLoading: false,
                                nodeKeyOptions: this.formatNodeKeyOptions(
                                  keyOptions,
                                ),
                              });
                            })
                            .catch(err => {
                              console.log(
                                'Error getting node key options',
                                err,
                              );
                              this.setState({
                                nodeKeyIsLoading: false,
                                nodeKeyOptions: [],
                              });
                            });
                        }}
                        selected={this.state.nodeKeysSelected}
                        onChange={this.metricSelectionChanged.bind(this)}
                        useCache={false}
                        emptyLabel={false}
                        filterBy={(opt, txt) => {
                          return true;
                        }}
                        renderMenuItemChildren={this.renderTypeaheadKeyMenu.bind(
                          this,
                        )}
                        options={this.state.nodeKeyOptions}
                      />
                    </div>
                    <button
                      className="graph-button submit-button"
                      onClick={() => {
                        console.log('wow you made a graph!');
                      }}>
                      Submit
                    </button>
                  </div>
                ) : (
                  <div className="graph-form">
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
                <h4>{this.state.graphTypeSelected + ' Graph'}</h4>
                <div className="input-box">
                  <p>Network Metric</p>
                  <Select
                    name="graph-type-select"
                    value={this.state.networkMetricSelected}
                    onChange={event => this.onNetworkMetricChanged(event)}
                    options={this.state.networkMetricOptions}
                  />
                </div>
                <button
                  className="graph-button submit-button"
                  onClick={() => {
                    console.log('wow you made a graph!');
                  }}>
                  Submit
                </button>
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
  }
}
