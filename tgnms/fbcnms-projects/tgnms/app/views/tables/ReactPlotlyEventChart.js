/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import {isEqual} from 'lodash-es';

// load the basic bundle of plotly to avoid bundle bloat
// includes scatter, pie, and bar
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

export default class PlotlyEventChart extends React.Component {
  static propTypes = {
    endTime: PropTypes.number.isRequired,
    events: PropTypes.array.isRequired,
    height: PropTypes.number.isRequired,
    startTime: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
  };

  state = {
    plotlyData: [],
    // ending time of the x axis
    xAxisEnd: null,
    // starting time of the x axis
    xAxisStart: null,
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

  onGraphRelayout = layoutData => {
    // keep range that users selects and dont reset range when component updates
    if (layoutData['xaxis.autorange']) {
      this.setState({
        xAxisEnd: null,
        xAxisStart: null,
      });
    } else {
      this.setState({
        xAxisEnd: layoutData['xaxis.range[1]'],
        xAxisStart: layoutData['xaxis.range[0]'],
      });
    }
  };

  setPlotlyTraces = () => {
    // loop through prop events to create traces
    const linkUpTrace = {
      x: [],
      y: [],
      text: [],
      mode: 'lines',
      hoverinfo: 'text',
      connectgaps: false,
      line: {
        color: '#4daf4a',
        width: 25,
      },
    };

    const linkUpDatadownTrace = {
      x: [],
      y: [],
      text: [],
      mode: 'lines',
      hoverinfo: 'text',
      connectgaps: false,
      line: {
        color: '#cd5554',
        width: 25,
      },
    };

    const linkUpAvailUnknownTrace = {
      x: [],
      y: [],
      text: [],
      mode: 'markers+lines',
      hoverinfo: 'text',
      connectgaps: false,
      line: {
        color: '#ababab',
        width: 25,
      },
    };

    // see Stats.thrift
    const LINK_STATE = {
      LINK_UP: 1,
      LINK_UP_DATADOWN: 2,
      LINK_UP_AVAIL_UNKNOWN: 3,
    };
    for (const event of this.props.events) {
      let trace = {};
      if (event.linkState === LINK_STATE.LINK_UP_DATADOWN) {
        trace = linkUpDatadownTrace;
      } else if (event.linkState === LINK_STATE.LINK_UP) {
        trace = linkUpTrace;
      } else {
        trace = linkUpAvailUnknownTrace;
      }
      trace.x.push(new Date(event.startTime * 1000));
      trace.x.push(new Date(event.endTime * 1000));
      trace.x.push(new Date(event.endTime * 1000));
      trace.y.push(0, 0, NaN);
      trace.text.push(event.description, '', '');
    }

    const plotlyData = [
      linkUpTrace,
      linkUpDatadownTrace,
      linkUpAvailUnknownTrace,
    ];

    // set the new traces
    this.setState({
      plotlyData,
    });
  };

  render() {
    const {plotlyData, xAxisStart, xAxisEnd} = this.state;

    // Use the start and end times in the state (if set by zooming in)
    // otherwise, use the start and end times passed in from the parent.
    const xStart = xAxisStart || new Date(this.props.startTime * 1000);
    const xEnd = xAxisEnd || new Date(this.props.endTime * 1000);
    return (
      <div
        onClick={event => {
          // Stop event from bubbling up to the table
          event.stopPropagation();
        }}>
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
            hovermode: 'closest',
            hoverdistance: -1,
            selectdirection: 'h',
            showlegend: false,
            width: this.props.width,
            xaxis: {
              tickformat: '%b %d %Hh',
              range: [xStart, xEnd],
            },
            yaxis: {
              visible: false,
            },
          }}
          config={{
            displayModeBar: false,
          }}
          onRelayout={this.onGraphRelayout}
        />
      </div>
    );
  }
}
