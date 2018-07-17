/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import Plot from 'react-plotly.js';
import React from 'react';
import moment from 'moment';
import {isEqual} from 'lodash-es';

const LINK_UP = 1;
const LINE_COLOR = '#67AC5B';
const HOVER_LABEL_COLOR = '#d3e5cc';
const HOVER_LABEL_TEXT_COLOR = '#000';

export default class PlotlyEventChart extends React.Component {
  static propTypes = {
    endTime: PropTypes.number.isRequired,
    events: PropTypes.array.isRequired,
    height: PropTypes.number.isRequired,
    startTime: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
  };

  state = {
    // array of traces (lines containing x and y coordinates and other line info)
    plotlyData: [],
    // ending time of the x axis
    xaxisEnd: '',
    // starting time of the x axis
    xaxisStart: '',
  };

  componentDidMount() {
    // create traces for the graph based on the events prop
    this.setPlotlyTraces();
  }

  componentDidUpdate(nextProps) {
    // when new events are passed down, update the traces
    if (!isEqual(nextProps.events, this.props.events)) {
      this.setPlotlyTraces();
    }
  }

  onGraphRelayout(layoutData) {
    // keep range that users selects and dont reset range when component updates
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

  setPlotlyTraces = () => {
    // loop through prop events to create traces
    const traces = this.props.events.map(event => {
      const {startTime, endTime, title} = event;
      // return trace object
      return {
        // each trace is a link up event, so create a straight line between
        // start and end time of the event
        hoverinfo: 'text',
        hoverlabel: {
          bgcolor: HOVER_LABEL_COLOR,
          bordercolor: HOVER_LABEL_COLOR,
          font: {
            color: HOVER_LABEL_TEXT_COLOR,
          },
        },
        hovertext: title,
        line: {color: LINE_COLOR, width: 20},
        mode: 'lines',
        x: [new Date(startTime * 1000), new Date(endTime * 1000)],
        y: [LINK_UP, LINK_UP],
      };
    });
    // set the new traces, restrict xaxis to display the last 24 hours
    this.setState({
      plotlyData: traces,
      xaxisEnd: new Date(),
      xaxisStart: moment()
        .subtract({hours: 24})
        .toDate(),
    });
  };

  render() {
    const {plotlyData, xaxisStart, xaxisEnd} = this.state;
    return (
      <Plot
        data={plotlyData}
        layout={{
          height: this.props.height,
          margin: {
            l: 10,
            r: 10,
            b: 20,
            t: 10,
            pad: 5,
          },
          showlegend: false,
          width: this.props.width,
          xaxis: {
            range: [xaxisStart, xaxisEnd],
          },
          yaxis: {
            visible: false,
          },
        }}
        config={{
          displayModeBar: false,
        }}
        onRelayout={layoutData => this.onGraphRelayout(layoutData)}
      />
    );
  }
}
