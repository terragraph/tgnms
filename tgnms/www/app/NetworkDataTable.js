/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'react-tabs/style/react-tabs.css';

import {Actions} from './constants/NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import {isEqual} from 'lodash';
import NetworkDiscoveryTable from './NetworkDiscoveryTable.js';
import NetworkLinksTable from './NetworkLinksTable.js';
import NetworkNodesTable from './NetworkNodesTable.js';
import NetworkScans from './NetworkScans.js';
import NetworkStatusTable from './NetworkStatusTable.js';
import NetworkStore from './stores/NetworkStore.js';
import NetworkTestsTable from './NetworkTestsTable.js';
import PropTypes from 'prop-types';
import React from 'react';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';

const TAB_NAMES = ['status', 'nodes', 'links', 'scans', 'discovery'];

export default class NetworkDataTable extends React.Component {
  static propTypes = {
    networkConfig: PropTypes.object.isRequired,
  };

  state = {
    routing: {},
    zoomLevel: NetworkStore.zoomLevel,
  };

  tabNameToIndex = {};

  constructor(props) {
    super(props);
    this.shouldUpdate = false;
    TAB_NAMES.forEach((val, idx) => {
      this.tabNameToIndex[val] = idx;
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      return true;
    }
    return false;
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.height != this.props.height) {
      this.shouldUpdate = true;
    } else if (!isEqual(nextProps.networkConfig, this.props.networkConfig)) {
      this.shouldUpdate = true;
    }
  }

  UNSAFE_componentWillMount() {
    // register for topology changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    this.setState({
      selectedTabIndex:
        NetworkStore.tabName in this.tabNameToIndex
          ? this.tabNameToIndex[NetworkStore.tabName]
          : 0,
    });
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.TOPOLOGY_REFRESHED:
        // TODO - compare props and update shouldUpdate or something
        break;
      case Actions.AGGREGATOR_DUMP_REFRESHED:
        this.shouldUpdate = true;
        this.setState({
          routing: payload.routing,
        });
        break;
      case Actions.TAB_SELECTED:
        this.shouldUpdate = true;
        if (!(payload.tabName in this.tabNameToIndex)) {
          console.error('Tab not found', payload.tabName);
          break;
        }
        const tabIndex = this.tabNameToIndex[payload.tabName];
        // prevent clicking on link/node on the map from switching tabs
        // when the current tab is Scans
        if (this.state.selectedTabIndex !== this.tabNameToIndex.scans) {
          this.setState({
            selectedTabIndex: tabIndex,
          });
        }
        break;
    }
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
    });
    const lastTabName = TAB_NAMES[last];
    const newTabName = TAB_NAMES[index];
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: newTabName,
    });
    // don't de-select between links/test
    if (
      (lastTabName === 'tests' && newTabName === 'links') ||
      (lastTabName === 'links' && newTabName === 'tests')
    ) {
      return;
    }
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_NODE_LINK_SELECTED,
    });
    Dispatcher.dispatch({
      actionType: Actions.CLEAR_ROUTE,
    });
  }

  render() {
    let adjustedHeight = this.props.height - 95;
    adjustedHeight = adjustedHeight < 0 ? 0 : adjustedHeight;
    const tableProps = {
      height: adjustedHeight,
      instance: this.props.networkConfig,
      topology: this.props.networkConfig.topology,
      zoomLevel: this.state.zoomLevel,
    };
    return (
      <Tabs
        selectedTabClassName="data-table-tab-selected"
        onSelect={this._handleTabSelect.bind(this)}
        selectedIndex={this.state.selectedTabIndex}>
        <TabList className="data-table-tab-list">
          <Tab className="data-table-tab">Status</Tab>
          <Tab className="data-table-tab">Nodes</Tab>
          <Tab className="data-table-tab">Links</Tab>
          <Tab className="data-table-tab">Tests</Tab>
          <Tab className="data-table-tab">Scans</Tab>
          <Tab className="data-table-tab">Discovery</Tab>
        </TabList>
        <TabPanel>
          <NetworkStatusTable {...tableProps} />
        </TabPanel>
        <TabPanel>
          <NetworkNodesTable {...tableProps} />
        </TabPanel>
        <TabPanel>
          <NetworkLinksTable {...tableProps} />
        </TabPanel>
        <TabPanel>
          <NetworkTestsTable {...tableProps} />
        </TabPanel>
        <TabPanel>
          <NetworkScans {...tableProps} />
        </TabPanel>
        <TabPanel>
          <NetworkDiscoveryTable {...tableProps} />
        </TabPanel>
      </Tabs>
    );
  }
}
