import React from 'react';
import { Dispatcher } from 'flux';
import { Charts, ChartContainer, ChartRow, YAxis, AreaChart, LineChart,
         Legend, styler } from "react-timeseries-charts";
import { Index, TimeSeries, TimeRange } from "pondjs";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import equals from "equals";
 
export default class ReactGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      data: undefined,
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
    if (this.chartRequest) {
      this.chartRequest.abort();
    }
    clearInterval(this.timer);
  }
  
  formatSpeed(bps) {
    if (bps > 1000000) {
      return Math.round(bps/1000000) + ' mbps'
    }
    if (bps > 1000) {
      return Math.round(bps/1000) + ' kbps';
    }
    return bps + ' bps';
  }

  componentWillReceiveProps(nextProps) {
    if (!equals(this.props.chart_data.nodes, nextProps.chart_data.nodes)) {
      // cancel any pending requests
      if (this.chartRequest) {
        this.chartRequest.abort();
      }
      // reset state
      this.setState({
        data: undefined,
        indicator: 'LOAD_DATA',
      });
    }
  }
  componentDidUpdate(prevProps, prevtate) {
    if (!equals(this.props.chart_data.nodes, prevProps.chart_data.nodes)) {
      // fetch data for the new nodes
      this.refreshData();
    }
  }

  nextColor(index) {
    const colors = ["#A48C53", "#67501B", "#443207", "#67411B",
                    "#0A112E", "#192246", "#3F496F", "#5D6689",
                    "#51747E", "#355B66", "#123640", "#05222A"];
    return colors.length > index ? colors[index] : "#000000";
  }

  handleTrackerChanged(tracker) {
    this.setState({tracker});
  }

  handleTimeRangeChange(timerange) {
    this.setState({timerange});
  }

  refreshData() {
    // chart request
    let request = {
      'chart_data': this.props.chart_data,
      'metric':     this.props.metric,
    };
    // submit request
    this.chartRequest = new XMLHttpRequest();
    this.chartRequest.onload = function() {
      // TODO - handle http status codes
      if (!this.chartRequest.responseText.length) {
        // no data to display, should show a different indicator
        this.setState({
          data: undefined,
          indicator: 'NO_DATA',
        });
        return;
      }
      try {
        let jsonResp = JSON.parse(this.chartRequest.responseText);
        this.setState({
          data: jsonResp,
          indicator: jsonResp.points.length ? 'LOADED' : 'NO_DATA',
        });
      } catch (e) {
        console.log('Unable to parse json', e, this.chartRequest.responseText.length);
      }
    }.bind(this);
    // handle failed requests
    this.chartRequest.onreadystatechange = function(chartEvent) {
      if (this.chartRequest.readyState == 4 &&
          this.chartRequest.status == 0) {
        this.setState({
          data: undefined,
          indicator: 'FAILED',
        });
      }
    }.bind(this);
    try {
      this.chartRequest.open('POST', '/chart/', true);
      this.chartRequest.send(JSON.stringify(request));
    } catch (e) {}
  }

  render() {
    let lineCharts = [];
    let legend = [];
    let legendStyle = [];
    let timeRange = TimeRange.lastDay();
    let minValue = Number.MAX_VALUE;
    let maxValue = 0;
    let width = 450;
    let height = 250;
    switch (this.props.size) {
      case 'large':
        width = 800;
        height = 500;
        break;
    }
    // legend
    let legendNames = Object.keys(this.props.chart_data.nodes);
    switch (this.props.metric) {
      case 'traffic_sum':
        legendNames = ['TX Bytes', 'RX Bytes'];
        break;
    }

    // show indicator if graph is loading, failed, etc
    if (!this.state.data ||
        !this.state.data.points ||
        this.state.data.points.length <= 1) {
      // display a loading indicator when data has yet to arrive
      //    // show indicator if graph is loading, failed, etc
      let indicatorImg = "/static/images/loading-graphs.gif";
      switch (this.state.indicator) {
        case 'NO_DATA':
          indicatorImg = "/static/images/empty-trash.gif";
          break;
        case 'FAILED':
          indicatorImg = "/static/images/cancel-file.png";
          break;
      }
      return (
        <div className="loading-indicator">
          <img src={indicatorImg} />
        </div>
      );
    }
    // we have data to process
    let timeSeries = new TimeSeries(this.state.data);
    let columnNames = this.state.data.columns.slice(1);
    for (let i = 0; i < columnNames.length; i++) {
      let macAddr = columnNames[i];
      let nodeName = legendNames[i];
      if (this.state.tracker) {
        const index = timeSeries.bisect(this.state.tracker);
        const trackerEvent = timeSeries.at(index);
        legend.push({
          key: macAddr,
          label: nodeName,
          value: this.formatSpeed(trackerEvent.get(macAddr)),
        });
      } else {
        legend.push({
          key: macAddr,
          label: nodeName,
        });
      }
      legendStyle.push({
          key: macAddr,
          color: this.nextColor(i),
          width: 2,
      });
    }
    lineCharts.push(
      <LineChart
        axis="a1"
        series={timeSeries}
        key={name}
        columns={columnNames}
        style={styler(legendStyle)}
        highlight={this.state.highlight}
        onHighlightChange={highlight => this.setState({highlight})}
        selection={this.state.selection}
        onSelectionChange={selection => this.setState({selection})}
        interpolation="curveBasis"
      />);
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
    minValue = 0;
    const f = format("$,.2f");
    const df = timeFormat("%b %d %Y %X");
    const timeStyle = {
      fontSize: "1.2rem",
      color: "#999"
    };
    let legendComponent;
    if (legendNames.length <= 5) {
      legendComponent =
        <div id="legend">
          <Legend
            type="line"
            align="right"
            type="dot"
            style={styler(legendStyle)}
            onSelectionChange={selection => this.setState({selection})}
            selection={this.state.selection}
            onHighlightChange={highlight => this.setState({highlight})}
            highlight={this.state.highlight}
            categories={legend}
          />
        </div>;
    }
    return (
      <div>
        <div className="row" style={{height: 28}}>
          <div className="col-md-6" style={timeStyle}>
            {this.state.tracker ? `${df(this.state.tracker)}` : ""}
          </div>
          {legendComponent}
        </div>
        <hr/>
        <div id="chart">
          <ChartContainer
            timeRange={timeRange}
            trackerPosition={this.state.tracker}
            onTrackerChanged={this.handleTrackerChanged.bind(this)}
            onBackgroundClick={() => this.setState({selection: null})}
            enablePanZoom={true}
            onTimeRangeChanged={this.handleTimeRangeChange.bind(this)}
            minDuration={1000 * 60 * 60 * 5} /* 5 min */
            width={width}>
            <ChartRow height={height}>
              <YAxis
                id="a1"
                label={this.props.label}
                width="70"
                min={minValue}
                max={maxValue} />
              <Charts>
                {lineCharts}
              </Charts>
            </ChartRow>
          </ChartContainer>
        </div>
      </div>
    );
  }
}

ReactGraph.propTypes = {
  // comma separated list of node ids
  title: React.PropTypes.string.isRequired,
  // y-axis label
  label: React.PropTypes.string.isRequired,
  // small, large
  size: React.PropTypes.string.isRequired,
  // metric name to display
  metric: React.PropTypes.string.isRequired,
  // chart data
  chart_data: React.PropTypes.object.isRequired,
};
