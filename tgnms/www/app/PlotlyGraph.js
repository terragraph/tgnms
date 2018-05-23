/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import equals from 'equals';
import PropTypes from 'prop-types';
import React from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

export default class PlotlyGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.chartRequest = undefined;
  }

  state = {
    data: null,
    indicator: 'IDLE',
    dataCounter: 0,
    plotlyData: [],
  };

  componentDidMount() {
    this.refreshData();

    // schedule fixed interval refresh
    this.timer = setInterval(() => this.refreshData(), 10000);
  }

  componentWillUnmount() {
    this.cancelAsyncRequests();
  }

  cancelAsyncRequests() {
    if (this.chartRequest) {
      this.chartRequest.abort();
    }
    clearInterval(this.timer);
  }

  componentDidUpdate(nextProps, nextState) {
    // check to see if props were updated
    let changed =
      this.props.options.length != nextProps.options.length &&
      nextProps.options.length;
    if (!changed) {
      for (let i = 0; i < this.props.options.length; i++) {
        const curOpts = this.props.options[i];
        const nextOpts = nextProps.options[i];
        if (!equals(curOpts, nextOpts)) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      this.cancelAsyncRequests();
      this.setState({
        data: null,
        indicator: 'LOAD',
      });
      this.timer = setInterval(() => this.refreshData(), 30000);
      this.refreshData();
    }

    // check to see if state was updated
    if (
      (this.state.data == null && nextState.data != null) ||
      (this.state.data != null && nextState.data == null) ||
      this.state.dataCounter != nextState.dataCounter
    ) {
      return true;
    }
    return false;
  }

  refreshData() {
    if (!this.props.options.key_ids.length) {
      this.setState({
        data: null,
        indicator: 'NO_DATA',
      });
      return null;
    }
    axios
      .post('/multi_chart/', JSON.stringify([this.props.options]))
      .then(resp => {
        if (!resp.data) {
          console.log('No data available');
          this.setState({
            data: null,
            indicator: 'NO_DATA',
          });
        } else {
          // process data to fit format for Plotly
          const graphData = resp.data[0];
          const traces = this.plotDataFormatter(graphData);

          this.setState({
            data: graphData,
            plotlyData: traces,
            indicator: resp.data ? 'LOADED' : 'NO_DATA',
            dataCounter: this.state.dataCounter + 1,
          });
        }
      })
      .catch(err => {
        console.log(err);
        this.setState({
          data: null,
          indicator: 'FAILED',
        });
      });
  }

  // Format the response data for Plotly graphs
  plotDataFormatter(graphData) {
    if (graphData && graphData.points && graphData.points[0]) {
      let traces = [];
      // Create the correct number of trace (line) objects
      for (var i = 0; i < graphData.points[0].length - 1; i++) {
        traces.push({
          x: [], // Will contain the timestamp
          y: [], // Will contain the data
          type: 'scatter',
          mode: 'line',
          name: graphData.columns[i + 1],
        });
      }
      // Populate the x and y data for each of the traces from the points
      graphData.points.forEach(point => {
        point[0] = new Date(point[0]);
        for (var i = 1; i < point.length; i++) {
          const trace = traces[i - 1];
          trace.x.push(point[0]); // Push the timestamp contained at point[0]
          trace.y.push(point[i]); // Push the data
        }
      });
      return traces;
    }
  }

  render() {
    const divkey = this.props.divkey;
    let divHeight = 0;
    let divWidth = 0;
    if (document.getElementById('plot-' + divkey) !== null) {
      divHeight = document.getElementById('plot-' + divkey).offsetHeight;
      divWidth = document.getElementById('plot-' + divkey).offsetWidth;
    }
    return (
      <div className="dashboard-plotly-wrapper" id={'plot-' + divkey}>
        <Plot
          data={this.state.plotlyData}
          layout={{height: divHeight, width: divWidth, title: this.props.title}}
        />
      </div>
    );
  }
}

PlotlyGraph.propTypes = {
  divkey: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
};
