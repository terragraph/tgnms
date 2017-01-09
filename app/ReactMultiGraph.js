import React from 'react';
import { Dispatcher } from 'flux';
import { Charts, ChartContainer, ChartRow, YAxis, AreaChart, LineChart,
         Legend, styler } from "react-timeseries-charts";
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
/*    if (!equals(this.props.chart_data.nodes, nextProps.chart_data.nodes)) {
      // cancel any pending requests
      if (this.chartRequest) {
        this.chartRequest.abort();
      }
      // reset state
      this.setState({
        data: undefined,
        indicator: 'LOAD_DATA',
      });
    }*/
  }
  componentDidUpdate(prevProps, prevState) {
    console.log('componentDidUpdate', prevProps, this.props);
    this.cancelAsyncRequests();
    this.timer = setInterval(this.refreshData.bind(this), 10000);
    this.refreshData();
//    if (!equals(this.props.options.nodes
/*    if (!equals(this.props.chart_data.nodes, prevProps.chart_data.nodes)) {
      // fetch data for the new nodes
      this.refreshData();
    }*/
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
        console.log('Got new data', jsonResp);
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
      this.chartRequest.open('POST', '/multi_chart/', true);
      this.chartRequest.send(JSON.stringify(this.props.options));
    } catch (e) {}
  }

  render() {
    let opts = this.props.options;
    let chartRows = [];
    // initial processing of time series, maybe handle
    // SUM vs. individual graphs here?
    let reqIdx = 0;
    if (opts.length != this.state.data.length) {
      return (<div>Data unavailable</div>);
    }
    opts.forEach(rowOpts => {
      //let lineCharts = [];
      // add chart rows (node vs link)
      switch (rowOpts.type) {
        case 'node':
          // make list of queries per metric
          // nodes, key
          // make request for nodes, keys, group by standard
          if (this.state.data[reqIdx] != undefined) {
            // we have data, let's render
            console.log('Data to render', rowOpts, this.state.data[reqIdx]);
            let timeSeries = new TimeSeries(this.state.data[reqIdx]);
            let columnNames = this.state.data[reqIdx].columns.slice(1);
            let legend = [];
            let legendStyle = [];
            for (let i = 0; i < columnNames.length; i++) {
              let columnName = columnNames[i];
              let labelName = columnName.replace(":", "");
/*              if (this.state.tracker) {
                const index = timeSeries.bisect(this.state.tracker);
                const trackerEvent = timeSeries.at(index);
                legend.push({
                  key: columnName,
                  label: labelName,
                  value: this.formatSpeed(trackerEvent.get(columnName)),
                });
              } else {*/
                legend.push({
                  key: columnName,
                  label: labelName,
                });
//              }
              legendStyle.push({
                  key: columnName,
                  color: this.nextColor(i),
                  width: 2,
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
            console.log('time', timeRange, minValue, maxValue);
            // just use min as 0 for now
            minValue = 0;
            const f = format("$,.2f");
            const df = timeFormat("%b %d %Y %X");
            const name = rowOpts.key.replace("-", "");
                /*<YAxis
                  id={name}
                  label={name}
                  width={70}
                  min={minValue}
                  max={maxValue} />*/
            chartRows.push(
              <ChartRow height={200} key={"cr" + name}>
                <Charts>
                  <LineChart
                    axis={name}
                    series={timeSeries}
                    key={"lc" + name}
                    columns={["derp"]}
                    style={styler(legendStyle)}
                    interpolation="curveBasis"
                  />);
                </Charts>
              </ChartRow>
            );
            console.log('row name:', name, 'columns:', columnNames);
            console.log('min', minValue, 'max', maxValue);
            console.log('series', timeSeries);
                    /*highlight={this.state.highlight}
                    onHighlightChange={highlight => this.setState({highlight})}
                    selection={this.state.selection}
                    onSelectionChange={selection => this.setState({selection})}*/
          } else {
            console.log('waiting on data for node', rowOpts);
          }
          break;
        case 'link':
          // needs a combo of [(node, key), (node, key), ...]
          console.log('link', rowOpts);
          break;
        default:
          console.error('Unhandled type', opts.type);
      }
      reqIdx++;
    });
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

    const timeStyle = {
      fontSize: "1.2rem",
      color: "#999"
    };
    // show indicator if graph is loading, failed, etc
/*    if (!this.state.data ||
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
    }*/
    console.log('final time range', timeRange, chartRows.length);
/*          <div className="col-md-6" style={timeStyle}>
            {this.state.tracker ? `${df(this.state.tracker)}` : ""}
          </div>
            trackerPosition={this.state.tracker}
            onTrackerChanged={this.handleTrackerChanged.bind(this)}
            onBackgroundClick={() => this.setState({selection: null})}
            enablePanZoom={true}
            onTimeRangeChanged={this.handleTimeRangeChange.bind(this)}*/
    return (
      <div>
        <div className="row" style={{height: 28}}>
        </div>
        <hr/>
        <div id="chart">
          <ChartContainer
              timeRange={timeRange}
              minDuration={1000 * 60 * 60 * 5} /* 5 min */
              width={width}>
            {chartRows}
          </ChartContainer>
        </div>
      </div>
    );
  }
}

ReactMultiGraph.propTypes = {
  size: React.PropTypes.string.isRequired,
  options: React.PropTypes.array.isRequired,
};
