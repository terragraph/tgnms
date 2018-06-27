/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import EventLogs from './EventLogs.js';
import ModalLinkAdd from './ModalLinkAdd.js';
import ModalNodeAdd from './ModalNodeAdd.js';
import ModalOverlays from './ModalOverlays.js';
import NMSConfig from './NMSConfig.js';
import NetworkDashboards from './NetworkDashboards.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkMap from './NetworkMap.js';
import NetworkStats from './NetworkStats.js';
import NetworkConfigContainer from './components/networkconfig/NetworkConfigContainer.js';
import E2EConfigContainer from './components/e2econfig/E2EConfigContainer.js';
import NetworkUpgrade from './components/upgrade/NetworkUpgrade.js';
import {Actions, LinkOverlayKeys} from './constants/NetworkConstants.js';
import NetworkStore from './stores/NetworkStore.js';
import axios from 'axios';
import moment from 'moment';
import Menu, {SubMenu, Item as MenuItem, Divider} from 'rc-menu';
import {Glyphicon} from 'react-bootstrap';
import React from 'react';

// icon: Glyphicon from Bootstrap 3.3.7
const VIEWS = {
  map: {name: 'Map', icon: 'map-marker'},
  dashboards: {name: 'Dashboards', icon: 'dashboard'},
  stats: {name: 'Stats', icon: 'stats'},
  // TODO: implement these views and uncomment them
  // eventlogs: {name: 'Event Logs', icon: 'list'},
  upgrade: {name: 'Upgrade', icon: 'upload'},
  'nms-config': {name: 'NMS Instance Config (Alpha)', icon: 'cloud'},
  config: {name: 'Node Config', icon: 'cog'},
  'e2e-config': {name: 'E2E Config', icon: 'hdd'},
};

const TOPOLOGY_OPS = {
  addSite: 'Add Planned Site',
  addNode: 'Add Node',
  addLink: 'Add Link',
};

// update network health at a lower interval (seconds)
const NETWORK_HEALTH_INTERVAL_MIN = 30;

export default class NetworkUI extends React.Component {
  state = {
    view: NetworkStore.viewName,
    // additional props for a view
    viewContext: {},

    networkName: NetworkStore.networkName,
    networkConfig: {},
    nodesByName: {},
    topologies: [],
    routing: {},
    overlaysModalOpen: false,
    topologyModalOpen: false,

    selectedSiteOverlay: 'Health',
    selectedLinkOverlay: 'Health',
    selectedMapDimType: 'Default',
    selectedMapTile: 'Default',
    topology: {},
    // additional topology to render on the map
    pendingTopology: {},
    commitPlan: null,
  };

  constructor(props) {
    super(props);
    // register for menu changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    // refresh network config
    const refresh_interval = window.CONFIG.refresh_interval
      ? window.CONFIG.refresh_interval
      : 5000;

    // load data if network name known
    this.getNetworkStatusPeriodic();
    setInterval(this.getNetworkStatusPeriodic.bind(this), refresh_interval);
  }

  getNetworkStatusPeriodic() {
    if (this.state.networkName !== null) {
      this.getNetworkStatus(this.state.networkName);
    }
  }

  getNetworkStatus = networkName => {
    axios
      .get('/topology/get/' + networkName)
      .then(response => {
        // TODO: normalize the topology with health data if it exists
        this.setState({
          networkConfig: response.data,
        });
        // dispatch the updated topology json
        Dispatcher.dispatch({
          actionType: Actions.TOPOLOGY_REFRESHED,
          networkConfig: response.data,
        });
      })
      .catch(_error => {
        // topology is invalid, switch to the first topology in the list
        if (this.state.topologies.length) {
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_SELECTED,
            networkName: this.state.topologies[0].name,
          });
        }
      });
  };

  // see scan_results in server.js
  getSelfTestResults(networkName, filter) {
    if (
      filter &&
      filter.hasOwnProperty('filterType') &&
      filter.hasOwnProperty('testtime')
    ) {
      axios
        .get(
          '/self_test?topology=' +
            networkName +
            '&filter[filterType]=' +
            filter.filterType +
            '&filter[testtime]=' +
            filter.testtime,
        )
        .then(response => {
          Dispatcher.dispatch({
            actionType: Actions.SELF_TEST_REFRESHED,
            selfTestResults: response.data,
          });
        })
        .catch(_error => {});
    }
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.VIEW_SELECTED:
        const viewName = payload.viewName;
        // ignore the menu
        if (viewName === '#') {
          break;
        }
        this.setState({
          view: viewName,
          viewContext: payload.context ? payload.context : {},
        });
        // construct new URL from selected view
        break;
      case Actions.TOPOLOGY_SELECTED:
        // update selected topology
        this.getNetworkStatus(payload.networkName);
        this.setState({
          networkName: payload.networkName,
        });
        // reset our health updater (make this better)
        this.lastHealthRequestTime = 0;
        this.lastAnalyzerRequestTime = 0;
        // update the browser URL history
        break;
      case Actions.TOPOLOGY_REFRESHED:
        const nodesByName = {};
        payload.networkConfig.topology.nodes.forEach(node => {
          nodesByName[node.name] = node;
        });
        // update node name mapping
        this.setState({
          nodesByName,
          topology: payload.networkConfig.topology,
        });
        // update link health
        this.updateNetworkLinkHealth(this.state.networkName);
        this.updateNetworkAnalyzer(this.state.networkName);
        this.updateLinkOverlayStat(this.state.networkName);
        break;
      case Actions.PENDING_TOPOLOGY:
        this.setState({
          pendingTopology: payload.topology,
        });
        break;
      case Actions.SCAN_FETCH:
        this.updateScanResults(this.state.networkName, payload.mysqlfilter);
        break;
      case Actions.SELF_TEST_FETCH:
        this.getSelfTestResults(this.state.networkName, payload.filter);
        break;
    }
  }

  updateNetworkLinkHealth(networkName) {
    // refresh link health
    const lastAttemptAgo = new Date() / 1000 - this.lastHealthRequestTime;
    if (lastAttemptAgo <= NETWORK_HEALTH_INTERVAL_MIN) {
      return;
    }
    // update last request time
    this.lastHealthRequestTime = new Date() / 1000;
    axios.get('/topology/health/' + networkName).then(response => {
      const data = response.data;
      if (data.length !== 2) {
        return;
      }
      Dispatcher.dispatch({
        actionType: Actions.HEALTH_REFRESHED,
        nodeHealth: data[0],
        linkHealth: data[1],
      });
    });
  }

  updateNetworkAnalyzer(networkName) {
    // refresh link health
    const lastAttemptAgo = new Date() / 1000 - this.lastAnalyzerRequestTime;
    if (lastAttemptAgo <= NETWORK_HEALTH_INTERVAL_MIN) {
      return;
    }
    // update last request time
    this.lastAnalyzerRequestTime = new Date() / 1000;
    axios.get('/metrics/link_analyzer/' + networkName).then(response => {
      const json = response.data;
      // merge data
      if (json.length !== 1) {
        return;
      }
      // ensure we can decode the response
      Dispatcher.dispatch({
        actionType: Actions.ANALYZER_REFRESHED,
        analyzerTable: json[0],
      });
    });
  }

  // see scan_results in server.js
  updateScanResults(networkName, filter) {
    const lastAttemptAgo = new Date() / 1000 - this.lastAnalyzerRequestTime;
    if (lastAttemptAgo <= NETWORK_HEALTH_INTERVAL_MIN) {
      return;
    }
    // update last request time
    this.lastScanRequestTime = new Date() / 1000;
    const url =
      '/metrics/scan_results?topology=' +
      networkName +
      '&filter[row_count]=' +
      filter.row_count +
      '&filter[offset]=' +
      filter.offset +
      '&filter[nodeFilter0]=' +
      filter.nodeFilter[0] +
      '&filter[nodeFilter1]=' +
      filter.nodeFilter[1];

    axios.get(url).then(response => {
      Dispatcher.dispatch({
        actionType: Actions.SCAN_REFRESHED,
        scanResults: response.data,
      });
    });
  }

  updateLinkOverlayStat(networkName) {
    if (this.state.selectedLinkOverlay) {
      const overlaySource = LinkOverlayKeys[this.state.selectedLinkOverlay];
      const metric = overlaySource.metric;

      if (metric) {
        // refresh link overlay stat
        axios
          .get('/metrics/overlay/linkStat/' + networkName + '/' + metric)
          .then(response => {
            Dispatcher.dispatch({
              actionType: Actions.LINK_OVERLAY_REFRESHED,
              overlay: response.data[0],
            });
          });
      }
    }
  }

  refreshTopologyList() {
    // topology list
    axios.get('/topology/list').then(response => {
      this.setState({
        topologies: response.data,
      });
      // dispatch the whole network topology struct
      Dispatcher.dispatch({
        actionType: Actions.TOPOLOGY_LIST_REFRESHED,
        topologies: response.data,
      });
      // select the first topology by default
      if (!this.state.networkName && this.state.topologies.length) {
        Dispatcher.dispatch({
          actionType: Actions.TOPOLOGY_SELECTED,
          networkName: this.state.topologies[0].name,
        });
      }
    });
  }

  UNSAFE_componentWillMount() {
    this.setState({
      topologies: [],
    });
    // fetch topology config
    this.refreshTopologyList();
    // refresh every 10 seconds
    setInterval(this.refreshTopologyList.bind(this), 10000);
  }

  onAddSite() {
    Dispatcher.dispatch({
      actionType: Actions.PLANNED_SITE_CREATE,
      siteName: 'New Site',
    });

    this.setState({topologyModalOpen: false});
  }

  handleMenuBarSelect(info) {
    if (info.key.indexOf('#') > -1) {
      const keySplit = info.key.split('#');
      switch (keySplit[0]) {
        case 'view':
          Dispatcher.dispatch({
            actionType: Actions.VIEW_SELECTED,
            viewName: keySplit[1],
          });
          break;
        case 'topo':
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_SELECTED,
            networkName: keySplit[1],
          });
          break;
        case 'overlays':
          this.setState({overlaysModalOpen: true});
          break;
        case 'topOps':
          switch (keySplit[1]) {
            case 'addSite':
              this.onAddSite();
              break;
            case 'addNode':
              this.setState({topOpsAddNodeModalOpen: true});
              break;
            case 'addLink':
              this.setState({topOpsAddLinkModalOpen: true});
              break;
          }
          break;
      }
    }
  }

  overlaysModalClose(siteOverlay, linkOverlay, mapDimType, mapTile) {
    this.setState({
      overlaysModalOpen: false,
      selectedSiteOverlay: siteOverlay,
      selectedLinkOverlay: linkOverlay,
      selectedMapDimType: mapDimType,
      selectedMapTile: mapTile,
    });
    Dispatcher.dispatch({
      actionType: Actions.LINK_OVERLAY_REFRESHED,
      overlay: null,
    });
  }

  render() {
    const topologyMenuItems = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      const topologyConfig = this.state.topologies[i];
      const keyName = 'topo#' + topologyConfig.name;
      let online = topologyConfig.controller_online;
      let controllerErrorMsg;
      if (topologyConfig.hasOwnProperty('controller_error')) {
        online = false;
        controllerErrorMsg = (
          <span style={{color: 'red', fontWeight: 'bold'}}>(Error)</span>
        );
      }
      topologyMenuItems.push(
        <MenuItem key={keyName}>
          <img
            src={'/static/images/' + (online ? 'online' : 'offline') + '.png'}
          />
          {topologyConfig.name}
          {controllerErrorMsg}
        </MenuItem>,
      );
    }
    let networkStatusMenuItems = [];
    if (this.state.networkConfig && this.state.networkConfig.topology) {
      const topology = this.state.networkConfig.topology;
      const linksOnline = topology.links.filter(
        link => link.link_type === 1 && link.is_alive,
      ).length;
      const linksWireless = topology.links.filter(link => link.link_type === 1)
        .length;
      // online + online initiator
      const sectorsOnline = topology.nodes.filter(
        node => node.status === 2 || node.status === 3,
      ).length;
      const e2eStatusList = [];
      if (this.state.networkConfig.hasOwnProperty('controller_events')) {
        this.state.networkConfig.controller_events
          .slice()
          .reverse()
          .forEach((eventArr, index) => {
            if (eventArr.length !== 2) {
              return;
            }
            const timeStr = moment(new Date(eventArr[0])).format(
              'M/D/YY HH:mm:ss',
            );
            e2eStatusList.push(
              <MenuItem key={'e2e-status-events' + index} disabled>
                <img
                  src={
                    '/static/images/' +
                    (eventArr[1] ? 'online' : 'offline') +
                    '.png'
                  }
                />
                {timeStr}
              </MenuItem>,
            );
          });
      }
      networkStatusMenuItems = [
        <SubMenu
          key="e2e-status-menu"
          mode="vertical"
          title="E2E"
          className={
            this.state.networkConfig.controller_online
              ? 'svcOnline'
              : 'svcOffline'
          }>
          {e2eStatusList}
        </SubMenu>,
        <Divider key="status-divider" />,
        <SubMenu
          key="nms-status-menu"
          mode="vertical"
          title="STATS"
          disabled
          className={
            this.state.networkConfig.query_service_online
              ? 'svcOnline'
              : 'svcOffline'
          }>
          NMS
        </SubMenu>,
        <Divider key="site-divider" />,
        <MenuItem key="site-status" disabled>
          {topology.sites.length} Sites
        </MenuItem>,
        <Divider key="sector-divider" />,
        <MenuItem key="sector-status" disabled>
          {sectorsOnline}/{topology.nodes.length} Sectors
        </MenuItem>,
        <Divider key="link-divider" />,
        <MenuItem key="link-status" disabled>
          {linksOnline}/{linksWireless} Links
        </MenuItem>,
      ];
    }
    // don't load components without topology config
    if (
      !this.state.networkName ||
      !this.state.networkConfig ||
      !this.state.networkConfig.topology ||
      !this.state.networkConfig.topology.sites ||
      !this.state.networkConfig.topology.nodes
    ) {
      return (
        <div>
          <div className="loading-spinner-wrapper">
            <div className="loading-spinner">
              <img src="/static/images/loading-graphs.gif" />
            </div>
          </div>
        </div>
      );
    }
    // select between view panes
    const viewProps = {
      networkName: this.state.networkName,
      networkConfig: this.state.networkConfig,
      pendingTopology: this.state.pendingTopology,
      config: this.state.topologies,
      viewContext: this.state.viewContext,
    };
    let paneComponent = <div />;
    switch (this.state.view) {
      case 'eventlogs':
        paneComponent = <EventLogs {...viewProps} />;
        break;
      case 'dashboards':
        paneComponent = <NetworkDashboards {...viewProps} />;
        break;
      case 'stats':
        paneComponent = <NetworkStats {...viewProps} />;
        break;
      case 'upgrade':
        paneComponent = (
          <NetworkUpgrade
            {...viewProps}
            upgradeStateDump={this.state.networkConfig.upgradeStateDump}
          />
        );
        break;
      case 'nms-config':
        paneComponent = <NMSConfig {...viewProps} />;
        break;
      case 'config':
        paneComponent = <NetworkConfigContainer {...viewProps} />;
        break;
      case 'e2e-config':
        paneComponent = <E2EConfigContainer {...viewProps} />;
        break;
      default:
        paneComponent = (
          <NetworkMap
            {...viewProps}
            linkOverlay={this.state.selectedLinkOverlay}
            siteOverlay={this.state.selectedSiteOverlay}
            mapDimType={this.state.selectedMapDimType}
            mapTile={this.state.selectedMapTile}
          />
        );
    }
    // add all selected keys
    const selectedKeys = ['view#' + this.state.view];
    if (this.state.networkName) {
      selectedKeys.push('topo#' + this.state.networkName);
    }

    let visibleModal = null;
    if (this.state.topOpsAddNodeModalOpen) {
      visibleModal = (
        <ModalNodeAdd
          isOpen={this.state.topOpsAddNodeModalOpen}
          onClose={() => this.setState({topOpsAddNodeModalOpen: false})}
          topology={this.state.topology}
        />
      );
    } else if (this.state.topOpsAddLinkModalOpen) {
      visibleModal = (
        <ModalLinkAdd
          isOpen={this.state.topOpsAddLinkModalOpen}
          onClose={() => this.setState({topOpsAddLinkModalOpen: false})}
          topology={this.state.topology}
        />
      );
    }

    let mapMenuItems = [];
    if (this.state.view === 'map') {
      mapMenuItems = [
        <Divider key={1} />,
        <SubMenu
          title={
            <span>
              Topology Operations <span className="caret" />
            </span>
          }
          key="topOps"
          mode="vertical">
          {Object.keys(TOPOLOGY_OPS).map(topOpsKey => {
            const topOpsName = TOPOLOGY_OPS[topOpsKey];
            return (
              <MenuItem key={'topOps#' + topOpsKey}>{topOpsName}</MenuItem>
            );
          })}
        </SubMenu>,
        <Divider key={2} />,
        <MenuItem key={'overlays#'}>
          <img src={'/static/images/overlays.png'} />
          Site/Link Overlays
        </MenuItem>,
      ];
    }

    return (
      <div>
        <ModalOverlays
          isOpen={this.state.overlaysModalOpen}
          selectedSiteOverlay={this.state.selectedSiteOverlay}
          selectedLinkOverlay={this.state.selectedLinkOverlay}
          selectedMapDimensions={this.state.selectedMapDimType}
          selectedMapTile={this.state.selectedMapTile}
          onClose={this.overlaysModalClose.bind(this)}
        />
        {visibleModal}

        <div className="top-menu-bar">
          <Menu
            onSelect={this.handleMenuBarSelect.bind(this)}
            mode="horizontal"
            selectedKeys={selectedKeys}
            style={{float: 'left'}}
            openAnimation="slide-up">
            <SubMenu
              title={
                <span>
                  View <span className="caret" />
                </span>
              }
              key="view"
              mode="vertical">
              {Object.keys(VIEWS).map(viewKey => {
                return (
                  <MenuItem key={'view#' + viewKey}>
                    <Glyphicon glyph={VIEWS[viewKey].icon} />
                    {VIEWS[viewKey].name}
                  </MenuItem>
                );
              })}
            </SubMenu>
            <MenuItem key="view-selected" disabled>
              <Glyphicon glyph={VIEWS[this.state.view].icon} />
              {VIEWS[this.state.view].name}
            </MenuItem>
            <Divider />
            <SubMenu
              title={
                <span>
                  Topology <span className="caret" />
                </span>
              }
              key="topo"
              mode="vertical">
              {topologyMenuItems}
            </SubMenu>
            <MenuItem key="topology-selected" disabled>
              {this.state.networkName ? this.state.networkName : '-'}
            </MenuItem>
            {mapMenuItems}
          </Menu>
          <Menu
            mode="horizontal"
            style={{float: 'right'}}
            openAnimation="slide-up">
            {networkStatusMenuItems}
          </Menu>
        </div>
        <div className="nms-body">{paneComponent}</div>
      </div>
    );
  }
}
