/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

// Form contained in CreateGraphModal that has inputs for link specific graphs

'use strict';

import React from 'react';
import {
  formatKeyHelper,
  fetchKeyData,
  shouldUpdateGraphFormOptions,
} from '../../helpers/NetworkDashboardsHelper.js';
import PropTypes from 'prop-types';
import Select from 'react-select';
import {clone, isEqual} from 'lodash-es';

const initialState = {
  // Drop-down options for link direction selection
  linkDirectionOptions: [],
  // Value of the selected link direction option
  linkDirectionSelected: '',
  // Drop-down options for the link key selection
  linkKeyOptions: [],
  // Value of the selected link key option
  linkKeySelected: '',
};

export default class LinkGraphForm extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired,
    defaultLinkFormData: PropTypes.shape({
      linkDirectionOptions: PropTypes.array,
      linkDirectionSelected: PropTypes.string,
      linkKeyOptions: PropTypes.array,
      linkKeySelected: PropTypes.string,
    }),
    editGraphMode: PropTypes.bool,
    generalFormData: PropTypes.object.isRequired,
    onSubmitGraph: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequired,
  };

  state = clone(initialState);

  componentDidMount() {
    this.setLinkKeyOptions();
    this.setLinkDirectionOptions();
  }

  static getDerivedStateFromProps(props, state) {
    // If user is editing a graph, prepopulate form with graph's existing data
    if (props.defaultLinkFormData && isEqual(initialState, state)) {
      return {...props.defaultLinkFormData};
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
      this.setLinkKeyOptions();
      this.setLinkDirectionOptions();
    }
  }

  // Set the selection options for link keys once a node A and node Z are specified
  setLinkKeyOptions = () => {
    let {nodeA, nodeZ} = this.props.generalFormData
      .useDashboardGraphConfigChecked
      ? this.props.dashboard
      : this.props.generalFormData.customData;

    if (!nodeA || !nodeZ) {
      return;
    }
    // change direction based on user selection
    if (this.state.linkDirectionSelected.includes('Z -> A')) {
      const temp = nodeA;
      nodeA = nodeZ;
      nodeZ = temp;
    }

    fetchKeyData([`tgf.${nodeZ.mac_addr}`], this.props.topologyName)
      .then(resp => {
        const keyOptions = resp.keyData.filter(keyObj => {
          return keyObj.node === nodeA.mac_addr;
        });
        this.setState({
          linkKeyOptions: this.formatLinkKeyOptions(keyOptions),
        });
      })
      .catch(err => {
        console.error('Error getting link key options', err);
        this.setState({
          linkKeyOptions: [],
        });
      });
  };

  // Format pull-down menu options for key selection for React Select
  formatLinkKeyOptions = keyOptions => {
    return keyOptions.map(keyObj => {
      return {label: keyObj.key, value: keyObj.key};
    });
  };

  // When the user selects a different key option, update the value in the state
  onLinkKeyChanged = event => {
    this.setState({linkKeySelected: event.value});
  };

  // When the user changes the link direction option, update the value in the state
  onLinkDirectionChanged = event => {
    this.setState({linkDirectionSelected: event.value}, () =>
      this.setLinkKeyOptions(),
    );
  };

  // Set the direction options based on when a user changes node A and node Z
  setLinkDirectionOptions = () => {
    const {generalFormData} = this.props;
    const {nodeA, nodeZ} = generalFormData.useDashboardGraphConfigChecked
      ? this.props.dashboard
      : generalFormData.customData;
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

  // Add new graph from link form data and add the graph to the dashboard
  onSubmitLinkGraph = () => {
    const key = this.state.linkKeySelected;
    const {generalFormData} = this.props;
    const {
      startTime,
      endTime,
      minAgo,
      nodeA,
      nodeZ,
    } = generalFormData.useDashboardGraphConfigChecked
      ? this.props.dashboard
      : generalFormData.customData;
    const direction = this.state.linkDirectionSelected.includes('Z -> A')
      ? 'Z -> A'
      : 'A -> Z';

    const graphFormData = {
      generalFormData,
      linkGraphData: this.state,
    };

    const name = `${direction} ${nodeA.name} -> ${
      nodeZ.name
    } : ${formatKeyHelper(key)}`;

    const inputData = {
      direction,
      endTime,
      key,
      minAgo,
      name,
      nodeA,
      nodeZ,
      setup: {
        direction,
        graphFormData,
        graphType: 'link',
      },
      startTime,
    };

    this.props.onSubmitNewGraph('link', inputData);
  };

  render() {
    const {nodeA, nodeZ} = this.props.dashboard;
    const disableLinkSubmit = this.state.linkKeySelected === '';
    return (
      <div>
        {nodeA && nodeZ ? (
          <div className="graph-form">
            <h4>Link Graph</h4>
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
              className="graph-button submit-button"
              onClick={this.onSubmitLinkGraph}
              disabled={disableLinkSubmit}>
              Submit
            </button>
          </div>
        ) : (
          <div className="graph-form">
            <h4>Link Graph</h4>
            <h5>
              Please specify both Node A and Node Z in the global data inputs to
              create a link graph
            </h5>
          </div>
        )}
      </div>
    );
  }
}
