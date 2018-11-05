/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  Actions,
  STATS_DS_INTERVAL_SEC,
  STATS_GRAPH_AGG_OPTS,
  STATS_MAX_DPS,
  STATS_MAX_RESULTS,
  STATS_TIME_PICKER_OPTS,
} from './constants/NetworkConstants.js';
import AsyncSelect from 'react-select/lib/Async';
import axios from 'axios';
import Dispatcher from './NetworkDispatcher.js';
import FormControl from '@material-ui/core/FormControl';
import {
  GraphAggregation,
  RestrictorType,
} from '../thrift/gen-nodejs/Stats_types';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import {LinkType} from '../thrift/gen-nodejs/Topology_types';
import MaterialSelect from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import PlotlyGraph from './PlotlyGraph.js';
import React from 'react';
import Select from 'react-select';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    flexGrow: 1,
    height: 250,
    padding: 10,
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120,
  },
});

class NetworkStats extends React.Component {
  state = {
    // data source interval
    dsIntervalSec: 30,
    // graph aggregation type
    graphAggType: GraphAggregation.TOP_AVG,
    // type-ahead for key names selected
    keysSelected: [],
    // type-ahead for selected links
    linksSelected: [],
    // max data points
    maxDataPoints: 100,
    // max results to return per graph
    maxResults: 5,
    // simple minutes ago, won't have to adjust the start/end time displayed
    minAgo: 60,
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // register to receive topology updates
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_SELECTED:
        // clear the selected links, but leave the key names
        this.setState({linksSelected: []});
        break;
    }
  }

  formatKeyOptions(keyOptions, selectedOptions) {
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
          value: labelName,
        });
      });
    }
    return {options: retKeys};
  }

  render() {
    // list all links to filter key name results on type-ahead
    const linkOptions = this.props.networkConfig.topology.links
      .filter(link => link.link_type === LinkType.WIRELESS)
      .map(link => ({
        value: link.name,
      }));
    // create a graph for each key name
    const multiGraphs = this.state.keysSelected.map((graphKey, pos) => {
      const graphOpts = {
        aggregation: this.state.graphAggType,
        keyNames: [graphKey.value],
        outputFormat: 1 /* POINTS */,
        maxResults: this.state.maxResults,
        maxDataPoints: this.state
          .maxDataPoints /* restrict individual points to 100 */,
        dsIntervalSec: this.state.dsIntervalSec,
        topologyName: this.props.networkConfig.topology.name,
      };
      if (this.state.linksSelected.length) {
        graphOpts.restrictors = [
          {
            restrictorType: RestrictorType.LINK,
            values: this.state.linksSelected.map(link => link.value),
          },
        ];
      }
      graphOpts.minAgo = this.state.minAgo;
      pos++;
      return (
        <PlotlyGraph
          key={'graph-' + pos}
          containerId="statsBoxDiv"
          title={graphKey.value}
          options={graphOpts}
        />
      );
    });
    const {classes, theme} = this.props;
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
        <Typography variant="subheading">Key Names</Typography>
        <AsyncSelect
          // prevent caching results since we use 'filter by links' for
          // additional filtering
          cache={false}
          labelKey="value"
          loadOptions={(searchTerm, cb) => {
            const taRequest = {
              searchTerm,
              topologyName: this.props.networkConfig.topology.name,
            };
            if (this.state.linksSelected.length) {
              taRequest.restrictors = [
                {
                  restrictorType: RestrictorType.LINK,
                  values: this.state.linksSelected.map(link => link.value),
                },
              ];
            }
            // request type-ahead metrics for searchTerm, excluding
            // already selected entries
            axios.post('/metrics/stats_ta', taRequest).then(response => {
              cb(
                null,
                this.formatKeyOptions(
                  response.data,
                  new Set(this.state.keysSelected.map(entry => entry.value)),
                ),
              );
            });
          }}
          multi={true}
          onChange={value => {
            this.setState({keysSelected: value});
          }}
          value={this.state.keysSelected}
        />
        <Typography variant="subheading">Filter By Links</Typography>
        <Select
          classes={classes}
          styles={selectStyles}
          options={linkOptions}
          labelKey="value"
          multi={true}
          onChange={value => {
            this.setState({linksSelected: value});
          }}
          value={this.state.linksSelected}
        />
        {inputOpts.map(opts => (
          <FormControl className={classes.formControl} key={opts[2]}>
            <InputLabel htmlFor={'input-' + opts.value}>{opts[0]}</InputLabel>
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
        <div id="statsBoxDiv">{multiGraphs}</div>
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(NetworkStats);
