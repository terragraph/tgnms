/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MaterialReactSelect from '../../components/common/MaterialReactSelect';
import MaterialSelect from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import PlotlyGraph from './PlotlyGraph.js';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import axios from 'axios';
import moment from 'moment';
import {
  GRAPH_LINE_NAME_MAX_LENGTH,
  STATS_DS_INTERVAL_SEC,
  STATS_GRAPH_AGG_OPTS,
  STATS_MAX_DPS,
  STATS_MAX_RESULTS,
  STATS_TIME_PICKER_OPTS,
} from '../../constants/StatsConstants.js';
import {
  GraphAggregation,
  RestrictorType,
} from '../../../thrift/gen-nodejs/Stats_types';
import {LinkType} from '../../../thrift/gen-nodejs/Topology_types';
import {STATS_LINK_QUERY_PARAM} from '../../constants/ConfigConstants';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
  },
  content: {
    padding: theme.spacing(2),
  },
  formControl: {
    margin: theme.spacing(),
    minWidth: 120,
  },
});

type Props = {
  classes: Object,
  networkConfig: Object,
};

class NetworkStatsBeringei extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    // TODO - graph options should be saved in their own context
    this.state = {
      // data source interval
      dsIntervalSec: 30,
      // graph aggregation type
      graphAggType: GraphAggregation.TOP_AVG,
      // type-ahead for key names selected
      keysSelected: [],
      // type-ahead for selected links
      linksSelected: this.getLinkFromQueryString(),
      // max data points
      maxDataPoints: 100,
      // max results to return per graph
      maxResults: 5,
      // simple minutes ago, won't have to adjust the start/end time displayed
      minAgo: 60,
    };
  }

  getLinkFromQueryString() {
    const values = new URL(window.location).searchParams;
    const linkName = values.get(STATS_LINK_QUERY_PARAM);
    if (linkName) {
      return [
        {
          label: linkName,
        },
      ];
    }
    return [];
  }

  formatKeyOptions(searchTerm, keyOptions, selectedOptions) {
    const retKeys = [];
    if (typeof keyOptions === 'object') {
      // aggregate data for this key
      keyOptions.forEach(keyList => {
        const labelName = keyList[0].shortName.length
          ? keyList[0].shortName
          : keyList[0].keyName;
        // skip if already selected
        if (selectedOptions.has(labelName)) {
          return;
        }
        retKeys.push({
          label: labelName,
        });
      });
    }
    // Sort retKeys to show better results on top
    retKeys.sort(
      (a, b) =>
        Math.abs(searchTerm.length - a.label.length) -
        Math.abs(searchTerm.length - b.label.length),
    );
    return retKeys;
  }

  fetchKeyTypeaheadOptions = (searchTerm, cb) => {
    const {networkConfig} = this.props;

    const taRequest = {
      searchTerm: searchTerm ? searchTerm : '',
      topologyName: networkConfig.topology.name,
    };
    if (this.state.linksSelected.length) {
      taRequest.restrictors = [
        {
          restrictorType: RestrictorType.LINK,
          values: this.state.linksSelected.map(link => link.label),
        },
      ];
    }
    // request type-ahead metrics for searchTerm, excluding
    // already selected entries
    axios.post('/metrics/stats_ta', taRequest).then(response => {
      cb(
        this.formatKeyOptions(
          searchTerm,
          response.data,
          new Set(this.state.keysSelected.map(entry => entry.label)),
        ),
      );
    });
  };

  plotlyDataFormatter(oldGraphData, graphData) {
    if (graphData && graphData.points && graphData.points[0]) {
      let traces = [];
      // If there is already plotly data (lines are already on the graph),
      // then refresh the trace's x and y data, otherwise make new traces
      if (oldGraphData && oldGraphData.length !== 0) {
        traces = oldGraphData.map(trace => ({
          ...trace,
          x: [],
          y: [],
        }));
      } else {
        // Create the correct number of trace (line) objects
        for (let i = 0; i < graphData.points[0].length - 1; i++) {
          traces.push({
            mode: 'line',
            name: graphData.columns[i + 1].substr(
              0,
              GRAPH_LINE_NAME_MAX_LENGTH,
            ),
            type: 'scatter',
            x: [], // Will contain the timestamp
            y: [], // Will contain the data
          });
        }
      }

      // Populate the x and y data for each of the traces from the points
      graphData.points.forEach(point => {
        point[0] = new Date(point[0]);
        for (let i = 1; i < point.length; i++) {
          const trace = traces[i - 1];
          trace.x.push(point[0]); // Push the timestamp contained at point[0]
          trace.y.push(point[i]); // Push the data
        }
      });
      return traces;
    }
  }

  renderGraphs() {
    // create a graph for each key name
    const {networkConfig} = this.props;
    const endTs = moment().unix();
    const startTs = moment()
      .subtract(this.state.minAgo, 'minutes')
      .unix();
    return this.state.keysSelected.map((graphKey, pos) => {
      const graphOpts = {
        aggregation: this.state.graphAggType,
        keyNames: [graphKey.label],
        outputFormat: 1 /* POINTS */,
        maxResults: this.state.maxResults,
        maxDataPoints: this.state
          .maxDataPoints /* restrict individual points to 100 */,
        dsIntervalSec: this.state.dsIntervalSec,
        topologyName: networkConfig.topology.name,
        minAgo: this.state.minAgo,
      };
      if (this.state.linksSelected.length) {
        graphOpts.restrictors = [
          {
            restrictorType: RestrictorType.LINK,
            values: this.state.linksSelected.map(link => link.label),
          },
        ];
      }
      return (
        <PlotlyGraph
          key={'graph-' + pos}
          containerId="statsBoxDiv"
          endTsMs={endTs * 1000}
          startTsMs={startTs * 1000}
          title={graphKey.label}
          queryUrl={'/metrics/multi_chart'}
          options={graphOpts}
          dataFormatter={this.plotlyDataFormatter}
        />
      );
    });
  }

  render() {
    const {classes, theme, networkConfig} = this.props;

    // list all links to filter key name results on type-ahead
    const linkOptions = networkConfig.topology.links
      .filter(link => link.link_type === LinkType.WIRELESS)
      .map(link => ({
        label: link.name,
      }));
    const selectStyles = {
      input: base => ({
        ...base,
        color: theme.palette.text.primary,
        '& input': {
          font: 'inherit',
        },
      }),
    };
    const inputOpts = [
      ['Time Window', STATS_TIME_PICKER_OPTS, 'minAgo'],
      ['Graph Aggregation', STATS_GRAPH_AGG_OPTS, 'graphAggType'],
      ['Max Data Points', STATS_MAX_DPS, 'maxDataPoints'],
      ['DS Interval', STATS_DS_INTERVAL_SEC, 'dsIntervalSec'],
      ['Max Results', STATS_MAX_RESULTS, 'maxResults'],
    ];

    return (
      <div className={classes.root}>
        <div className={classes.content}>
          <Typography variant="subtitle1">Key Names</Typography>
          <MaterialReactSelect
            async={true}
            // prevent caching results since we use 'filter by links' for
            // additional filtering
            cacheOptions={false}
            defaultOptions
            getOptionValue={option => option.label}
            loadOptions={this.fetchKeyTypeaheadOptions}
            isMulti
            onChange={value => {
              this.setState({keysSelected: value});
            }}
            value={this.state.keysSelected}
          />
          <Typography variant="subtitle1">Filter By Links</Typography>
          <MaterialReactSelect
            styles={selectStyles}
            options={linkOptions}
            isMulti
            getOptionValue={option => option.label}
            onChange={value => {
              this.setState({
                linksSelected: value,
              });
            }}
            value={this.state.linksSelected}
          />
          {inputOpts.map(opts => (
            <FormControl className={classes.formControl} key={opts[2]}>
              <InputLabel htmlFor={'input-' + opts.label}>{opts[0]}</InputLabel>
              <MaterialSelect
                value={this.state[opts[2]]}
                onChange={evt =>
                  this.setState({
                    [opts[2]]: evt.target.value,
                  })
                }
                input={<Input name={opts.value} id={'input-' + opts.value} />}>
                {opts[1].map(opts => (
                  <MenuItem key={opts.value} value={opts.value}>
                    {opts.label}
                  </MenuItem>
                ))}
              </MaterialSelect>
            </FormControl>
          ))}
          <div id="statsBoxDiv">{this.renderGraphs()}</div>
        </div>
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(
  withRouter(NetworkStatsBeringei),
);
