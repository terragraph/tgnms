/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';
import {has, isEmpty} from 'lodash-es';
import {hot} from 'react-hot-loader';
import React from 'react';

import {Actions, LinkOverlayKeys} from './constants/NetworkConstants.js';
import {apiServiceRequest} from './apiutils/ServiceAPIUtil';
import Dispatcher from './NetworkDispatcher.js';
import DockerHosts from './components/docker/DockerHosts.js';
import E2EConfigContainer from './components/e2econfig/E2EConfigContainer.js';
import EventLogs from './EventLogs.js';
import ModalLinkAdd from './ModalLinkAdd.js';
import ModalNodeAdd from './ModalNodeAdd.js';
import ModalOverlays from './ModalOverlays.js';
import NetworkConfigContainer from './components/networkconfig/NetworkConfigContainer.js';
import NetworkMap from './NetworkMap.js';
import NetworkStats from './NetworkStats.js';
import NetworkStore from './stores/NetworkStore.js';
import NetworkUpgrade from './components/upgrade/NetworkUpgrade.js';
import NMSConfig from './NMSConfig.js';
import TopBar from './components/topbar/TopBar.js';
import UsersSettings from './components/users/UsersSettings.js';

// update network health at a lower interval (seconds)
const NETWORK_HEALTH_INTERVAL_MIN = 30;

class NetworkUI extends React.Component {
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
    this.dispatchToken = Dispatcher.register(this.handleDispatchEvent);
    // refresh network config
    const refresh_interval = window.CONFIG.refresh_interval
      ? window.CONFIG.refresh_interval
      : 5000;

    // load data if network name known
    this.getNetworkStatusPeriodic();
    setInterval(this.getNetworkStatusPeriodic, refresh_interval);
  }

  getNetworkStatusPeriodic = () => {
    if (this.state.networkName !== null) {
      this.getNetworkStatus(this.state.networkName);
      // load commit plan
      if (this.state.commitPlan === null) {
        this.getCommitPlan(this.state.networkName);
      }
    }
  };

  getCommitPlan = networkName => {
    apiServiceRequest(networkName, 'getUpgradeCommitPlan')
      .then(response => {
        // validate commit plan
        if (
          response.data &&
          response.data.hasOwnProperty('commitBatches') &&
          response.data['commitBatches'].length > 0
        ) {
          this.setState({
            commitPlan: response.data,
          });
        } else {
          // unset the old commit plan
          this.setState({
            commitPlan: null,
          });
        }
      })
      .catch(error => {
        console.error('failed to fetch upgrade commit plan', error);
        // clear old topology list
        this.setState({commitPlan: null});
      });
  };

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
      .catch(error => {
        // If the topologies already have been loaded, and this topology is
        // invalid, select the first topology
        if (
          error.message !== 'Network Error' &&
          !isEmpty(this.state.topologies)
        ) {
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_SELECTED,
            networkName: this.state.topologies[0].name,
          });
        }
      });
  };

  handleDispatchEvent = payload => {
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
        this.getCommitPlan(payload.networkName);
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
    }
  };

  updateNetworkLinkHealth(networkName) {
    // refresh link health
    const lastAttemptAgo = new Date() / 1000 - this.lastHealthRequestTime;
    if (lastAttemptAgo <= NETWORK_HEALTH_INTERVAL_MIN) {
      return;
    }
    // update last request time
    this.lastHealthRequestTime = new Date() / 1000;
    axios.get('/topology/link_health/' + networkName).then(response => {
      const data = response.data;
      Dispatcher.dispatch({
        actionType: Actions.LINK_HEALTH_REFRESHED,
        linkHealth: data,
      });
    });
    axios.get('/topology/node_health/' + networkName).then(response => {
      const data = response.data;
      Dispatcher.dispatch({
        actionType: Actions.NODE_HEALTH_REFRESHED,
        nodeHealth: data,
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
              overlay: response.data,
            });
          });
      }
    }
  }

  refreshTopologyList = () => {
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
  };

  UNSAFE_componentWillMount() {
    this.setState({
      topologies: [],
    });
    // fetch topology config
    this.refreshTopologyList();
    // refresh every 10 seconds
    setInterval(this.refreshTopologyList, 10000);
  }

  onAddSite() {
    Dispatcher.dispatch({
      actionType: Actions.PLANNED_SITE_CREATE,
      siteName: 'New Site',
    });

    this.setState({topologyModalOpen: false});
  }

  handleMenuBarSelect = info => {
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
        case 'logout':
          window.location = '/user/logout';
          break;
      }
    }
  };

  overlaysModalClose = (siteOverlay, linkOverlay, mapDimType, mapTile) => {
    this.setState({
      overlaysModalOpen: false,
      selectedLinkOverlay: linkOverlay,
      selectedMapDimType: mapDimType,
      selectedMapTile: mapTile,
      selectedSiteOverlay: siteOverlay,
    });
    Dispatcher.dispatch({
      actionType: Actions.LINK_OVERLAY_REFRESHED,
      overlay: null,
    });
  };

  // Passed through NetworkMap to DetailsSearchNearby to open the
  // addNode/addLink modal
  onTopologyOperation(topOp, topOpsProps) {
    if (topOp === 'addNode') {
      this.setState({topOpsAddNodeModalOpen: true, topOpsProps});
    } else if (topOp === 'addLink') {
      this.setState({topOpsAddLinkModalOpen: true, topOpsProps});
    }
  }

  render() {
    // If the topology isn't loaded, render the loader
    if (
      !this.state.networkName ||
      !has(this.state, 'networkConfig.topology.sites') ||
      !has(this.state, 'networkConfig.topology.nodes')
    ) {
      return (
        <div className="loading-spinner-wrapper">
          <div className="loading-spinner">
            <img src="/static/images/loading-graphs.gif" />
          </div>
        </div>
      );
    }

    // select between view panes
    // TODO: Move this to React Router
    const viewProps = {
      config: this.state.topologies,
      networkConfig: this.state.networkConfig,
      networkName: this.state.networkName,
      pendingTopology: this.state.pendingTopology,
      viewContext: this.state.viewContext,
    };
    let paneComponent = null;
    switch (this.state.view) {
      case 'eventlogs':
        paneComponent = <EventLogs {...viewProps} />;
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
      case 'users':
        paneComponent = <UsersSettings {...viewProps} />;
        break;
      case 'docker':
        paneComponent = <DockerHosts {...viewProps} />;
        break;
      default:
        paneComponent = (
          <NetworkMap
            {...viewProps}
            linkOverlay={this.state.selectedLinkOverlay}
            siteOverlay={this.state.selectedSiteOverlay}
            mapDimType={this.state.selectedMapDimType}
            mapTile={this.state.selectedMapTile}
            commitPlan={this.state.commitPlan}
            onTopologyOperation={(topOp, topOpsProps) =>
              this.onTopologyOperation(topOp, topOpsProps)
            }
          />
        );
    }

    let visibleModal = null;
    if (this.state.topOpsAddNodeModalOpen) {
      visibleModal = (
        <ModalNodeAdd
          isOpen={this.state.topOpsAddNodeModalOpen}
          onClose={() =>
            this.setState({topOpsAddNodeModalOpen: false, topOpsProps: null})
          }
          topology={this.state.topology}
          {...this.state.topOpsProps}
        />
      );
    } else if (this.state.topOpsAddLinkModalOpen) {
      visibleModal = (
        <ModalLinkAdd
          isOpen={this.state.topOpsAddLinkModalOpen}
          onClose={() =>
            this.setState({topOpsAddLinkModalOpen: false, topOpsProps: null})
          }
          topology={this.state.topology}
          {...this.state.topOpsProps}
        />
      );
    }

    return (
      <div>
        <ModalOverlays
          isOpen={this.state.overlaysModalOpen}
          selectedSiteOverlay={this.state.selectedSiteOverlay}
          selectedLinkOverlay={this.state.selectedLinkOverlay}
          selectedMapDimensions={this.state.selectedMapDimType}
          selectedMapTile={this.state.selectedMapTile}
          onClose={this.overlaysModalClose}
        />
        {visibleModal}
        <TopBar
          handleMenuBarSelect={this.handleMenuBarSelect}
          networkName={this.state.networkName}
          networkConfig={this.state.networkConfig}
          topologies={this.state.topologies}
          view={this.state.view}
          user={this.props.user}
        />
        <div className="nms-body">{paneComponent}</div>
      </div>
    );
  }
}

export default hot(module)(NetworkUI);
