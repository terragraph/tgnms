import React from "react";
import equals from "equals";
import Dygraph from "dygraphs";

export default class ReactDyGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      data: null,
      indicator: "IDLE",
      dataCounter: 0
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

  shouldComponentUpdate(nextProps, nextState) {
    //check props
    let changed =
      this.props.options.length != nextProps.options.length &&
      nextProps.options.length;
    if (!changed) {
      for (let i = 0; i < this.props.options.length; i++) {
        let curOpts = this.props.options[i];
        let nextOpts = nextProps.options[i];
        if (!equals(curOpts, nextOpts)) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      this.cancelAsyncRequests();
      this.setState({
        data: null,
        indicator: "LOAD"
      });
      this.timer = setInterval(this.refreshData.bind(this), 30000);
      this.refreshData();
    }

    //check state
    if (
      (this.state.data == null && nextState.data != null) ||
      (this.state.data != null && nextState.data == null) ||
      this.state.dataCounter != nextState.dataCounter
    ) {
      return true;
    }
    return false;
  }

  refreshData() {
    if (!this.props.options.key_ids.length) {
      this.setState({
        data: null,
        indicator: "NO_DATA"
      });
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
          data: null,
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
      let graphData = jsonResp[0];
      var i = 0;
      for (; i < graphData.points.length; i++) {
        graphData.points[i][0] = new Date(graphData.points[i][0]);
      }
      this.setState({
        data: graphData,
        indicator: jsonResp ? "LOADED" : "NO_DATA",
        dataCounter: this.state.dataCounter + 1
      });
    }.bind(this);
    // handle failed requests
    this.chartRequest.onreadystatechange = function(chartEvent) {
      if (this.chartRequest.readyState == 4 && this.chartRequest.status == 0) {
        this.setState({
          data: null,
          indicator: "FAILED"
        });
      }
    }.bind(this);
    try {
      this.chartRequest.open("POST", "/multi_chart/", true);
      this.chartRequest.send(JSON.stringify([this.props.options]));
    } catch (e) {}
  }

  legendFormatter(data) {
    if (data.x == null) {
      // This happens when there's no selection and {legend: 'always'} is set.
      return (
        "<br>" +
        data.series
          .map(function(series) {
            return series.labelHTML;
          })
          .join("<br>")
      );
    }
    var html = "";
    data.series.forEach(function(series) {
      if (!series.isVisible) return;
      var labeledData = series.labelHTML + ": " + series.yHTML;
      if (series.isHighlighted) {
        html += data.xHTML + " " + "<b>" + labeledData + "</b>";
      }
    });
    return html;
  }

  render() {
    let gRef = "graph";
    let lRef = "legend";

    if (this.state.data) {
      let graphData = this.state.data;
      this._dygraphs = new Dygraph(
        this.refs[this.props.divkey],
        graphData.points,
        {
          labels: graphData.columns,
          title: this.props.title,
          stackedGraph: false,
          highlightCircleSize: 2,
          strokeWidth: 1,
          strokeBorderWidth: 1,
          connectSeparatedPoints: true,
          highlightSeriesOpts: {
            strokeWidth: 3,
            strokeBorderWidth: 1,
            highlightCircleSize: 5
          },
          labelsDiv: this.refs[this.props.divkey + "_ledend"],
          legendFormatter: this.legendFormatter
        }
      );
    } else {
      let myRef = this.refs[this.props.divkey];
      if (myRef) {
        myRef.innerHTML = "";
      }
    }

    return (
      <div>
        <div ref={this.props.divkey + "_ledend"} />
        <div
          ref={this.props.divkey}
          id={gRef}
          style={{
            position: "absolute",
            left: "0px",
            right: "10px",
            top: "20px",
            bottom: "10px"
          }}
        />
      </div>
    );
  }
}

ReactDyGraph.propTypes = {
  divkey: React.PropTypes.string.isRequired,
  title: React.PropTypes.string.isRequired,
  options: React.PropTypes.array.isRequired
};
