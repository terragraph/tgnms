import React from 'react';
import { Dispatcher } from 'flux';
import { Charts, ChartContainer, ChartRow, YAxis, EventChart,
         LabelAxis, styler } from "react-timeseries-charts";
import { Index, TimeSeries, TimeRange, TimeRangeEvent } from "pondjs";
import equals from "equals";
 
export default class ReactEventChart extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      data: [],
      tracker: null,
      indicator: 'IDLE',
    };
    this.chartRequest = undefined;
  }

  componentDidMount() {
    this.refreshData();
    // schedule fixed interval refresh
    this.timer = setInterval(this.refreshData.bind(this), 10000);
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
    // compare list of nodes and key names only for each list item
    // the 'status' item for each node has a timestamp, so this gets changed
    // each iteration
    let changed = (this.props.options.length != nextProps.options.length) &&
                  (this.props.options.length);
    if (!changed) {
      for (let i = 0; i < this.props.options.length; i++) {
        let curOpts = this.props.options[i];
        let newOpts = nextProps.options[i];
        if (!equals(curOpts, newOpts)) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      this.cancelAsyncRequests();
      this.timer = setInterval(this.refreshData.bind(this), 10000);
      this.refreshData();
    }
  }

  nextColor(index) {
    const colors = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3",
                    "#ff7f00", "#ffff33", "#a65628", "#f781bf"];
    return colors.length > index ? colors[index] : "#000000";
  }

  handleTrackerChanged(tracker) {
    this.setState({tracker});
  }

  handleTimeRangeChange(timerange) {
    this.setState({timerange});
  }

  refreshData() {
    if (!this.props.options.length) {
      return;
    }
    this.chartRequest = new XMLHttpRequest();
    this.chartRequest.onload = function() {
      if (!this.chartRequest) {
        return;
      }
      // TODO - handle http status codes
      if (!this.chartRequest.responseText.length) {
        // no data to display, should show a different indicator
        this.setState({
          data: [],
          indicator: 'NO_DATA',
        });
        return;
      }
      let jsonResp = '';
      try {
        let respTxt = this.chartRequest.responseText;
        jsonResp = JSON.parse(respTxt);
      } catch (e) {
        console.log('Unable to parse json',
                    e,
                    this.chartRequest.responseText);
      }
      this.setState({
        data: jsonResp,
        indicator: jsonResp ? 'LOADED' : 'NO_DATA',
      });
    }.bind(this);
    // handle failed requests
    this.chartRequest.onreadystatechange = function(chartEvent) {
      if (this.chartRequest.readyState == 4 &&
          this.chartRequest.status == 0) {
        this.setState({
          data: [],
          indicator: 'FAILED',
        });
      }
    }.bind(this);
    try {
      this.chartRequest.open('POST', '/event/', true);
      this.chartRequest.send(JSON.stringify(this.props.options));
    } catch (e) {}
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
    return name.replace(".tg.a404-if","");
  }

  render() {
    if (this.state.data.length != 1 || this.state.data[0].length == 0) {
      return (<div>No data available</div>);
    }
    let opts = this.props.options;
    let chartRows = [];
    // initial processing of time series, maybe handle
    // SUM vs. individual graphs here?
    let reqIdx = 0;
    let timeRange = TimeRange.lastDay();
    let width = 450;
    let height = 250;
    // reduce legend selectors
    // {key, {label, [time series?]}}
    switch (this.props.size) {
      case 'large':
        width = 600;
        height = 500;
        break;
    }
    const events = this.state.data[0].map(({startTime, endTime, ...data}) =>
        new TimeRangeEvent(new TimeRange(new Date(startTime),new Date(endTime)), data)
    );
    const series = new TimeSeries({name: "outages", events});
    return (
      <ChartContainer
          timeRange={timeRange}
          enablePanZoom={true}
          onTimeRangeChanged={this.handleTimeRangeChange.bind(this)}>
        <ChartRow height="35">
          <LabelAxis
            hideScale={true}
            id="link_status"
            label="Link Availability"
            min={0} max={0}
            width={140}
            type="linear" format=",.1f"/>
          <Charts>
            <EventChart
              axis="link_status"
              series={series}
              height="100"
              style={(this.outageEventStyleCB)}
              label={e => e.get("title")} />
          </Charts>
        </ChartRow>
      </ChartContainer>
    );
  }
}

ReactEventChart.propTypes = {
  size: React.PropTypes.string.isRequired,
  options: React.PropTypes.array.isRequired,
};
