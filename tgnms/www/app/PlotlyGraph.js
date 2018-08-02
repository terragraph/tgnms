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
import moment from 'moment';

export default class PlotlyGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.chartRequest = undefined;
  }

  state = {
    data: null,
    dataCounter: 0,
    indicator: 'IDLE',
    plotlyData: [],
    relayout: false,
    xasixEnd: null,
    xaxisStart: null,
    showLegend: true,
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
      this.props.options.length !== nextProps.options.length &&
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
      (this.state.data === null && nextState.data !== null) ||
      (this.state.data !== null && nextState.data === null) ||
      this.state.dataCounter !== nextState.dataCounter
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
    }
    const {
      agg_type,
      endTime,
      key_ids,
      key_data,
      minAgo,
      startTime,
    } = this.props.options;

    // convert dates to time stamps (sec) using moment.format("X")
    const startTsNum = startTime ? startTime.getTime() / 1000 : null;
    const endTsNum = endTime ? endTime.getTime() / 1000 : null;

    const graphRequest = [
      {
        agg_type,
        data: key_data,
        end_ts: endTsNum,
        key_ids,
        min_ago: minAgo,
        start_ts: startTsNum,
        type: 'key_ids',
      },
    ];
    axios
      .post('/metrics/multi_chart/', graphRequest, {
        'Content-Type': 'application/x-www-form-urlencoded',
      })
      .then(resp => {
        if (!resp.data) {
          console.error('No data available');
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
            dataCounter: this.state.dataCounter + 1,
            indicator: resp.data ? 'LOADED' : 'NO_DATA',
            plotlyData: traces,
          });
        }
      })
      .catch(err => {
        console.error('Error refreshing data', err);
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

      // If there is already plotly data (lines are already on the graph),
      // then refresh the trace's x and y data, otherwise make new traces
      if (this.state.plotlyData.length !== 0) {
        traces = this.state.plotlyData.map(trace => ({
          ...trace,
          x: [],
          y: [],
        }));
      } else {
        // Create the correct number of trace (line) objects
        for (let i = 0; i < graphData.points[0].length - 1; i++) {
          traces.push({
            mode: 'line',
            name: graphData.columns[i + 1],
            type: 'scatter',
            x: [], // Will contain the timestamp
            y: [], // Will contain the data
          });
        }
      }

      // Populate the x and y data for each of the traces from the points
      graphData.points.forEach(point => {
        point[0] = new Date(point[0]);
        for (let i = 1; i < point.length; i++) {
          const trace = traces[i - 1];
          trace.x.push(point[0]); // Push the timestamp contained at point[0]
          trace.y.push(point[i]); // Push the data
        }
      });
      return traces;
    }
  }

  onGraphRelayout(layoutData) {
    if (layoutData['xaxis.autorange']) {
      this.setState({
        relayout: false,
        xaxisEnd: null,
        xaxisStart: null,
      });
    } else {
      this.setState({
        relayout: true,
        xaxisEnd: layoutData['xaxis.range[1]'],
        xaxisStart: layoutData['xaxis.range[0]'],
      });
    }
  }

  render() {
    const {xaxisStart, xaxisEnd} = this.state;
    const {divkey, title} = this.props;

    // Format time range based on if minAgo is specified or not
    let {startTime, endTime, minAgo} = this.props.options;
    if (minAgo) {
      endTime = moment().toDate();
      startTime = moment()
        .subtract(minAgo, 'minutes')
        .toDate();
    }
    // Format height and width of graph
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
          layout={{
            height: divHeight,
            title,
            width: divWidth,
            showlegend: this.state.showLegend,
            xaxis: {
              range: [xaxisStart || startTime, xaxisEnd || endTime],
            },
          }}
          config={{
            displaylogo: false,
            modeBarButtonsToRemove: [
              'sendDataToCloud',
              'hoverCompareCartesian',
              'hoverClosestCartesian',
              'toggleSpikelines',
            ],
            modeBarButtonsToAdd: [
              {
                name: 'Toggle legend',
                click: () =>
                  this.setState({showLegend: !this.state.showLegend}),
              },
            ],
          }}
          onRelayout={layoutData => this.onGraphRelayout(layoutData)}
        />
      </div>
    );
  }
}

PlotlyGraph.propTypes = {
  divkey: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
};
