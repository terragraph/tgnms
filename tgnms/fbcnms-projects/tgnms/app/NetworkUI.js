/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import E2EConfig from './views/config/E2EConfig';
import Fade from '@material-ui/core/Fade';
import LoadingBox from './components/common/LoadingBox';
import NetworkConfig from './views/config/NetworkConfig';
import NetworkContext from './NetworkContext';
import NetworkDashboards from './views/dashboards/NetworkDashboards';
import NetworkListContext from './NetworkListContext';
import NetworkMap from './views/map/NetworkMap';
import NetworkStatsBeringei from './views/stats/NetworkStatsBeringei';
import NetworkStatsPrometheus from './views/stats/NetworkStatsPrometheus';
import NetworkTables from './views/tables/NetworkTables';
import NetworkTest from './views/network_test/NetworkTest';
import NetworkUpgrade from './views/upgrade/NetworkUpgrade';
import NodeLogs from './views/logs/NodeLogs';
import React from 'react';
import axios from 'axios';
import {Redirect, Route, Switch} from 'react-router-dom';
import {TopologyElementType} from './constants/NetworkConstants.js';
import {fetchLinkIgnitionAttempts} from './helpers/PrometheusHelpers';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

const styles = _theme => ({
  content: {
    flex: '1 1 auto',
    flexFlow: 'column',
    display: 'flex',
    overflow: 'auto',
  },
  overlayBox: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
  },
});

const REFRESH_INTERVAL = window.CONFIG.refresh_interval
  ? window.CONFIG.refresh_interval
  : 5000;

// allow switching between stats backends
const STATS_DS =
  window.CONFIG.env.STATS_BACKEND === 'prometheus' ? 'prometheus' : 'beringei';

class NetworkUI extends React.Component<Props, State> {
  state = {
    // Used to trigger a redirect when the network is invalid
    invalidTopologyRedirect: false,

    // Selected network
    networkConfig: {},
    isReloading: false,

    // Topology maps
    nodeMap: {},
    linkMap: {},
    siteMap: {},
    siteToNodesMap: {},

    // Topology elements
    // {type: TopologyElementType, name: string, expanded: bool}
    selectedElement: null,
    pinnedElements: [],

    // Network health stats
    networkNodeHealth: {},
    networkLinkHealth: {},
    networkAnalyzerData: {},
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // fetch initial network topology
    this.getCurrentNetworkStatus();
    // reset topology fetch timer and re-schedule topology get
    this.getCurrentNetworkStatusPeriodic();
  }

  componentWillUnmount() {
    // clear timers
    clearInterval(this._refreshNetworkInterval);
  }

  componentDidUpdate(prevProps: Props, _prevState: State) {
    const {params} = this.props.match;
    const prevParams = prevProps.match.params;
    const networkName = params.hasOwnProperty('networkName')
      ? params.networkName
      : null; // compare old network name to new
    const prevNetworkName = prevParams.hasOwnProperty('networkName')
      ? prevParams.networkName
      : null;
    if (networkName !== prevNetworkName) {
      // clear the network config when network name changes
      this.setState({
        networkConfig: {},
        isReloading: false,
        nodeMap: {},
        linkMap: {},
        siteMap: {},
        siteToNodesMap: {},
        selectedElement: null,
        pinnedElements: [],
        networkNodeHealth: {},
        networkLinkHealth: {},
        networkAnalyzerData: {},
        // fetched metrics to display
        networkLinkIgnitionAttempts: {},
      });
      // fetch new network
      this.getCurrentNetworkStatus();
      // reset topology fetch timer and re-schedule topology get
      this.getCurrentNetworkStatusPeriodic();
    }
  }

  getCurrentNetworkStatusPeriodic = () => {
    // clear timers
    clearInterval(this._refreshNetworkInterval);
    // re-schedule
    this._refreshNetworkInterval = setInterval(
      this.getCurrentNetworkStatus,
      REFRESH_INTERVAL,
    );
  };

  getCurrentNetworkStatus = () => {
    // Fetch the network config for the current network (if set)
    const networkName = this.props.match.params.networkName;
    if (networkName) {
      this.getNetworkStatus(networkName);
    }
  };

  refreshNetworkConfig = () => {
    // Refresh the network config for the current network (if set)
    // In the meantime, overlay a loading spinner on the page
    this.setState({isReloading: true});
    this.getCurrentNetworkStatus();
  };

  getNetworkStatus = networkName => {
    // Fetch the network config for the given network
    axios
      .get('/topology/get/' + networkName)
      .then(response => {
        this.processNetworkConfig(response.data, networkName);
      })
      .catch(error => {
        if (!error.response || error.response.status === 404) {
          // invalid topology, redirect to /
          this.setState({
            invalidTopologyRedirect: true,
            isReloading: false,
          });
        }
      });

    // fetch network-wide stats
    fetchLinkIgnitionAttempts(networkName, '1d')
      .then(linkMetricsResp => {
        this.setState({networkLinkIgnitionAttempts: linkMetricsResp.data});
      })
      .catch(err => {
        console.error('Unable to fetch link ignition attempts:', err);
      });
  };

  processNetworkConfig = (networkConfig, networkName) => {
    // Update state with new network config
    const topologyMaps = this.buildTopologyMaps(networkConfig.topology);
    const topologyState = this.cleanTopologyState(topologyMaps);
    this.setState({
      networkConfig,
      isReloading: false,
      ...topologyMaps,
      ...topologyState,
    });

    // Refresh network health
    this.updateNetworkHealth(networkName);
    this.updateNetworkAnalyzer(networkName);
  };

  buildTopologyMaps = topology => {
    // Build maps from topology element arrays
    const nodeMap = {};
    const linkMap = {};
    const siteMap = {};
    const siteToNodesMap = {};
    topology.sites.forEach(site => {
      siteMap[site.name] = site;
      siteToNodesMap[site.name] = new Set();
    });
    topology.nodes.forEach(node => {
      nodeMap[node.name] = node;
      siteToNodesMap[node.site_name].add(node.name);
    });
    topology.links.forEach(link => {
      linkMap[link.name] = link;
    });

    return {nodeMap, linkMap, siteMap, siteToNodesMap};
  };

  cleanTopologyState = topologyMaps => {
    // Cleans up selected/pinned elements based on new topology maps
    const {selectedElement, pinnedElements} = this.state;
    return {
      selectedElement:
        selectedElement &&
        this.topologyElementExists(selectedElement, topologyMaps)
          ? selectedElement
          : null,
      pinnedElements: pinnedElements.filter(el =>
        this.topologyElementExists(el, topologyMaps),
      ),
    };
  };

  topologyElementExists = ({type, name}, {nodeMap, linkMap, siteMap}) => {
    // Returns whether the given node/link/site exists
    if (type === TopologyElementType.NODE) {
      return nodeMap.hasOwnProperty(name);
    } else if (type === TopologyElementType.LINK) {
      return linkMap.hasOwnProperty(name);
    } else if (type === TopologyElementType.SITE) {
      return siteMap.hasOwnProperty(name);
    }
    return false;
  };

  updateNetworkHealth = networkName => {
    // Refresh network node/link health
    axios.get('/topology/link_health/' + networkName).then(response => {
      this.setState({networkLinkHealth: response.data || {}});
    });
    axios.get('/topology/node_health/' + networkName).then(response => {
      this.setState({networkNodeHealth: response.data || {}});
    });
  };

  updateNetworkAnalyzer = networkName => {
    // Refresh network analyzer data
    axios.get('/metrics/link_analyzer/' + networkName).then(response => {
      this.setState({networkAnalyzerData: response.data});
    });
  };

  setSelected = (type, name) => {
    // Select a node/link/site
    // Expand the selected element and unexpand everything else
    const {pinnedElements} = this.state;
    this.setState({
      selectedElement: {type, name, expanded: true},
      pinnedElements: pinnedElements.map(el => ({...el, expanded: false})),
    });
  };

  removeElement = (type, name) => {
    // Remove the given element from selected/pinned lists
    const {selectedElement, pinnedElements} = this.state;

    const pinnedElementsFiltered = pinnedElements.filter(
      el => !(el.type === type && el.name === name),
    );
    if (
      selectedElement &&
      selectedElement.type === type &&
      selectedElement.name === name
    ) {
      this.setState({
        selectedElement: null,
        pinnedElements: pinnedElementsFiltered,
      });
    } else if (pinnedElementsFiltered.length < pinnedElements.length) {
      this.setState({pinnedElements: pinnedElementsFiltered});
    }
  };

  togglePin = (type, name, flag) => {
    // Pin or unpin a node/link/site
    const {selectedElement, pinnedElements} = this.state;
    if (flag) {
      // Can only pin the selected element
      if (
        selectedElement &&
        selectedElement.type === type &&
        selectedElement.name === name
      ) {
        // Is this not already pinned?
        if (!pinnedElements.find(el => el.type === type && el.name === name)) {
          pinnedElements.push(selectedElement);
          this.setState({pinnedElements});
        }
      }
    } else {
      const pinnedElementsFiltered = pinnedElements.filter(
        el => !(el.type === type && el.name === name),
      );
      if (pinnedElementsFiltered.length < pinnedElements.length) {
        this.setState({pinnedElements: pinnedElementsFiltered});
      }
    }
  };

  toggleExpanded = (type, name, flag) => {
    // Expand or unexpand a node/link/site
    const {selectedElement, pinnedElements} = this.state;

    // Is this the selected element?
    if (
      selectedElement &&
      selectedElement.type === type &&
      selectedElement.name === name
    ) {
      if (selectedElement.expanded !== flag) {
        this.setState({selectedElement: {...selectedElement, expanded: flag}});
      }
    } else {
      // Otherwise, check pinned elements
      let flagChanged = false;
      pinnedElements.forEach(el => {
        if (el.type === type && el.name === name && el.expanded !== flag) {
          el.expanded = flag;
          flagChanged = true;
        }
      });
      if (flagChanged) {
        this.setState({pinnedElements});
      }
    }
  };

  renderReloadingOverlay = () => {
    // Render a semi-transparent overlay that blocks the whole webpage while
    // waiting for a data reload
    const {classes} = this.props;
    const {isReloading} = this.state;

    return (
      <Fade in={isReloading}>
        <div
          className={classes.overlayBox}
          style={{zIndex: isReloading ? 10000 : -1}}>
          <LoadingBox />
        </div>
      </Fade>
    );
  };

  renderRoutes = () => {
    const {classes, match} = this.props;
    const {networkName} = match.params;
    return (
      <div className={classes.content}>
        <NetworkContext.Provider
          value={{
            networkName,
            networkConfig: this.state.networkConfig,
            networkLinkHealth: this.state.networkLinkHealth,
            networkNodeHealth: this.state.networkNodeHealth,
            networkAnalyzerData: this.state.networkAnalyzerData,
            networkLinkMetrics: {
              ignitionAttempts: this.state.networkLinkIgnitionAttempts,
            },

            // Refresh data
            refreshNetworkConfig: this.refreshNetworkConfig,

            // Topology maps
            nodeMap: this.state.nodeMap,
            linkMap: this.state.linkMap,
            siteMap: this.state.siteMap,
            siteToNodesMap: this.state.siteToNodesMap,

            // Topology elements
            selectedElement: this.state.selectedElement,
            pinnedElements: this.state.pinnedElements,
            setSelected: this.setSelected,
            removeElement: this.removeElement,
            togglePin: this.togglePin,
            toggleExpanded: this.toggleExpanded,
            offline_whitelist: this.state.offline_whitelist,
          }}>
          {this.renderReloadingOverlay()}
          <Switch>
            <Route
              path={`/map/:networkName`}
              render={() => (
                <NetworkMap
                  networkName={networkName}
                  networkConfig={this.state.networkConfig}
                />
              )}
            />
            <Route
              path={`/stats/:networkName`}
              render={() =>
                STATS_DS === 'prometheus' ? (
                  <NetworkStatsPrometheus
                    networkConfig={this.state.networkConfig}
                  />
                ) : (
                  <NetworkStatsBeringei
                    networkConfig={this.state.networkConfig}
                  />
                )
              }
            />
            <Route
              path={`/dashboards/:networkName`}
              render={() => <NetworkDashboards networkName={networkName} />}
            />
            <Route
              path={`/logs/:networkName`}
              render={() => <NodeLogs networkName={networkName} />}
            />
            <Route
              path={`/tables/:networkName`}
              render={routeProps => (
                <NetworkTables
                  selectedElement={this.state.selectedElement}
                  {...routeProps}
                />
              )}
            />
            <Route path={`/upgrade/:networkName`} component={NetworkUpgrade} />
            <Route
              path={`/node_config/:networkName`}
              render={() => (
                <NetworkConfig
                  networkName={networkName}
                  networkConfig={this.state.networkConfig}
                />
              )}
            />
            <Route
              path={`/e2e_config/:networkName`}
              render={() => (
                <E2EConfig
                  networkName={networkName}
                  networkConfig={this.state.networkConfig}
                />
              )}
            />
            <Route
              path={'/network_test/:networkName'}
              component={NetworkTest}
            />
            <Redirect to="/config" />
          </Switch>
        </NetworkContext.Provider>
      </div>
    );
  };

  render() {
    return (
      <NetworkListContext.Consumer>
        {this.renderContext}
      </NetworkListContext.Consumer>
    );
  }

  renderContext = context => {
    if (this.state.invalidTopologyRedirect) {
      return <Redirect push to="/" />;
    }

    return context.networkList &&
      this.state.networkConfig &&
      this.state.networkConfig.topology ? (
      this.renderRoutes()
    ) : (
      <LoadingBox />
    );
  };
}

export default withStyles(styles)(withRouter(NetworkUI));
