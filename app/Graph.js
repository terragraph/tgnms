import React from 'react';
import jquery from 'jquery';
import { Index, TimeSeries } from "pondjs";

export default class Graph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {data: ''};
  }

  refreshData() {
    var dataFetch = new Request('/influx/' + this.props.node + '/' + metricNames);
    fetch(dataFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            data: json
          });
        }.bind(this));
      }
    }.bind(this));
  //  setTimeout(this.refreshData.bind(this), 5000);
  }

  render() {
    console.log(this.state.data);
    return (
      null
    );
  }
}
