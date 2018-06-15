/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {TimeSeries, TimeRange, TimeRangeEvent} from 'pondjs';
import PropTypes from 'prop-types';
import {
  Charts,
  ChartContainer,
  ChartRow,
  EventChart,
  LabelAxis,
} from 'react-timeseries-charts';
import React from 'react';

export default class ReactEventChart extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  nextColor(index) {
    const colors = [
      '#e41a1c',
      '#377eb8',
      '#4daf4a',
      '#984ea3',
      '#ff7f00',
      '#ffff33',
      '#a65628',
      '#f781bf',
    ];
    return colors.length > index ? colors[index] : '#000000';
  }

  outageEventStyleCB(event, state) {
    // green
    const color = '#4daf4a';
    switch (state) {
      case 'normal':
        return {
          fill: color,
        };
      case 'hover':
        return {
          fill: color,
          opacity: 0.6,
        };
      case 'selected':
        return {
          fill: color,
        };
    }
    return {};
  }

  shortenName(name) {
    // shorten name for tg lab nodes
    return name.replace('.tg.a404-if', '');
  }

  render() {
    if (this.props.events.length == 0 || this.props.events[0].length == 0) {
      return <div>No link data available</div>;
    }
    const timeRange = new TimeRange(this.props.startTime, this.props.endTime);
    const events = this.props.events.map(
      ({startTime, endTime, ...data}) =>
        new TimeRangeEvent(
          new TimeRange(new Date(startTime * 1000), new Date(endTime * 1000)),
          data,
        ),
    );
    const series = new TimeSeries({events, name: 'outages'});
    return (
      <ChartContainer
        timeRange={timeRange}
        enablePanZoom={true}
        width={this.props.width}
        height={this.props.height}
      >
        <ChartRow height="35">
          <LabelAxis
            format=",.1f"
            hideScale={true}
            id="link_status"
            label=""
            min={0}
            max={0}
            type="linear"
            width={0}
          />
          <Charts>
            <EventChart
              axis="link_status"
              series={series}
              height={80}
              style={this.outageEventStyleCB}
              label={e => e.get('title')}
            />
          </Charts>
        </ChartRow>
      </ChartContainer>
    );
  }
}

ReactEventChart.propTypes = {
  endTime: PropTypes.number.isRequired,
  events: PropTypes.array.isRequired,
  size: PropTypes.string.isRequired,
  startTime: PropTypes.number.isRequired,
};
