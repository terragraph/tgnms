/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';
import axios from 'axios';
import moment from 'moment';
import React from 'react';
import DateTime from 'react-datetime';
import Select from 'react-select';
import {SortDirection} from 'react-virtualized';

import CustomTable from './components/common/CustomTable.js';
import {Actions} from './constants/NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';

const eventTTypes = require('../thrift/gen-nodejs/Event_types');

export default class EventLogs extends React.Component {
  constructor(props) {
    super(props);
    this.handleCategoryChange = this.handleCategoryChange.bind(this);
    this.handleLevelChange = this.handleLevelChange.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);
    this.getEvents = this.getEvents.bind(this);
    const categories = Object.keys(eventTTypes.EventCategory);
    const levels = Object.keys(eventTTypes.EventLevel);

    this.state = {
      afterDate: moment.unix(0),
      catOptions: categories.map(category => ({
        label: category,
        value: category,
      })),
      error:
        'No events found for topology ' +
        this.props.networkConfig.topology.name,
      events: [],
      filters: {},
      levelOptions: levels.map(level => ({label: level, value: level})),
      maxResults: 100,
      selectedCategory: '',
      selectedLevel: '',
      sortBy: null,
      sortDirection: SortDirection.ASC,
    };
  }

  componentDidMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      (this.handleDispatchEvent = payload => {
        switch (payload.actionType) {
          case Actions.TOPOLOGY_SELECTED:
            this.getEvents(payload.networkName);
            break;
        }
      }),
    );
    this.getEvents();
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleCategoryChange = selectedCategory => {
    this.setState({
      selectedCategory: selectedCategory ? selectedCategory.value : '',
    });
  };

  handleLevelChange = selectedLevel => {
    this.setState({selectedLevel: selectedLevel ? selectedLevel.value : ''});
  };

  handleDateChange = afterDate => {
    this.setState({afterDate});
  };

  getEvents(topologyName = this.props.networkConfig.topology.name) {
    const uri = `/metrics/events/${topologyName}\
                 /${this.state.selectedLevel}\
                 /${this.state.selectedCategory}\
                 /${this.state.afterDate.format('X')}\
                 /${this.state.maxResults}`;
    axios
      .get(uri)
      .then(response => {
        const events = response.data;
        this.setState({
          error:
            events.length == 0
              ? 'No events found for topology ' + topologyName
              : '',
          events,
        });
      })
      .catch(error => {
        this.setState({error});
        console.error('failed to fetch events', error);
      });
  }

  static sortEventsHelper(a, b, sortBy, sortDirection) {
    let ret = 0;
    if (a[sortBy] < b[sortBy]) {
      ret = -1;
    }

    if (a[sortBy] > b[sortBy]) {
      ret = 1;
    }

    return sortDirection === SortDirection.ASC ? ret : -ret;
  }

  sortHelper({sortBy, sortDirection}) {
    const events = this.state.events.sort((a, b) => {
      return EventLogs.sortEventsHelper(a, b, sortBy, sortDirection);
    });

    this.setState({
      events,
      sortBy,
      sortDirection,
    });
  }

  renderDate(cell, row) {
    const date = new Date(cell * 1000);
    return date.toLocaleString();
  }

  renderLevelColor(cell, row) {
    let cellColor = 'forestgreen';
    if (cell == 'WARNING') {
      cellColor = 'gold';
    } else if (cell == 'FATAL' || cell == 'ERROR') {
      cellColor = 'firebrick';
    }
    return <span style={{color: cellColor}}>{cell}</span>;
  }

  headers = [
    {
      filter: true,
      key: 'level',
      label: 'Level',
      render: this.renderLevelColor,
      sort: true,
      width: 30,
    },
    {
      key: 'timestamp',
      label: 'Date',
      render: this.renderDate,
      sort: true,
      width: 80,
    },
    {filter: true, key: 'name', label: 'Name', sort: true, width: 100},
    {filter: true, key: 'mac', label: 'Mac', sort: true, width: 50},
    {filter: true, key: 'source', label: 'Source', sort: true, width: 50},
    {filter: true, key: 'category', label: 'Category', sort: true, width: 50},
    {
      filter: true,
      key: 'subcategory',
      label: 'Subcategory',
      sort: true,
      width: 75,
    },
    {key: 'reason', label: 'Reason', sort: false, width: 100},
    {key: 'details', label: 'Details', sort: false, width: 30},
  ];

  render() {
    const rowHeight = 40;
    const headerHeight = 80;
    const overscanRowCount = 10;
    return (
      <div className="eventlog">
        <div className="eventlog-left-pane">
          <label className="eventlog-header-label">Filter options</label>
          <div>
            <Select
              name="Level"
              placeholder="Select level..."
              value={this.state.selectedLevel}
              onChange={this.handleLevelChange}
              options={this.state.levelOptions}
              clearable={true}
            />
          </div>
          <div>
            <Select
              name="Category"
              placeholder="Select category..."
              value={this.state.selectedCategory}
              onChange={this.handleCategoryChange}
              options={this.state.catOptions}
              clearable={true}
            />
          </div>
          <div>
            <label className="eventlog-label">After date:</label>
            <DateTime
              onChange={this.handleDateChange}
              isValidDate={current => current.isBefore(moment().endOf('day'))}
            />
          </div>
          <div>
            <label className="eventlog-label">Limit results:</label>
            <input
              type="text"
              value={this.state.maxResults}
              onChange={event =>
                this.setState({
                  maxResults: event.target.value.replace(/\D/, ''),
                })
              }
            />
            <button className="upgrade-btn" onClick={() => this.getEvents()}>
              Load
            </button>
          </div>
        </div>
        <div className="eventlog-body">
          {this.state.error != '' ? (
            <label className="eventlog-header-label">{this.state.error}</label>
          ) : (
            <CustomTable
              rowHeight={rowHeight}
              headerHeight={headerHeight}
              height={window.innerHeight}
              overscanRowCount={overscanRowCount}
              columns={this.headers}
              data={this.state.events}
              sortFunction={val => this.sortHelper(val)}
              sortBy={this.state.sortBy}
              sortDirection={this.state.sortDirection}
            />
          )}
        </div>
      </div>
    );
  }
}
