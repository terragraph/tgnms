import React from 'react';
import { Dispatcher } from 'flux';
import { Charts, ChartContainer, ChartRow, YAxis, AreaChart, LineChart, Legend, styler }
  from "react-timeseries-charts";
import { Index, TimeSeries, TimeRange } from "pondjs";
 
export default class ReactGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {data: ''};
  }

  componentWillMount() {
    this.refreshData();
  }

  nextColor(index) {
    const colors = ["#A48C53", "#67501B", "#443207", "#67411B",
                    "#0A112E", "#192246", "#3F496F", "#5D6689",
                    "#51747E", "#355B66", "#123640", "#05222A"];
    return colors.length > index ? colors[index] : "#FFFFFF";
  }

  refreshData() {
    // prop type = {single, aggregate}
    var dataFetch = new Request("/influx/" + this.props.metric + "/" + this.props.node);
    fetch(dataFetch).then(response => {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            data: json
          });
        }.bind(this));
      } else {
        console.error("Error fetching: HTTP ", response.status);
      }
    });
    setTimeout(this.refreshData.bind(this), 5000);
  }

  render() {
    let lineCharts = [];
    let legend = [];
    let legendStyle = [];
    let timeRange = TimeRange.lastDay();
    let minValue = Number.MAX_VALUE;
    let maxValue = 0;
    if (this.state.data &&
        this.state.data.points &&
        this.state.data.points.length > 1) {
      let timeSeries = new TimeSeries(this.state.data);
      let columnNames = this.state.data.columns;
      columnNames.splice(0, 1);
      for (let i = 0; i < columnNames.length; i++) {
        let name = columnNames[i];
        legend.push({
          key: name,
          label: name,
        });
        legendStyle.push({
            key: name,
            color: this.nextColor(i),
            width: 2,
        });
      }
      lineCharts.push(
        <LineChart
          axis="a1"
          series={timeSeries}
          columns={columnNames}
          style={styler(legendStyle)}
          key={name} />);
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
    return (
      <div>
        <div id="legend">
          <Legend
            type="line"
            style={styler(legendStyle)}
            categories={legend} />
        </div>
        <div id="chart">
          <ChartContainer timeRange={timeRange} width={400}>
            <ChartRow height="250">
              <YAxis
                id="a1"
                label="BW"
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
  // bandwidth, nodes_reporting, ...
  metric: React.PropTypes.string.isRequired,
  title: React.PropTypes.string.isRequired,
  // small, large
  size: React.PropTypes.string.isRequired,
};
