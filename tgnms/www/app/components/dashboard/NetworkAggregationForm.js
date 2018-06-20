/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// Form contained in CreateGraphModal that has inputs for network specific graphs

import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import React from 'react';
import {fetchAggregatedData} from '../../helpers/NetworkDashboardsHelper.js';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {clone, isEqual} from 'lodash-es';

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
];

const initialState = {
  // Graph aggregation type
  graphAggType: 'top',
  // Indicator for whether the AsyncTypeahead is still waiting on data
  networkKeyIsLoading: false,
  // Drop-down options for the network keys
  networkKeyOptions: [],
  // Value of the selected network key
  networkKeySelected: '',
};

export default class NetworkAggregationForm extends React.Component {
  static propTypes = {
    dashboard: PropTypes.object.isRequired,
    generalFormData: PropTypes.object.isRequired,
    onSubmitNewGraph: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequired,
    defaultNetworkFormData: PropTypes.shape({
      graphAggType: PropTypes.string,
      networkKeyIsLoading: PropTypes.bool,
      networkKeyOptions: PropTypes.array,
      networkKeySelected: PropTypes.string,
    })
  };

  state = clone(initialState)

  static getDerivedStateFromProps(props, state) {
    // If user is editing a graph, prepopulate form with graph's existing data
    if (props.defaultNetworkFormData && isEqual(initialState, state)) {
      return {...props.defaultNetworkFormData};
    }
    // Otherwise, the user is creating a graph so form should be blank initially
    return null;
  }

  // When a user selects a different option, update the value in the state
  metricSelectionChanged = selectedOpts => {
    this.setState({
      networkKeySelected: selectedOpts,
    });
  };

  // Format pull-down menu options for key selection for React Select
  formatNetworkKeyOptions = networkKeyOptions => {
    return networkKeyOptions.map(keyList => {
      // store aggregated data for the key
      return {name: keyList[0].displayName, data: keyList};
    });
  };

  // Format pull-down menu options for the AsyncTypeahead component to display keys
  renderTypeaheadKeyMenu = option => {
    return [
      <strong key="name">{option.name}</strong>,
      <div key="data">Nodes: {option.data.length}</div>,
    ];
  };

  // Add new graph from the network form data and add graph to the dashboard
  onSubmitNetworkGraph = () => {
    const {generalFormData} = this.props;
    const {startTime, endTime, minAgo} = generalFormData.customGraphChecked
      ? generalFormData.customData
      : this.props.dashboard;

    const graphFormData = {
      generalFormData,
      networkAggGraphData: this.state,
    };

    // get keyName from the first instance of the key selected
    const keyName = this.state.networkKeySelected[0]
      ? this.state.networkKeySelected[0].name
      : '';
    const graphName = `${this.state.graphAggType} ${keyName}`;

    const inputData = {
      endTime,
      keys: this.state.networkKeySelected[0].data,
      minAgo,
      name: graphName,
      startTime,
      setup: {
        aggType: this.state.graphAggType,
        graphFormData,
        graphType: 'network',
        keyName,
      },
    };
    this.props.onSubmitNewGraph('network', inputData);
  };

  // Asynchronously make a query to the stats_ta backend to fetch key data based
  // on the key the user types into the AsyncTypeahead
  onNetworkKeySearch = query => {
    this.setState({
      networkKeyIsLoading: true,
      networkKeyOptions: [],
    });

    fetchAggregatedData(query, this.props.topologyName)
      .then(aggDataResp => {
        const keyData = aggDataResp.data;

        this.setState({
          networkKeyIsLoading: false,
          networkKeyOptions: this.formatNetworkKeyOptions(keyData),
        });
      })
      .catch(err => {
        console.error('Error getting network key options', err);
        this.setState({
          networkKeyIsLoading: false,
          networkKeyOptions: [],
        });
      });
  };

  render() {
    const disableNetworkSubmit = this.state.networkKeySelected === '';
    return (
      <div>
        <h4>Network Metrics</h4>
        <div className="input-box">
          <p>Key</p>
          <AsyncTypeahead
            key="keys"
            labelKey="name"
            placeholder="Enter metric/key name"
            isLoading={this.state.networkKeyIsLoading}
            onSearch={this.onNetworkKeySearch}
            onChange={this.metricSelectionChanged}
            renderMenuItemChildren={this.renderTypeaheadKeyMenu}
            options={this.state.networkKeyOptions}
          />
        </div>
        <div className="input-box">
          <p>Aggregation</p>
          {GRAPH_AGG_OPTS.map(opts => (
            <button
              label={opts.name}
              key={opts.name}
              className={cx({
                'graph-button': true,
                'graph-button-selected': opts.name === this.state.graphAggType,
              })}
              onClick={() => this.setState({graphAggType: opts.name})}>
              {opts.title}
            </button>
          ))}
        </div>
        <button
          className="graph-button submit-button"
          disabled={disableNetworkSubmit}
          onClick={this.onSubmitNetworkGraph}>
          Submit
        </button>
      </div>
    );
  }
}
