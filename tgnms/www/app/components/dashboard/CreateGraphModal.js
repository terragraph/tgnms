/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from '../../NetworkDispatcher.js';
import {Actions} from '../../constants/NetworkConstants.js';
import GraphConfigurationSelect from './GraphConfigurationSelect';
import NetworkAggregationForm from './NetworkAggregationForm';
import LinkGraphForm from './LinkGraphForm';
import NodeGraphForm from './NodeGraphForm';
import React from 'react';
import Select from 'react-select';
import Modal from 'react-modal';
import swal from 'sweetalert';
import {cloneDeep} from 'lodash-es';
import {Glyphicon} from 'react-bootstrap';

const initialState = {
  // Checkbox that indicates whether user wants to use dashboard's graph
  // configuration options or use their own custom graph configurations
  useDashboardGraphConfigChecked: false,
  // Custom data from GraphConfigurationSelect that contains custom graph config
  // options
  customData: {
    nodeA: '',
    nodeZ: '',
    nodes: [],
    minAgo: 60,
    useCustomTime: false,
  },
  // Value of the drop-down React Select (options: 'link','graph','network')
  graphTypeSelected: '',
};

export default class CreateGraphModal extends React.Component {
  state = cloneDeep(initialState);

  componentDidMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
     Modal.setAppElement('body');
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        this.getDashboards(payload.networkName);
        break;
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.modalIsOpen && this.props.modalIsOpen) {
      // reset the state when the modal is opened again and not in edit graph mode
      // prepopulate data if editing an already existing graph
      const {editGraphMode, graphInEditMode} = this.props;

      const newState = editGraphMode
        ? graphInEditMode.setup.graphFormData.generalFormData
        : cloneDeep(initialState);
      this.setState(newState);

      // initially use dashboard's graph config options unless the user hasn't
      // specified a node A yet
      if (this.props.dashboard && this.props.dashboard.nodeA) {
        this.setState({
          useDashboardGraphConfigChecked: true
        })
      }
    }
  }

  // When user selects new graph type in React Select, update value in state
  onGraphTypeChange = event => {
    this.setState({graphTypeSelected: event.value});
  };

  // If a user chooses to use a custom graph configuration, save their
  // selections into the state under customData
  onHandleCustomDataChange = (keyName, data) => {
    const newCustomData = {
      ...this.state.customData,
      [keyName]: data,
    };
    this.setState({customData: newCustomData, nodesSelected: []});
  };

  onHandleGraphConfigChange = (clk) => {
    const {nodeA, nodeZ, minAgo, startTime, endTime} = this.props.dashboard;
    if (!nodeA || !nodeZ) {
      swal("Error", "You need to fill in the dashboard's graph configuration options before you can apply them.", "error");
    }
    else {
      this.setState({
        useDashboardGraphConfigChecked: clk.target.checked,
      });
    }
  }

  render() {
    const {graphInEditMode} = this.props;
    const {nodeA, nodeZ, minAgo, startTime, endTime} = this.props.dashboard;
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
            {this.state.graphTypeSelected !== '' && (
              <div className="graph-form">
                <div className="input-box">
                  <span>Apply Dashboard's Graph Configuration Options</span>
                  <input
                    id="custom-graph-checkbox"
                    type="checkbox"
                    onChange={this.onHandleGraphConfigChange}
                    checked={this.state.useDashboardGraphConfigChecked}
                  />
                </div>
                {this.state.useDashboardGraphConfigChecked ? (
                  <div className="graph-config-wrapper">
                    <h4>Applied Graph Configuration</h4>
                    <div className="info-box">
                      <p>Node A</p>
                      <p>{nodeA.name}</p>
                    </div>
                    <div className="info-box">
                      <p>Node Z</p>
                      <p>{nodeZ.name}</p>
                    </div>
                    {minAgo ? (
                      <div className="info-box">
                        <p>Time Window</p>
                        <p>{minAgo} minutes</p>
                      </div>
                    ) : (
                      <div className="info-box">
                        <p>Time Window</p>
                        <p>{startTime + ' - ' + endTime}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="graph-config-wrapper">
                    <h4>Custom Graph Configuration</h4>
                    <GraphConfigurationSelect
                      dashboard={this.props.dashboard}
                      networkConfig={this.props.networkConfig}
                      globalUse={false}
                      onHandleCustomDataChange={this.onHandleCustomDataChange}
                      graphType={this.state.graphTypeSelected}
                    />
                  </div>
                )}
              </div>
            )}
            <div />
            {this.state.graphTypeSelected === 'Link' && (
              <LinkGraphForm
                topologyName={this.props.networkConfig.topology.name}
                onSubmitNewGraph={this.props.onSubmitNewGraph}
                dashboard={this.props.dashboard}
                generalFormData={this.state}
                defaultLinkFormData={
                  graphInEditMode
                    ? graphInEditMode.setup.graphFormData.linkGraphData
                    : null
                }
              />
            )}
            {this.state.graphTypeSelected === 'Node' && (
              <NodeGraphForm
                topologyName={this.props.networkConfig.topology.name}
                onSubmitNewGraph={this.props.onSubmitNewGraph}
                dashboard={this.props.dashboard}
                generalFormData={this.state}
                defaultNodeFormData={
                  graphInEditMode
                    ? graphInEditMode.setup.graphFormData.nodeGraphData
                    : null
                }
              />
            )}
            {this.state.graphTypeSelected === 'Network' && (
              <div className="graph-form">
                <NetworkAggregationForm
                  topologyName={this.props.networkConfig.topology.name}
                  onSubmitNewGraph={this.props.onSubmitNewGraph}
                  dashboard={this.props.dashboard}
                  generalFormData={this.state}
                  defaultNetworkFormData={
                    graphInEditMode
                      ? graphInEditMode.setup.graphFormData.networkAggGraphData
                      : null
                  }
                />
              </div>
            )}
          </div>
        </Modal>
      </div>
    );
  }
}
