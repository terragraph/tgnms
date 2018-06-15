/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import React from 'react';
import {fetchAggregatedData} from '../../helpers/NetworkDashboardsHelper.js';
import PropTypes from 'prop-types';
import cx from 'classnames';

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

export default class NetworkAggregationForm extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    onSubmitNewGraph: PropTypes.func.isRequired,
    dashboard: PropTypes.object.isRequired,
    customData: PropTypes.object.isRequired,
    customGraphChecked: PropTypes.bool.isRequired,
  };

  state = {
    keyOptions: [],
    keySelected: '',
    graphAggType: 'top',
    keyIsLoading: false,
  };

  metricSelectionChanged = selectedOpts => {
    this.setState({
      keySelected: selectedOpts,
    });
  };

  formatKeyOptions = keyOptions => {
    return keyOptions.map(keyList => {
      // store aggregated data for the key
      return {name: keyList[0].displayName, data: keyList};
    });
  };

  renderTypeaheadKeyMenu = (option) => {
    return [
      <strong key="name">{option.name}</strong>,
      <div key="data">Nodes: {option.data.length}</div>,
    ];
  };

  onSubmitNetworkGraph = () => {
    const {startTime, endTime, minAgo} = this.props.customGraphChecked
      ? this.props.customData
      : this.props.dashboard;

    const {customData, customGraphChecked} = this.props;

    const graphFormData = {
      ...this.state,
      customData,
      customGraphChecked,
    };

    const keyName = this.state.keySelected[0].name;
    const graphName = `${this.state.graphAggType} ${keyName}`;

    const inputData = {
      startTime,
      endTime,
      minAgo,
      setup: {
        graphType: 'network',
        aggType: this.state.graphAggType,
        // store what the user key the user searched
        keyName,
        graphFormData,
      },
      name: graphName,
      keys: this.state.keySelected[0].data,
    };

    this.props.onSubmitNewGraph('network', inputData);
  };

  onNetworkKeySearch = query => {
    this.setState({
      keyIsLoading: true,
      keyOptions: [],
    });

    fetchAggregatedData(query, this.props.topologyName)
      .then(aggDataResp => {
        const keyData = aggDataResp.data;

        this.setState({
          keyIsLoading: false,
          keyOptions: this.formatKeyOptions(keyData),
        });
      })
      .catch(err => {
        console.error('Error getting network key options', err);
        this.setState({
          keyIsLoading: false,
          keyOptions: [],
        });
      });
  };

  render() {
    return (
      <div>
        <h4>Network Metrics</h4>
        <div className="input-box">
          <p>Key</p>
          <AsyncTypeahead
            key="keys"
            labelKey="name"
            placeholder="Enter metric/key name"
            isLoading={this.state.keyIsLoading}
            onSearch={this.onNetworkKeySearch}
            onChange={this.metricSelectionChanged}
            renderMenuItemChildren={this.renderTypeaheadKeyMenu}
            options={this.state.keyOptions}
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
                'graph-button-selected': opts.name === this.state.graphAggType
              })}
              onClick={() => this.setState({graphAggType: opts.name})}>
              {opts.title}
            </button>
          ))}
        </div>
        <button
          className="graph-button submit-button"
          onClick={this.onSubmitNetworkGraph}>
          Submit
        </button>
      </div>
    );
  }
}
