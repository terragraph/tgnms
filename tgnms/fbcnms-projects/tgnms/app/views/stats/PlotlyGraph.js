/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import LoadingBox from '../../components/common/LoadingBox';
import React from 'react';
import axios from 'axios';
import equals from 'equals';
import {withStyles} from '@material-ui/core/styles';

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

const styles = {
  loadingWrapper: {
    display: 'inline-flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: GRAPH_HEIGHT,
    width: MIN_GRAPH_WIDTH,
  },
};

type Props = {
  dataFormatter: func,
  dataValidator: func,
  startTsMs: number,
  endTsMs: number,
  containerId: string,
  queryUrl: string,
  options: object,
  title: string,
};

type State = {
  data: any,
  dataCounter: number,
  indicator: string,
  plotlyData: any,
  relayout: boolean,
  xasixEnd: any,
  xaxisStart: any,
  showLegend: boolean,
};

class PlotlyGraph extends React.Component<Props, State> {
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
      this.handleChangedOptions();
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

  handleChangedOptions() {
    this.cancelAsyncRequests();
    this.setState({
      data: null,
      indicator: 'LOAD',
      plotlyData: [],
    });
    this.timer = setInterval(() => this.refreshData(), 30000);
    this.refreshData();
  }

  windowResizeListener() {
    this.forceUpdate();
  }

  refreshData() {
    const {dataFormatter, dataValidator, options, queryUrl} = this.props;

    axios
      .get(queryUrl, {params: options})
      .then(resp => {
        // TODO - should use dataValidator to show an error instead of loading
        if (!resp.data || !dataValidator(resp.data)) {
          this.setState({
            data: null,
            indicator: 'NO_DATA',
          });
        } else {
          // process data to fit format for Plotly
          const graphData = resp.data;
          const traces = dataFormatter(
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
    const {indicator, xaxisStart, xaxisEnd} = this.state;
    const {classes, containerId, endTsMs, startTsMs, title} = this.props;
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
    return indicator !== 'LOADED' ? (
      <div className={classes.loadingWrapper}>
        <LoadingBox fullScreen={false} />
      </div>
    ) : (
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

export default withStyles(styles)(PlotlyGraph);
