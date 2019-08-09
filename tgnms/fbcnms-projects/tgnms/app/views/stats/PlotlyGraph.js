/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import PropTypes from 'prop-types';
import React from 'react';
import axios from 'axios';
import equals from 'equals';

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
const GRAPH_REFRESH_INTERVAL_MS = 10000;

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
      GRAPH_REFRESH_INTERVAL_MS,
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
    const {options, queryUrl} = this.props;

    axios
      .get(queryUrl, {params: options})
      .then(resp => {
        if (!resp.data) {
          this.setState({
            data: null,
            indicator: 'NO_DATA',
          });
        } else {
          // process data to fit format for Plotly
          const graphData = resp.data;
          const traces = this.props.dataFormatter(
            this.state.plotlyData /* old data */,
            graphData /* new data */,
          );

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
    const {containerId, endTsMs, startTsMs, title} = this.props;
    // Format time
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
              range: [xaxisStart || startTsMs, xaxisEnd || endTsMs],
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
  dataFormatter: PropTypes.func.isRequired,
  startTsMs: PropTypes.number.isRequired,
  endTsMs: PropTypes.number.isRequired,
  containerId: PropTypes.string.isRequired,
  queryUrl: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
};
