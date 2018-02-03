import React from "react";
import { Dispatcher } from "flux";
import {
  Charts,
  ChartContainer,
  ChartRow,
  YAxis,
  AreaChart,
  LineChart,
  Legend,
  styler
} from "react-timeseries-charts";
import { Index, TimeSeries, TimeRange } from "pondjs";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import equals from "equals";

export default class ReactMultiGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      data: [],
      tracker: null,
      indicator: "IDLE"
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

  formatSpeed(bps) {
    // TODO - this is used for all metrics, we need more context
    return Math.ceil(bps * 100) / 100;
    if (bps > 1000000) {
      return Math.round(bps / 1000000) + " mbps";
    }
    if (bps > 1000) {
      return Math.round(bps / 1000) + " kbps";
    }
    return bps + " bps";
  }

  componentDidUpdate(prevProps, prevState) {
    // compare list of nodes and key names only for each list item
    // the 'status' item for each node has a timestamp, so this gets changed
    // each iteration
    let changed =
      this.props.options.length != prevProps.options.length &&
      this.props.options.length;
    if (!changed) {
      for (let i = 0; i < this.props.options.length; i++) {
        let curOpts = this.props.options[i];
        let oldOpts = prevProps.options[i];
        if (!equals(curOpts, oldOpts)) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      this.cancelAsyncRequests();
      this.setState({
        data: [],
        indicator: "LOAD"
      });
      this.timer = setInterval(this.refreshData.bind(this), 10000);
      this.refreshData();
    }
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

  handleTrackerChanged(tracker) {
    // need to find the series first
    this.setState({ tracker });
  }

  handleTimeRangeChange(timerange) {
    this.setState({ timerange });
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
          indicator: "NO_DATA"
        });
        return;
      }
      let jsonResp = "";
      try {
        let respTxt = this.chartRequest.responseText;
        jsonResp = JSON.parse(respTxt);
      } catch (e) {
        console.log("Unable to parse json", e, this.chartRequest.responseText);
      }
      this.setState({
        data: jsonResp,
        indicator: jsonResp ? "LOADED" : "NO_DATA"
      });
    }.bind(this);
    // handle failed requests
    this.chartRequest.onreadystatechange = function(chartEvent) {
      if (this.chartRequest.readyState == 4 && this.chartRequest.status == 0) {
        this.setState({
          data: [],
          indicator: "FAILED"
        });
      }
    }.bind(this);
    try {
      this.chartRequest.open("POST", "/multi_chart/", true);
      this.chartRequest.send(JSON.stringify(this.props.options));
    } catch (e) {}
  }

  shortenName(name) {
    // shorten name for tg lab nodes
    return name.replace(".tg.a404-if", "");
  }

  renderMarker() {
    if (!this.state.tracker) {
      return <g />;
    }
    return;
    <EventMarker
      type="flag"
      axis="axis"
      event={this.state.tracker}
      column=""
      info={[
        {
          label: "Test",
          value: 2
        }
      ]}
      infoTimeFormat="%Y"
      infoWidth={120}
      markerRadius={2}
      markerStyle={{ fill: "black" }}
    />;
  }

  render() {
    let opts = this.props.options;
    let chartRows = [];
    // initial processing of time series, maybe handle
    // SUM vs. individual graphs here?
    let reqIdx = 0;
    let legend = [];
    let legendLabels = new Set();
    let legendStyle = [];
    let timeRange = TimeRange.lastDay();
    let minValue = Number.MAX_VALUE;
    let maxValue = 0;
    let width = 450;
    let height = 250;
    // reduce legend selectors
    // {key, {label, [time series?]}}
    switch (this.props.size) {
      case "large":
        width = 800;
        height = 500;
        break;
    }
    opts.forEach(rowOpts => {
      if (
        this.state.data[reqIdx] != undefined &&
        this.state.data[reqIdx].points.length
      ) {
        // we have data, let's render
        let timeSeries = new TimeSeries(this.state.data[reqIdx]);
        let columnNames = this.state.data[reqIdx].columns.slice(1);
        for (let i = 0; i < columnNames.length; i++) {
          let columnName = columnNames[i];
          let labelName = "";
          // TODO - this isn't done well
          if (rowOpts.type == "link") {
            labelName = rowOpts.keys[i];
          } else if (rowOpts.type == "node") {
            labelName = this.shortenName(rowOpts.nodes[i].name);
          } else {
            labelName = columnName;
          }
          if (!legendLabels.has(columnName)) {
            if (this.state.tracker) {
              const index = timeSeries.bisect(this.state.tracker);
              const trackerEvent = timeSeries.at(index);
              legend.push({
                key: columnName,
                label: labelName,
                value: this.formatSpeed(trackerEvent.get(columnName))
              });
            } else {
              legend.push({
                key: columnName,
                label: labelName
              });
            }
            legendLabels.add(columnName);
          }
          legendStyle.push({
            key: columnName,
            color: this.nextColor(i),
            width: 2
          });
        }
        let minValue = Number.MAX_VALUE;
        let maxValue = Number.MIN_VALUE;
        columnNames.forEach(name => {
          maxValue = Math.max(maxValue, timeSeries.max(name));
          minValue = Math.min(minValue, timeSeries.min(name));
        });
        // update time range
        timeRange = timeSeries.range();
        // reset min value if no topology
        if (minValue == Number.MAX_VALUE) {
          minValue = 0;
        }
        // just use min as 0 for now
        if (minValue > 0) {
          minValue = 0;
        }
        let labelName = "";
        switch (rowOpts.type) {
          case "node":
            labelName = rowOpts.key;
            break;
          case "link":
            labelName =
              this.shortenName(rowOpts.a_node.name) +
              " / " +
              this.shortenName(rowOpts.z_node.name);
            break;
        }
        chartRows.push(
          <ChartRow height={200} key={"cr" + name}>
            <YAxis
              id="a1"
              label={labelName}
              width="70"
              min={minValue}
              max={maxValue}
              type="linear"
            />
            <Charts>
              <LineChart
                axis="a1"
                series={timeSeries}
                key={"lc" + name}
                columns={columnNames}
                style={styler(legendStyle)}
                interpolation="curveLinear"
                highlight={this.state.highlight}
                onHighlightChange={highlight => this.setState({ highlight })}
                selection={this.state.selection}
                onSelectionChange={selection => this.setState({ selection })}
              />
            </Charts>
          </ChartRow>
        );
      }
      reqIdx++;
    });
    // show indicator if graph is loading, failed, etc
    if (!this.props.options.length || !chartRows.length) {
      // display a loading indicator when data has yet to arrive
      //    // show indicator if graph is loading, failed, etc
      let indicatorImg = "/static/images/loading-graphs.gif";
      switch (this.state.indicator) {
        case "NO_DATA":
          indicatorImg = "/static/images/empty-trash.gif";
          break;
        case "FAILED":
          indicatorImg = "/static/images/cancel-file.png";
          break;
        case "LOAD":
          indicatorImg = "/static/images/loading-graphs.gif";
          break;
        default:
          if (!chartRows.length) {
            indicatorImg = "/static/images/empty-trash.gif";
          }
      }
      return (
        <div className="loading-indicator">
          <img src={indicatorImg} />
        </div>
      );
    }
    const f = format("$,.2f");
    const df = timeFormat("%b %d %Y %X");
    const timeStyle = {
      fontSize: "1.2rem",
      color: "#999",
      height: "30px"
    };
    // we only have key data, skip showing a title for now
    //    <div style={{ fontSize: "16px", marginLeft: "20px" }}>{title}</div>
    //let title = '-';
    return (
      <div width="700" style={{ borderBottom: "2px solid #ddd" }}>
        <div className="col-md-6" style={timeStyle}>
          {this.state.tracker ? `${df(this.state.tracker)}` : "-"}
        </div>
        <div id="legend" width="700" style={{ clear: "both", height: "40px" }}>
          <Legend
            type="line"
            align="left"
            type="dot"
            style={styler(legendStyle)}
            onSelectionChange={selection => this.setState({ selection })}
            selection={this.state.selection}
            onHighlightChange={highlight => this.setState({ highlight })}
            highlight={this.state.highlight}
            categories={legend}
          />
        </div>
        <div id="chart">
          <ChartContainer
            timeRange={timeRange}
            trackerPosition={this.state.tracker}
            onTrackerChanged={this.handleTrackerChanged.bind(this)}
            onBackgroundClick={() => this.setState({ selection: null })}
            enablePanZoom={true}
            onTimeRangeChanged={this.handleTimeRangeChange.bind(this)}
            minDuration={1000 * 60 * 60 * 5} /* 5 min */
            width={width}
          >
            {chartRows}
          </ChartContainer>
        </div>
      </div>
    );
  }
}

ReactMultiGraph.propTypes = {
  size: React.PropTypes.string.isRequired,
  options: React.PropTypes.array.isRequired
};
