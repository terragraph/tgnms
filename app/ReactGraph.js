import React from 'react';
import { Dispatcher } from 'flux';
import { Charts, ChartContainer, ChartRow, YAxis, AreaChart, LineChart,
         Legend, styler } from "react-timeseries-charts";
import { Index, TimeSeries, TimeRange } from "pondjs";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
 
export default class ReactGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      data: '',
      tracker: null,
    };
  }

  componentWillMount() {
    this.refreshData();
  }

  componentWillUnmount() {
    clearTimeout(this.lastTimer);
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

  shouldComponentUpdate(nextProps, nextState) {
    // re-render if props change
    if (this.props.metric !== nextProps.metric ||
        this.props.node !== nextProps.node ||
        this.props.size !== nextProps.size ||
        this.props.title !== nextProps.title) {
      // something changed in the props, force a data fetch
      this.refreshData();
    }
    return true;
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
    // prop type = {single, aggregate}
    var dataFetch = new Request("/chart/" + this.props.metric + "/" +
                                this.props.node);
    fetch(dataFetch).then(response => {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            data: json
          });
          // force update without checking for prop changes
          // TODO - figure out a way to cancel the in-flight request when
          // we're unmounted
          this.forceUpdate();
        }.bind(this));
      } else {
        console.error("Error fetching: HTTP ", response.status);
      }
    });
    this.lastTimer = setTimeout(this.refreshData.bind(this), 15000);
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
    let legendNames = this.props.names;
    switch (this.props.metric) {
      case 'traffic_sum':
        legendNames = ['TX Bytes', 'RX Bytes'];
        break;
    }

    if (this.state.data &&
        this.state.data.points &&
        this.state.data.points.length > 1) {
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
    }
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
  node: React.PropTypes.string.isRequired,
  names: React.PropTypes.array.isRequired,
  // bandwidth, nodes_reporting, ...
  metric: React.PropTypes.string.isRequired,
  title: React.PropTypes.string.isRequired,
  label: React.PropTypes.string.isRequired,
  // small, large
  size: React.PropTypes.string.isRequired,
};
