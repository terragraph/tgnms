/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AuthorizedRoute from './components/common/AuthorizedRoute';
import Fade from '@material-ui/core/Fade';
import LoadingBox from './components/common/LoadingBox';
import NetworkConfig from './views/config/NetworkConfig';
import NetworkContext from './contexts/NetworkContext';
import NetworkDashboards from './views/dashboards/NetworkDashboards';
import NetworkListContext from './contexts/NetworkListContext';
import NetworkMap from './views/map/NetworkMap';
import NetworkTables from './views/tables/NetworkTables';
import NetworkUpgrade from './views/upgrade/NetworkUpgrade';
import NmsAlarms from './views/alarms/NmsAlarms';
import NmsOptionsContext from './contexts/NmsOptionsContext';
import NodeSysdumps from './views/sysdumps/NodeSysdumps';
import React from 'react';
import axios from 'axios';
import {Redirect, Route, Switch} from 'react-router-dom';
import {TopologyElementType} from './constants/NetworkConstants.js';
import {buildTopologyMaps} from './helpers/TopologyHelpers';
import {createQuery, increase} from './apiutils/PrometheusAPIUtil';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';
import type {ContextRouter} from 'react-router-dom';
import type {
  Element,
  LinkMeta,
  MacToNodeMap,
  NetworkNodeStats,
  NodeToLinksMap,
  SiteMap,
} from './contexts/NetworkContext';
import type {NetworkHealth, NetworkState} from '../shared/dto/NetworkState';

import type {LinkType, NodeType as Node} from '../shared/types/Topology';

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

const REFRESH_INTERVAL = 5000;

type Props = {
  classes: {[string]: string},
  ...ContextRouter,
};

type State = {
  invalidTopologyRedirect: boolean,
  isReloading: boolean,
  linkMap: {[string]: LinkType & LinkMeta},
  macToNodeMap: MacToNodeMap,
  nodeToLinksMap: NodeToLinksMap,
  networkConfig: NetworkState,
  networkNodeHealth: NetworkHealth,
  networkNodeHealthPrometheus: NetworkNodeStats,
  networkLinkHealth: NetworkHealth,
  networkAnalyzerData: Object,
  networkLinkIgnitionAttempts: Object,
  networkHealthTimeWindowHrs: number,
  nodeMap: {[string]: Node},
  nodeToLinksMap: {[string]: Set<string>},
  pinnedElements: Array<Element>,
  siteMap: SiteMap,
  siteToNodesMap: {[string]: Set<string>},
  selectedElement: ?Element,
};

class NetworkUI extends React.Component<Props, State> {
  state = {
    // Used to trigger a redirect when the network is invalid
    invalidTopologyRedirect: false,

    // Selected network
    networkConfig: ({}: $Shape<NetworkState>),
    isReloading: false,

    // Topology maps
    nodeMap: {},
    nodeToLinksMap: {},
    linkMap: {},
    siteMap: {},
    siteToNodesMap: {},
    nodeToLinksMap: {},
    macToNodeMap: {},

    // Topology elements
    // {type: TopologyElementType, name: string, expanded: bool}
    selectedElement: null,
    pinnedElements: [],

    // Network health stats
    networkNodeHealth: {},
    networkNodeHealthPrometheus: {},
    networkLinkHealth: {},
    networkAnalyzerData: {},
    networkLinkIgnitionAttempts: {},

    // Availability time window
    networkHealthTimeWindowHrs: 24,
  };

  _refreshNetworkInterval = null;

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

  componentDidUpdate(prevProps: Props, prevState: State) {
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
      this.clearNetworkConfig();
    }
    // check if availability time window changed
    if (
      prevState.networkHealthTimeWindowHrs !==
        this.state.networkHealthTimeWindowHrs &&
      networkName
    ) {
      this.updateNetworkHealth(
        networkName,
        this.state.networkHealthTimeWindowHrs,
      );
    }
  }

  clearNetworkConfig() {
    this.setState({
      networkConfig: ({}: $Shape<NetworkState>),
      isReloading: false,
      nodeMap: {},
      linkMap: {},
      siteMap: {},
      siteToNodesMap: {},
      selectedElement: null,
      pinnedElements: [],
      networkNodeHealth: ({}: NetworkHealth),
      networkNodeHealthPrometheus: ({}: NetworkNodeStats),
      networkLinkHealth: ({}: NetworkHealth),
      networkAnalyzerData: {},
      // fetched metrics to display
      networkLinkIgnitionAttempts: {},
    });
    // fetch new network
    this.getCurrentNetworkStatus();
    // reset topology fetch timer and re-schedule topology get
    this.getCurrentNetworkStatusPeriodic();
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
        if (this.state.invalidTopologyRedirect) {
          this.setState({
            invalidTopologyRedirect: false,
          });
        }
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

    axios
      .get('/metrics/query/link/latest', {
        params: {
          query: increase(
            createQuery('link_attempts', {
              topologyName: networkName,
              intervalSec: 30,
            }),
            '1d',
          ),
          topologyName: networkName,
        },
      })
      .then(linkMetricsResp => {
        this.setState({networkLinkIgnitionAttempts: linkMetricsResp.data});
      })
      .catch(err => {
        console.error('Unable to fetch link ignition attempts:', err);
      });
  };

  processNetworkConfig = (networkConfig, networkName) => {
    // Update state with new network config
    const topologyMaps = buildTopologyMaps(networkConfig.topology);
    const topologyState = this.cleanTopologyState(topologyMaps);
    this.setState({
      networkConfig,
      isReloading: false,
      ...topologyMaps,
      ...topologyState,
    });

    // Refresh network health
    this.updateNetworkHealth(
      networkName,
      this.state.networkHealthTimeWindowHrs,
    );
    this.updateNetworkAnalyzer(networkName);
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

  updateNetworkHealth = (networkName: string, timeWindowHours: number) => {
    // Refresh network node/link health
    axios
      .get(`/topology/link_health/${networkName}/${timeWindowHours}`)
      .then(response => {
        this.setState({networkLinkHealth: response.data || {}});
      });

    axios.get(`/metrics/node_health/${networkName}`).then(response => {
      this.setState({networkNodeHealthPrometheus: response.data || {}});
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

  setAvailabilityWindow = networkHealthTimeWindowHrs => {
    this.setState({
      networkHealthTimeWindowHrs,
      networkLinkHealth: ({}: NetworkHealth),
    });
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
    const networkName = match.params.networkName
      ? match.params.networkName
      : '';
    return (
      <div className={classes.content}>
        <NetworkContext.Provider
          value={{
            networkName,
            networkConfig: this.state.networkConfig,
            networkHealthTimeWindowHrs: this.state.networkHealthTimeWindowHrs,
            networkLinkHealth: this.state.networkLinkHealth,
            networkNodeHealth: this.state.networkNodeHealth,
            networkNodeHealthPrometheus: this.state.networkNodeHealthPrometheus,
            networkAnalyzerData: this.state.networkAnalyzerData,
            networkLinkMetrics: {
              ignitionAttempts: this.state.networkLinkIgnitionAttempts,
            },

            // Refresh data
            refreshNetworkConfig: this.refreshNetworkConfig,

            // Topology maps
            nodeMap: this.state.nodeMap,
            nodeToLinksMap: this.state.nodeToLinksMap,
            linkMap: this.state.linkMap,
            siteMap: this.state.siteMap,
            siteToNodesMap: this.state.siteToNodesMap,
            nodeToLinksMap: this.state.nodeToLinksMap,
            macToNodeMap: this.state.macToNodeMap,

            // Topology elements
            selectedElement: this.state.selectedElement,
            pinnedElements: this.state.pinnedElements,
            setSelected: this.setSelected,
            removeElement: this.removeElement,
            togglePin: this.togglePin,
            toggleExpanded: this.toggleExpanded,
            setAvailabilityWindow: this.setAvailabilityWindow,
          }}>
          {this.renderReloadingOverlay()}
          <Switch>
            <Route
              path={`/map/:networkName`}
              render={() => (
                <NmsOptionsContext.Consumer>
                  {nmsOptionsContext => (
                    <NetworkMap
                      networkName={networkName}
                      networkConfig={this.state.networkConfig}
                      siteToNodesMap={this.state.siteToNodesMap}
                      networkMapOptions={nmsOptionsContext.networkMapOptions}
                      updateNetworkMapOptions={
                        nmsOptionsContext.updateNetworkMapOptions
                      }
                    />
                  )}
                </NmsOptionsContext.Consumer>
              )}
            />
            )}
            <Route
              path={`/dashboards/:networkName`}
              render={() => <NetworkDashboards networkName={networkName} />}
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
            <Route
              path={`/alarms/:networkName/:tabName?`}
              render={() => <NmsAlarms networkName={networkName} />}
            />
            <AuthorizedRoute
              permissions={['UPGRADE_READ', 'UPGRADE_WRITE']}
              path={`/upgrade/:networkName`}
              component={NetworkUpgrade}
            />
            <AuthorizedRoute
              permissions={['CONFIG_READ', 'CONFIG_WRITE']}
              path={`/network_config/:networkName`}
              render={() => (
                <NetworkConfig
                  networkName={networkName}
                  networkConfig={this.state.networkConfig}
                />
              )}
            />
            <Route path={'/sysdumps/:networkName'} component={NodeSysdumps} />
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
      return (
        <LoadingBox text="Error connecting to network. Attempting to reconnect." />
      );
    } else {
      return context.networkList &&
        this.state.networkConfig &&
        this.state.networkConfig.topology ? (
        this.renderRoutes()
      ) : (
        <LoadingBox />
      );
    }
  };
}

export default withStyles(styles)(withRouter(NetworkUI));
