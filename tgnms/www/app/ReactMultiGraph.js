/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {timeFormat} from 'd3-time-format';
import equals from 'equals';
import {EventMarker} from 'leaflet';
import {TimeSeries, TimeRange} from 'pondjs';
import PropTypes from 'prop-types';
import {
  Charts,
  ChartContainer,
  ChartRow,
  Legend,
  LineChart,
  YAxis,
  styler,
} from 'react-timeseries-charts';
import React from 'react';

export default class ReactMultiGraph extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      data: {},
      indicator: 'IDLE',
      tracker: null,
    };
    this.chartRequest = undefined;
  }

  componentDidMount() {
    this.refreshData();
    // schedule fixed interval refresh
    this.timer = setInterval(this.refreshData.bind(this), 30000);
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
    // if (bps > 1000000) {
    //   return Math.round(bps / 1000000) + ' mbps';
    // }
    // if (bps > 1000) {
    //   return Math.round(bps / 1000) + ' kbps';
    // }
    // return bps + ' bps';
  }

  componentDidUpdate(prevProps, prevState) {
    // compare list of nodes and key names only for each list item
    // the 'status' item for each node has a timestamp, so this gets changed
    // each iteration
    let changed = false;
    const curOpts = this.props.options;
    const oldOpts = prevProps.options;
    if (!equals(curOpts, oldOpts)) {
      changed = true;
    }
    if (changed) {
      this.cancelAsyncRequests();
      this.setState({
        data: {},
        indicator: 'LOAD',
      });
      this.timer = setInterval(this.refreshData.bind(this), 10000);
      this.refreshData();
    }
  }

  nextColor(index) {
    const colors = [
      '#e41a1c',
      '#377eb8',
      '#4daf4a',
      '#984ea3',
      '#ff7f00',
      '#ffff33',
      '#a65628',
      '#f781bf',
    ];
    return colors.length > index ? colors[index] : '#000000';
  }

  handleTrackerChanged(tracker) {
    // need to find the series first
    this.setState({tracker});
  }

  handleTimeRangeChange(timerange) {
    this.setState({timerange});
  }

  refreshData() {
    this.chartRequest = new XMLHttpRequest();
    this.chartRequest.onload = function() {
      if (!this.chartRequest) {
        return;
      }
      // TODO - handle http status codes
      if (!this.chartRequest.responseText.length) {
        // no data to display, should show a different indicator
        this.setState({
          data: {},
          indicator: 'NO_DATA',
        });
        return;
      }
      let jsonResp = '';
      try {
        const respTxt = this.chartRequest.responseText;
        jsonResp = JSON.parse(respTxt);
      } catch (e) {
        console.log('Unable to parse json', e, this.chartRequest.responseText);
      }
      this.setState({
        data: jsonResp,
        indicator: jsonResp ? 'LOADED' : 'NO_DATA',
      });
    }.bind(this);
    // handle failed requests
    this.chartRequest.onreadystatechange = function(chartEvent) {
      if (this.chartRequest.readyState == 4 && this.chartRequest.status == 0) {
        this.setState({
          data: {},
          indicator: 'FAILED',
        });
      }
    }.bind(this);
    try {
      this.chartRequest.open('POST', '/metrics/multi_chart/', true);
      this.chartRequest.setRequestHeader('Content-Type', 'application/json');
      this.chartRequest.send(JSON.stringify(this.props.options));
    } catch (e) {}
  }

  shortenName(name) {
    // shorten name for tg lab nodes
    return name.replace('.tg.a404-if', '');
  }

  renderMarker() {
    if (!this.state.tracker) {
      return <g />;
    }
    return (
      <EventMarker
        type="flag"
        axis="axis"
        event={this.state.tracker}
        column=""
        info={[
          {
            label: 'Test',
            value: 2,
          },
        ]}
        infoTimeFormat="%Y"
        infoWidth={120}
        markerRadius={2}
        markerStyle={{fill: 'black'}}
      />
    );
  }

  render() {
    const chartRows = [];
    // initial processing of time series, maybe handle
    // SUM vs. individual graphs here?
    const legend = [];
    const legendLabels = new Set();
    const legendStyle = [];
    let timeRange = TimeRange.lastDay();
    let width = 450;
    // reduce legend selectors
    // {key, {label, [time series?]}}
    switch (this.props.size) {
      case 'large':
        width = 800;
        break;
    }
    if (
      this.state.data != undefined &&
      this.state.data.hasOwnProperty('points') &&
      this.state.data.points.length &&
      this.state.data.hasOwnProperty('columns') &&
      this.state.data.columns.length
    ) {
      // we have data, let's render
      const timeSeries = new TimeSeries(this.state.data);
      const columnNames = this.state.data.columns.slice(1);
      for (let i = 0; i < columnNames.length; i++) {
        const columnName = columnNames[i];
        const labelName = columnName;
        if (!legendLabels.has(columnName)) {
          if (this.state.tracker) {
            const index = timeSeries.bisect(this.state.tracker);
            const trackerEvent = timeSeries.at(index);
            legend.push({
              key: columnName,
              label: labelName,
              value: this.formatSpeed(trackerEvent.get(columnName)),
            });
          } else {
            legend.push({
              key: columnName,
              label: labelName,
            });
          }
          legendLabels.add(columnName);
        }
        legendStyle.push({
          color: this.nextColor(i),
          key: columnName,
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
      // just use min as 0 for now
      if (minValue > 0) {
        minValue = 0;
      }
      chartRows.push(
        <ChartRow height={200} key={'cr' + name}>
          <YAxis
            id="a1"
            label={name}
            width="70"
            min={minValue}
            max={maxValue}
            type="linear"
          />
          <Charts>
            <LineChart
              axis="a1"
              series={timeSeries}
              key={'lc' + name}
              columns={columnNames}
              style={styler(legendStyle)}
              interpolation="curveLinear"
              highlight={this.state.highlight}
              onHighlightChange={highlight => this.setState({highlight})}
              selection={this.state.selection}
              onSelectionChange={selection => this.setState({selection})}
            />
          </Charts>
        </ChartRow>,
      );
    }
    // show indicator if graph is loading, failed, etc
    if (!chartRows.length) {
      // display a loading indicator when data has yet to arrive
      //    // show indicator if graph is loading, failed, etc
      let indicatorImg = '/static/images/loading-graphs.gif';
      switch (this.state.indicator) {
        case 'NO_DATA':
          indicatorImg = '/static/images/empty-trash.gif';
          break;
        case 'FAILED':
          indicatorImg = '/static/images/cancel-file.png';
          break;
        case 'LOAD':
          indicatorImg = '/static/images/loading-graphs.gif';
          break;
        default:
          if (!chartRows.length) {
            indicatorImg = '/static/images/empty-trash.gif';
          }
      }
      return (
        <div className="loading-indicator">
          <img src={indicatorImg} />
        </div>
      );
    }
    const df = timeFormat('%b %d %Y %X');
    const timeStyle = {
      color: '#999',
      fontSize: '1.2rem',
      height: '30px',
    };
    return (
      <div width="700" style={{borderBottom: '2px solid #ddd'}}>
        <div className="col-md-6" style={timeStyle}>
          {this.state.tracker ? `${df(this.state.tracker)}` : '-'}
        </div>
        <div id="legend" width="700" style={{clear: 'both', height: '40px'}}>
          <Legend
            align="left"
            type="dot"
            style={styler(legendStyle)}
            onSelectionChange={selection => this.setState({selection})}
            selection={this.state.selection}
            onHighlightChange={highlight => this.setState({highlight})}
            highlight={this.state.highlight}
            categories={legend}
          />
        </div>
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
            {chartRows}
          </ChartContainer>
        </div>
      </div>
    );
  }
}

ReactMultiGraph.propTypes = {
  options: PropTypes.object.isRequired,
  size: PropTypes.string.isRequired,
};
