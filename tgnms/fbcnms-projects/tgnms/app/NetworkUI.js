/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as hardwareProfilesApi from '@fbcnms/tg-nms/app/apiutils/HardwareProfilesAPIUtil';
import * as prometheusApi from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import * as topologyApi from '@fbcnms/tg-nms/app/apiutils/TopologyAPIUtil';
import AuthorizedRoute from './components/common/AuthorizedRoute';
import Fade from '@material-ui/core/Fade';
import LoadingBox from './components/common/LoadingBox';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import React from 'react';
import {HAPeerType} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import {NETWORK_VIEWS} from '@fbcnms/tg-nms/app/views/views';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {Redirect, Route, Switch} from 'react-router-dom';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  createQuery,
  increase,
} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import {isEqual} from 'lodash';
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
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {HardwareProfiles} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';
import type {
  NetworkAnalyzerData,
  NetworkHealth,
  NetworkState,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';

import type {
  LinkType,
  NodeType as Node,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';

const styles = _theme => ({
  content: {
    flex: '1 1 auto',
    flexFlow: 'column',
    display: 'flex',
    overflow: 'hidden',
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

const NETWORK_UI_STATUS = {
  OK: 'OK',
  // nodejs Backend is likely down
  NETWORKING_ERROR: 'NETWORKING_ERROR',
  // topology doesn't exist, redirect to the config page
  TOPOLOGY_NOT_FOUND: 'TOPOLOGY_NOT_FOUND',
  // the api-service container is not responding
  CONTROLLER_OFFLINE: 'CONTROLLER_OFFLINE',
};
const REFRESH_INTERVAL = 5000;

type Props = {
  classes: {[string]: string},
  ...ContextRouter,
};

type State = {
  status: $Keys<typeof NETWORK_UI_STATUS>,
  isReloading: boolean,
  linkMap: {[string]: LinkType & LinkMeta},
  macToNodeMap: MacToNodeMap,
  nodeToLinksMap: NodeToLinksMap,
  networkConfig: NetworkState,
  networkNodeHealthPrometheus: NetworkNodeStats,
  networkLinkHealth: NetworkHealth,
  networkAnalyzerData: NetworkAnalyzerData,
  networkLinkIgnitionAttempts: Object,
  networkHealthTimeWindowHrs: number,
  nodeMap: {[string]: Node},
  nodeToLinksMap: {[string]: Set<string>},
  pinnedElements: Array<Element>,
  siteMap: SiteMap,
  siteToNodesMap: {[string]: Set<string>},
  selectedElement: ?Element,
  hardwareProfiles: HardwareProfiles,
};

class NetworkUI extends React.PureComponent<Props, State> {
  state = {
    // Used to trigger a redirect when the network is invalid
    status: NETWORK_UI_STATUS.OK,

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
    // {type: TOPOLOGY_ELEMENT, name: string, expanded: bool}
    selectedElement: null,
    pinnedElements: [],

    // Network health stats
    networkNodeHealthPrometheus: {},
    networkLinkHealth: {},
    networkAnalyzerData: {},
    networkLinkIgnitionAttempts: {},

    // Availability time window
    networkHealthTimeWindowHrs: 24,
    hardwareProfiles: {},
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
    this.getHardwareProfiles();
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
    topologyApi
      .getTopology(networkName)
      .then(topology => {
        if (topology?.active?.active === HAPeerType.ERROR) {
          return this.setState({
            status: NETWORK_UI_STATUS.CONTROLLER_OFFLINE,
          });
        }
        this.setState({
          status: NETWORK_UI_STATUS.OK,
        });
        this.processNetworkConfig(topology, networkName);
      })
      .catch(error => {
        console.error(error);
        if (!error.response) {
          return this.setState({
            status: NETWORK_UI_STATUS.NETWORKING_ERROR,
          });
        }
        if (error.response.status === 404) {
          // invalid topology, redirect to /
          this.setState({
            status: NETWORK_UI_STATUS.TOPOLOGY_NOT_FOUND,
            isReloading: false,
          });
        }
      });

    prometheusApi
      .queryLatestGroupByLink(
        networkName,
        increase(
          createQuery('topology_link_attempts', {
            network: networkName,
          }),
          '1d',
        ),
      )
      .then(linkMetricsData => {
        this.setState({networkLinkIgnitionAttempts: linkMetricsData});
      })
      .catch(err => {
        console.error('Unable to fetch link ignition attempts:', err);
      });
  };

  processNetworkConfig = (networkConfig, networkName) => {
    // Update state with new network config
    const topologyMaps =
      networkConfig.topology != null
        ? buildTopologyMaps(networkConfig.topology)
        : {};
    const topologyState =
      topologyMaps != null ? this.cleanTopologyState(topologyMaps) : null;

    this.setState({isReloading: false});
    if (!isEqual(this.state.networkConfig, networkConfig)) {
      this.setState({
        networkConfig,
        ...(topologyMaps: $Shape<
          $Call<typeof buildTopologyMaps, TopologyType>,
        >),
        ...(topologyState ?? {}),
      });
    }

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
    if (type === TOPOLOGY_ELEMENT.NODE) {
      return nodeMap.hasOwnProperty(name);
    } else if (type === TOPOLOGY_ELEMENT.LINK) {
      return linkMap.hasOwnProperty(name);
    } else if (type === TOPOLOGY_ELEMENT.SITE) {
      return siteMap.hasOwnProperty(name);
    }
    return false;
  };

  updateNetworkHealth = (networkName: string, timeWindowHours: number) => {
    // Refresh network node/link health
    topologyApi.getHealth({networkName, timeWindowHours}).then(health => {
      this.setState({networkLinkHealth: health || {}});
    });
    prometheusApi
      .getNodeHealth({networkName})
      .then(health =>
        this.setState({networkNodeHealthPrometheus: health || {}}),
      );
  };

  updateNetworkAnalyzer = networkName => {
    // Refresh network analyzer data
    prometheusApi
      .getLinkAnalyzer({networkName})
      .then(data => this.setState({networkAnalyzerData: data}));
  };

  getHardwareProfiles = async () => {
    try {
      const hardwareProfiles = await hardwareProfilesApi.getAllProfiles();
      this.setState({hardwareProfiles});
    } catch (err) {
      console.error(err.message);
    }
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
            hardwareProfiles: this.state.hardwareProfiles,
          }}>
          <NetworkPlanningContextProvider>
            {this.renderReloadingOverlay()}
            <Switch>
              {NETWORK_VIEWS.map(view =>
                view.permissions ? (
                  <AuthorizedRoute
                    key={view.path}
                    path={view.path}
                    component={view.component}
                    permissions={view.permissions}
                  />
                ) : (
                  <Route
                    key={view.path}
                    path={view.path}
                    component={view.component}
                  />
                ),
              )}
              <Redirect to="/config" />
            </Switch>
          </NetworkPlanningContextProvider>
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
    if (this.state.status === NETWORK_UI_STATUS.TOPOLOGY_NOT_FOUND) {
      return <Redirect to="/config" />;
    }
    if (this.state.status !== NETWORK_UI_STATUS.OK) {
      let errorText = 'Error... Attempting to reconnect.';
      switch (this.state.status) {
        case NETWORK_UI_STATUS.NETWORKING_ERROR:
          errorText = 'NMS backend offline. Attempting to reconnect.';
          break;
        case NETWORK_UI_STATUS.CONTROLLER_OFFLINE:
          errorText = `The controller for this network is offline. Attempting to reconnect.`;
          break;
      }
      return <LoadingBox text={errorText} data-testid="loading-error" />;
    }
    if (
      context.networkList &&
      this.state.networkConfig &&
      this.state.networkConfig.topology
    ) {
      return this.renderRoutes();
    }
    return <LoadingBox data-testid="loading-network" />;
  };
}

export default withStyles(styles)(withRouter(NetworkUI));
