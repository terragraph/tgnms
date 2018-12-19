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

  outageEventStyleCB(event, state) {
    // see Stats.thrift
    const LINK_STATE = {
      LINK_UP: 1,
      LINK_UP_DATADOWN: 2,
      LINK_UP_AVAIL_UNKNOWN: 3,
    };
    let color = '#4daf4a'; // for LINK_UP
    if (event.get('linkState') === LINK_STATE.LINK_UP_DATADOWN) {
      color = '#ff3672';
    } else if (event.get('linkState') === LINK_STATE.LINK_UP_AVAIL_UNKNOWN) {
      color = '#ababab';
    }
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
    const timeRange = new TimeRange(
      this.props.startTime * 1000,
      this.props.endTime * 1000,
    );
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
        height={this.props.height}>
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
              label={e => e.get('description')}
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
  startTime: PropTypes.number.isRequired,
};
