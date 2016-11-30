import d3 from 'd3';
import React from 'react';
import MG from 'metrics-graphics';
import jquery from 'jquery';
import { Dispatcher } from 'flux';

export default class MetricGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {data: ''};
    this._mounted = false;
  }

  getContainerId() {
    return window.btoa(this.props.node + this.props.metric + this.props.title)
      .replace('==', '');
  }

  componentDidMount() {
    this._mounted = true;
    this.refreshData();
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentDidUpdate() {
    this.drawGraph();
  }

  drawGraph() {
    let data = this.state.data;
    // correct time format to PST
    let keyNames = [];
    for (let i = 0; i < data.length; i++) {
      if (!data[i].length) {
        continue;
      }
      // drop the first and last data point from being graphed, since it
      // won't represent the sum for a whole window
      data[i].splice(0, 1);
      data[i].splice(data[i].length - 1, 1);
      switch (this.props.metric) {
        case 'bandwidth':
          switch (data[i][0].name) {
            case 'terra0.tx_bytes':
              keyNames.push('TX Bytes');
              break;
            case 'terra0.rx_bytes':
              keyNames.push('RX Bytes');
              break;
          }
          break;
      }
      for (let j = 0; j < data[i].length; j++) {
        data[i][j].time = new Date(data[i][j].time);
      }
    }
    if (!keyNames.length) {
      // no data
      return;
    }
    // small
    let width = 250;
    let height = 200;
    switch (this.props.size) {
      case 'large':
        width = 400;
        height = 300;
        break;
    }
    MG.data_graphic({
        title: this.props.title,
        data: data,
        width: width,
        height: height,
        right: 80,
        target: '#' + this.getContainerId(),
        legend: keyNames,
        x_accessor: 'time',
        y_accessor: 'value'
    });
  }

  refreshData() {
    let metricNames = '';
    switch (this.props.metric) {
      case 'bandwidth':
        metricNames = 'terra0.tx_bytes,terra0.rx_bytes';
        break;
      default:
        console.error('Unknown metric type: ' + this.props.metric);
    }
    // prop type = {single, aggregate}
    let viewUrl = '';
    switch (this.props.view) {
      case 'single':
        viewUrl = '/influx/';
        break;
      case 'aggregate':
        viewUrl = '/influx_agg/';
        break;
    }
    var dataFetch = new Request(viewUrl + this.props.node + '/' + metricNames);
    fetch(dataFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          if (this._mounted) {
            this.setState({
              data: json
            });
          }
        }.bind(this));
      }
    }.bind(this));
    setTimeout(this.refreshData.bind(this), 5000);
  }

  render() {
    return (
      <div className="mg-container" id={this.getContainerId()}></div>
    );
  }
}

MetricGraph.propTypes = {
  node: React.PropTypes.string.isRequired,
  metric: React.PropTypes.string.isRequired,
  title: React.PropTypes.string.isRequired,
  size: React.PropTypes.string.isRequired,
  view: React.PropTypes.string.isRequired,
};
