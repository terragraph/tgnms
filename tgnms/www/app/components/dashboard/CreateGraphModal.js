/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import GlobalDataSelect from './GlobalDataSelect';
import NetworkAggregationForm from './NetworkAggregationForm';
import LinkGraphForm from './LinkGraphForm';
import NodeGraphForm from './NodeGraphForm';
import React from 'react';
import Select from 'react-select';
import Modal from 'react-modal';
import {cloneDeep} from 'lodash-es';
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
};

export default class CreateGraphModal extends React.Component {
  state = cloneDeep(initialState);

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.modalIsOpen && this.props.modalIsOpen) {
      // reset the state when the modal is opened again and not in edit graph mode
      // prepopulate data if editing an already existing graph
      const {editGraphMode, graphInEditMode} = this.props;

      const newState = editGraphMode
        ? graphInEditMode.setup.graphFormData.generalFormData
        : cloneDeep(initialState);
      this.setState(newState);
    }
  }

  handleGraphNameChange = event => {
    this.setState({graphNameInput: event.target.value});
  };

  onGraphTypeChange = event => {
    this.setState({graphTypeSelected: event.value});
  };

  componentWillMount() {
    Modal.setAppElement('body');
  }

  onHandleCustomDataChange = (keyName, data) => {
    const newCustomData = {
      ...this.state.customData,
      [keyName]: data,
    };
    this.setState({customData: newCustomData, nodesSelected: []});
  };

  renderTypeaheadKeyMenu = (option, props, index) => {
    return [
      <div key="option" className="typeahead-option">
        <strong key="name">{option.name}</strong>
        <div key="data">Node: {option.node}</div>
      </div>,
    ];
  };

  render() {
    const {graphInEditMode} = this.props;

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
