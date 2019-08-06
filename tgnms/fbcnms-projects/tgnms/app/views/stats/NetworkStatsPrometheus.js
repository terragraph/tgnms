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
  STATS_TIME_PICKER_OPTS,
} from '../../constants/StatsConstants.js';
import {createQuery} from '../../apiutils/PrometheusAPIUtil';
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

class NetworkStatsPrometheus extends React.Component<Props, State> {
  // TODO - graph options should be saved in their own context
  state = {
    // data source interval
    dsIntervalSec: 30,
    // type-ahead for key names selected
    keysSelected: [],
    // simple minutes ago, won't have to adjust the start/end time displayed
    minAgo: 60,
  };

  constructor(props) {
    super(props);
  }

  formatKeyOptions(searchTerm, keyOptions, selectedOptions) {
    const retKeys = [];
    if (typeof keyOptions === 'object') {
      // aggregate data for this key
      keyOptions.forEach(metricMetadata => {
        const labelName = metricMetadata.name;
        // skip if already selected
        if (selectedOptions.has(labelName)) {
          return;
        }
        retKeys.push({
          label: labelName,
          value: labelName,
        });
      });
    }
    if (retKeys.length === 0 && searchTerm.length > 0) {
      retKeys.push({label: `Use '${searchTerm}'`, value: searchTerm});
    }
    return retKeys;
  }

  fetchKeyTypeaheadOptions = (searchTerm, cb) => {
    // request type-ahead metrics for searchTerm, excluding
    // already selected entries
    const taUrl =
      '/metrics/' + (searchTerm.length > 0 ? `search/${searchTerm}` : 'list');
    axios.get(taUrl).then(response => {
      cb(
        this.formatKeyOptions(
          searchTerm,
          response.data,
          new Set(this.state.keysSelected.map(entry => entry.value)),
        ),
      );
    });
  };

  plotlyDataFormatter(oldGraphData, graphData) {
    if (
      graphData &&
      graphData.data &&
      graphData.data.result &&
      graphData.data.result.length
    ) {
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
        graphData.data.result.forEach(data => {
          const labelName = `${data.metric.linkName} (${
            data.metric.linkDirection
          })`;
          traces.push({
            mode: 'line',
            type: 'scatter',
            name: labelName.substr(0, GRAPH_LINE_NAME_MAX_LENGTH),
            x: [],
            y: [],
          });
        });
      }
      graphData.data.result.forEach((data, i) => {
        data.values.forEach(valueArr => {
          traces[i].x.push(new Date(valueArr[0] * 1000));
          traces[i].y.push(valueArr[1]);
        });
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
        query: createQuery(graphKey.value, {
          topologyName: networkConfig.topology.name,
          intervalSec: this.state.dsIntervalSec,
        }),
        value: this.state.minAgo,
        units: 'minutes',
        step: this.state.dsIntervalSec,
      };

      return (
        <PlotlyGraph
          key={'graph-' + pos}
          containerId="statsBoxDiv"
          endTsMs={endTs * 1000}
          startTsMs={startTs * 1000}
          title={graphKey.value}
          queryUrl={'/metrics/query/raw/since'}
          options={graphOpts}
          dataFormatter={this.plotlyDataFormatter}
        />
      );
    });
  }

  render() {
    const {classes} = this.props;
    const inputOpts = [['Time Window', STATS_TIME_PICKER_OPTS, 'minAgo']];

    return (
      <div className={classes.root}>
        <div className={classes.content}>
          <Typography variant="subtitle1">Prometheus Query</Typography>
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
          {inputOpts.map(([inputLabel, menuItems, key]) => (
            <FormControl className={classes.formControl} key={key}>
              <InputLabel htmlFor={'input-' + inputLabel}>
                {inputLabel}
              </InputLabel>
              <MaterialSelect
                value={this.state[key]}
                onChange={evt =>
                  this.setState({
                    [key]: evt.target.value,
                  })
                }
                input={<Input name={inputLabel} id={'input-' + inputLabel} />}>
                {menuItems.map(({label, value}) => (
                  <MenuItem key={value} value={value}>
                    {label}
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
  withRouter(NetworkStatsPrometheus),
);
