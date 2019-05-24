/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';
import CustomTable from '../../components/common/CustomTable';
import Divider from '@material-ui/core/Divider';
import {
  EventCategoryValueMap,
  EventLevelValueMap,
} from '../../../shared/types/Event';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import InputLabel from '@material-ui/core/InputLabel';
import LoadingBox from '../../components/common/LoadingBox';
import MenuItem from '@material-ui/core/MenuItem';
import ModalEventInfo from './ModalEventInfo';
import moment from 'moment';
import NetworkContext from '../../NetworkContext';
import React from 'react';
import Select from '@material-ui/core/Select';
import {SortDirection} from 'react-virtualized';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

// TODO refactor into component
const styles = theme => ({
  button: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  divider: {
    marginBottom: theme.spacing.unit * 2,
  },
  eventBox: {
    padding: `${theme.spacing.unit}px ${theme.spacing.unit * 2}px`,
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120,
  },
});

type Props = {
  classes: Object,
  context: Object,
};

type State = {
  // TODO
};

class NetworkEventsTable extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      events: [],
      error: '',

      // Events details modal
      isEventModalOpen: false,
      selectedEvent: null,

      // Query options
      afterDate: moment.unix(0),
      maxResults: 100,
      selectedCategory: '',
      selectedLevel: '',

      // Sort options
      sortBy: null,
      sortDirection: SortDirection.ASC,
    };
  }

  componentDidMount() {
    this.getEvents();
  }

  getEvents() {
    const {context} = this.props;
    const {networkConfig} = context;
    const uri = `/metrics/events`;
    const query = {
      topologyName: networkConfig.topology.name,
      maxResults: this.state.maxResults,
      timestamp: parseInt(this.state.afterDate.format('X'), 10),
      category: this.state.selectedCategory.trim(),
      level: this.state.selectedLevel.trim(),
    };
    axios
      .post(uri, query)
      .then(response => {
        const events = response.data;
        this.setState({
          error:
            events.length == 0
              ? 'No events found for topology ' + networkConfig.topology.name
              : '',
          events,
        });
      })
      .catch(error => {
        this.setState({error});
        console.error('failed to fetch events', error);
      });
  }

  tableOnRowSelect = (row, _isSelected) => {
    this.setState({isEventModalOpen: true, selectedEvent: row});
  };

  headers = [
    {
      key: 'level',
      label: 'Level',
      render: this.renderLevelColor.bind(this),
      sort: true,
      width: 100,
    },
    {
      key: 'timestamp',
      label: 'Date',
      render: this.renderDate.bind(this),
      sort: true,
      width: 200,
    },
    {filter: true, key: 'name', label: 'Name', sort: true, width: 200},
    {key: 'reason', label: 'Description', width: 300},
    {filter: true, key: 'source', label: 'Source', sort: true, width: 200},
    {key: 'category', label: 'Category', sort: true, width: 100},
    {
      key: 'subcategory',
      label: 'Subcategory',
      sort: true,
      width: 100,
    },
  ];

  handleChange = event => {
    if (this.state[event.target.name] === event.target.value) {
      return;
    }
    this.setState(
      {[event.target.name]: event.target.value, error: '', events: []},
      this.getEvents,
    );
  };

  renderDate(cell, _row) {
    return new Date(cell * 1000).toLocaleString();
  }

  renderLevelColor(cell, _row) {
    let cellColor = 'forestgreen';
    if (cell == 'WARNING') {
      cellColor = 'gold';
    } else if (cell == 'FATAL' || cell == 'ERROR') {
      cellColor = 'firebrick';
    }
    return <span style={{color: cellColor}}>{cell}</span>;
  }

  renderEventOptions() {
    const {classes} = this.props;
    return (
      <>
        <div className={classes.eventBox}>
          <FormLabel component="legend">Event Options</FormLabel>
          <FormGroup row>
            <FormControl className={classes.formControl}>
              <InputLabel htmlFor="levelSelector">Level</InputLabel>
              <Select
                value={this.state.selectedLevel}
                onChange={this.handleChange}
                inputProps={{
                  name: 'selectedLevel',
                  id: 'levelSelector',
                }}>
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {Object.keys(EventLevelValueMap).map(level => {
                  return (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl className={classes.formControl}>
              <InputLabel htmlFor="categorySelector">Category</InputLabel>
              <Select
                value={this.state.selectedCategory}
                onChange={this.handleChange}
                inputProps={{
                  name: 'selectedCategory',
                  id: 'categorySelector',
                }}>
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                {Object.keys(EventCategoryValueMap).map(category => {
                  return (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </FormGroup>
        </div>
        <Divider variant="middle" classes={{root: classes.divider}} />
      </>
    );
  }

  render() {
    return (
      <NetworkContext.Consumer>{this.renderContext}</NetworkContext.Consumer>
    );
  }

  renderContext = context => {
    const {classes} = this.props;
    const {events, error, isEventModalOpen, selectedEvent} = this.state;

    const rowHeight = 60;
    const headerHeight = 100;
    const overscanRowCount = 10;
    return (
      <>
        {this.renderEventOptions()}
        {error !== '' ? (
          <Typography variant="h5" className={classes.eventBox}>
            {error}
          </Typography>
        ) : events.length === 0 ? (
          <LoadingBox />
        ) : (
          <CustomTable
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            overscanRowCount={overscanRowCount}
            columns={this.headers}
            data={events}
            onRowSelect={row => this.tableOnRowSelect(row)}
            additionalRenderParams={{context}}
          />
        )}

        <ModalEventInfo
          isOpen={isEventModalOpen}
          onClose={() => this.setState({isEventModalOpen: false})}
          event={selectedEvent}
        />
      </>
    );
  };
}

export default withStyles(styles, {withTheme: true})(NetworkEventsTable);
