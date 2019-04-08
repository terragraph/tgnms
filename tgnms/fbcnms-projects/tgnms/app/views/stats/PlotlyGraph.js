/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';
import equals from 'equals';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';

// load the basic bundle of plotly to avoid bundle bloat
// includes scatter, pie, and bar
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

// graph sizing defaults
// these are large due to the key names in the legend being typically verbose
const MIN_GRAPH_WIDTH = 750;
const GRAPH_HEIGHT = 400;
// margin between graphs to ensure they land inline on the same line
const GRAPH_GAP_WIDTH = 20;
// refresh interval (ms)
const GRAPH_REFRESH_INTERVAL_SEC = 10;
// maximum name length to prevent legend taking over the graph
const GRAPH_LINE_NAME_MAX_LENGTH = 40;

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
    this.timer = setInterval(
      () => this.refreshData(),
      GRAPH_REFRESH_INTERVAL_SEC * 1000,
    );
    window.addEventListener('resize', () =>
      this.windowResizeListener.bind(this),
    );
  }

  componentWillUnmount() {
    window.removeEventListener('resize', () =>
      this.windowResizeListener.bind(this),
    );
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
    const changed = !equals(this.props.options, nextProps.options);
    if (changed) {
      this.cancelAsyncRequests();
      this.setState({
        data: null,
        indicator: 'LOAD',
        plotlyData: [],
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

  windowResizeListener() {
    this.forceUpdate();
  }

  refreshData() {
    if (!this.props.options.keyNames.length) {
      this.setState({
        data: null,
        indicator: 'NO_DATA',
      });
    }
    axios
      .post('/metrics/multi_chart/', this.props.options, {
        'Content-Type': 'application/x-www-form-urlencoded',
      })
      .then(resp => {
        if (!resp.data) {
          this.setState({
            data: null,
            indicator: 'NO_DATA',
          });
        } else {
          // process data to fit format for Plotly
          const graphData = resp.data;
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
      if (this.state.plotlyData && this.state.plotlyData.length !== 0) {
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
            name: graphData.columns[i + 1].substr(
              0,
              GRAPH_LINE_NAME_MAX_LENGTH,
            ),
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
    // Format time range based on if minAgo is specified or not
    const {title, containerId} = this.props;
    let {startTsSec, endTsSec, minAgo} = this.props.options;
    if (minAgo) {
      endTsSec = moment().toDate();
      startTsSec = moment()
        .subtract(minAgo, 'minutes')
        .toDate();
    } else {
      startTsSec *= 1000;
      endTsSec *= 1000;
    }
    // Format height and width of graph

    let width = MIN_GRAPH_WIDTH;
    if (document.getElementById(containerId) !== null) {
      const containerWidth = document.getElementById(containerId).offsetWidth;
      // try to fit two if each graph width > minGraphWidth
      if (containerWidth > MIN_GRAPH_WIDTH * 2.0 + GRAPH_GAP_WIDTH) {
        width = Math.floor(containerWidth / 2.0 - GRAPH_GAP_WIDTH);
      } else if (containerWidth > MIN_GRAPH_WIDTH) {
        width = containerWidth;
      } else {
        width = MIN_GRAPH_WIDTH;
      }
    }

    return (
      <div className="dashboard-plotly-wrapper" style={{display: 'inline'}}>
        <Plot
          data={this.state.plotlyData}
          layout={{
            height: GRAPH_HEIGHT,
            title,
            width,
            showlegend: this.state.showLegend,
            legend: {
              x: 1,
              y: 0.5,
              //orientation: 'h',
            },
            xaxis: {
              range: [xaxisStart || startTsSec, xaxisEnd || endTsSec],
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
                name: 'Toggle Legend',
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
  containerId: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
};
