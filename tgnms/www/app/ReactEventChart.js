import PropTypes from 'prop-types';
import React from "react";
import { Dispatcher } from "flux";
import {
  Charts,
  ChartContainer,
  ChartRow,
  YAxis,
  EventChart,
  LabelAxis,
  styler
} from "react-timeseries-charts";
import { Index, TimeSeries, TimeRange, TimeRangeEvent } from "pondjs";
import equals from "equals";

export default class ReactEventChart extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  nextColor(index) {
    const colors = [
      "#e41a1c",
      "#377eb8",
      "#4daf4a",
      "#984ea3",
      "#ff7f00",
      "#ffff33",
      "#a65628",
      "#f781bf"
    ];
    return colors.length > index ? colors[index] : "#000000";
  }

  outageEventStyleCB(event, state) {
    // green
    const color = "#4daf4a";
    switch (state) {
      case "normal":
        return {
          fill: color
        };
      case "hover":
        return {
          fill: color,
          opacity: 0.6
        };
      case "selected":
        return {
          fill: color
        };
    }
  }

  shortenName(name) {
    // shorten name for tg lab nodes
    return name.replace(".tg.a404-if", "");
  }

  render() {
    if (this.props.events.length == 0 || this.props.events[0].length == 0) {
      return <div>No link data available</div>;
    }
    let timeRange = new TimeRange(this.props.startTime, this.props.endTime);
    const events = this.props.events.map(
      ({ startTime, endTime, ...data }) =>
        new TimeRangeEvent(
          new TimeRange(new Date(startTime * 1000), new Date(endTime * 1000)),
          data
        )
    );
    const series = new TimeSeries({ name: "outages", events });
    return (
      <ChartContainer timeRange={timeRange} enablePanZoom={true}>
        <ChartRow height="35">
          <LabelAxis
            hideScale={true}
            id="link_status"
            label=""
            min={0}
            max={0}
            width={0}
            type="linear"
            format=",.1f"
          />
          <Charts>
            <EventChart
              axis="link_status"
              series={series}
              height={80}
              style={this.outageEventStyleCB}
              label={e => e.get("title")}
            />
          </Charts>
        </ChartRow>
      </ChartContainer>
    );
  }
}

ReactEventChart.propTypes = {
  startTime: PropTypes.number.isRequired,
  endTime: PropTypes.number.isRequired,
  size: PropTypes.string.isRequired,
  events: PropTypes.array.isRequired
};
