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
import {isEqual} from 'lodash-es';

export default class CreateGraphModal extends React.Component {
  state = {
    // overall state
    formData: [],
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
    // check to see if global dashboard data changed
    if (!isEqual(prevProps.dashboard, this.props.dashboard)) {
      this.setLinkKeyOptions();
      this.setNodeSelectOptions();
      this.setLinkDirectionOptions();
    }
  }

  // link form functions
  setLinkKeyOptions = () => {
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
    return axios
      .get(`/stats_ta/${this.props.topologyName}/tgf.${nodeZ.mac_addr}`)
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
    const {nodeA, nodeZ} = this.props.dashboard;
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
    const {nodeA, nodeZ} = this.props.dashboard;
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
  }

  onNodesSelectChanged(event) {
    this.setState({nodesSelected: event});
  }

  onNodeKeyChanged(event) {
    this.setState({nodeKeysSelected: event.value});
  }

  // Network form functions
  onNetworkMetricChanged(event) {
    this.setState({networkMetricSelected: event.value});
  }

  setNetworkMetricOptions() {
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
      <div key="option" className="typeahead-option">
        <strong key="name">{option.name}</strong>
        <div key="data">Node: {option.node}</div>
      </div>,
    ];
  }

  metricSelectionChanged(selectedOpts) {
    // update graph options
    this.setState({
      nodeKeysSelected: selectedOpts,
    });
  }

  submitLinkGraph() {
    const key = this.state.linkKeySelected;
    let url = `/stats_ta/${this.props.topologyName}/${key}`;
    const graphName = this.state.linkDirectionSelected + ' : ' + key.slice(22);

    // TODO backend does not return exact key if searching with [#]
    // this is temporary
    if (key.includes('[')) {
      url = url.slice(0, url.indexOf('['));
    }

    axios.get(url).then(resp => {
      const keyIds = [];
      const dataResp = [];
      // only doing this because backend doesnt return exact key on search
      // must parse through response manually to get desired key number [#]
      if (key.includes('[')) {
        const keyNum = key.slice(key.indexOf('[') + 1, key.indexOf(']'));
        resp.data.forEach(point => {
          if (point[0].key.includes(keyNum)) {
            point.forEach(val => {
              keyIds.push(val.keyId);
              dataResp.push(val);
            });
          }
        });
      } else {
        resp.data.forEach(point => {
          point.forEach((val, index) => {
            keyIds.push(val.keyId);
            dataResp.push(val);
          });
        });
      }

      const setupInfo = {
        graphType: 'link',
        nodeA: this.props.dashboard.nodeA,
        nodeZ: this.props.dashboard.nodeZ,
        direction: this.state.linkDirectionSelected.includes('Z -> A') ? 'Z -> A' : 'A -> Z'
      }

      // add graph based on the global time range set in the dashboard
      const {startTime, endTime, minAgo} = this.props.dashboard;
      if (startTime && endTime) {
        this.props.addGraphCustomTime(
          graphName,
          startTime,
          endTime,
          dataResp,
          keyIds,
          setupInfo
        );
      } else {
        this.props.addGraphMinAgo(graphName, minAgo, dataResp, keyIds, setupInfo);
      }
      this.props.closeModal();
    })
    .catch(err => {
      console.error('Error submitting link graph', err)
    })
  }

  submitNodeGraph() {
    const graphName = 'Node stats';

    const {nodeKeysSelected} = this.state;

    const nodeKeyIds = [];
    const nodeKeyData = [];
    nodeKeysSelected.forEach(nodeKey => {
      nodeKeyIds.push(nodeKey.key.keyId);
      nodeKeyData.push(nodeKey.key);
    })

    const {startTime, endTime, minAgo} = this.props.dashboard;

    const setupInfo = {
      graphType: 'node',
      nodes: nodeKeysSelected,
    }

    if (startTime && endTime) {
      this.props.addGraphCustomTime(
        graphName,
        startTime,
        endTime,
        nodeKeyData,
        nodeKeyIds,
        setupInfo
      );
    } else {
      this.props.addGraphMinAgo(
        graphName,
        minAgo,
        nodeKeyData,
        nodeKeyIds,
        setupInfo
      );
    }
    this.props.closeModal();
  }

  render() {
    const {nodeA, nodeZ} = this.props.dashboard;
    const disableLinkSubmit = this.state.linkKeySelected === '';
    const disableNodeSubmit =
      this.state.nodesSelected.length === 0 ||
      this.state.nodeKeysSelected.length === 0;
    return (
      <div className="create-graph-modal">
        <Modal
          isOpen={this.props.modalIsOpen}
          onRequestClose={this.props.closeModal}>
          <div className="create-graph-modal-content">
            <h3>Create New Graph</h3>
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
                        onChange={this.onNodesSelectChanged}
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
                    onChange={this.onNetworkMetricChanged}
                    options={this.state.networkMetricOptions}
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
  }
}
