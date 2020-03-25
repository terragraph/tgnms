/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AccessPointsPanel from '../../components/mappanels/AccessPointsPanel';
import DefaultRouteHistoryPanel from '../../components/mappanels/DefaultRouteHistoryPanel';
import Dragger from '../../components/common/Dragger';
import Drawer from '@material-ui/core/Drawer';
import DrawerToggleButton from '../../components/common/DrawerToggleButton';
import IgnitionStatePanel from '../../components/mappanels/IgnitionStatePanel';
import LinkDetailsPanel from '../../components/mappanels/LinkDetailsPanel';
import MapLayersPanel from '../../components/mappanels/MapLayersPanel';
import NodeDetailsPanel from '../../components/mappanels/NodeDetailsPanel/NodeDetailsPanel';
import OverviewPanel from '../../components/mappanels/OverviewPanel';
import SearchNearbyPanel from '../../components/mappanels/SearchNearbyPanel';
import SiteDetailsPanel from '../../components/mappanels/SiteDetailsPanel';
import Slide from '@material-ui/core/Slide';
import SpeedTestPanel from '../../components/mappanels/SpeedTestPanel';
import TestExecutionPanel from '../../components/mappanels/TestExecutionPanel';
import TopologyBuilderMenu from './TopologyBuilderMenu';
import UpgradeProgressPanel from '../../components/mappanels/UpgradeProgressPanel';
import mapboxgl from 'mapbox-gl';
import {SlideProps, TopologyElement} from '../../constants/MapPanelConstants';
import {SnackbarProvider} from 'notistack';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {UpgradeReqTypeValueMap as UpgradeReqType} from '../../../shared/types/Controller';
import {get} from 'lodash';
import {withStyles, withTheme} from '@material-ui/core/styles';

import type {
  EditLinkParams,
  EditNodeParams,
  NearbyNodes,
  PlannedSiteProps,
  Routes,
} from '../../components/mappanels/MapPanelTypes';
import type {Element, NetworkContextType} from '../../contexts/NetworkContext';
import type {Props as MapLayersProps} from '../../components/mappanels/MapLayersPanel';
import type {SiteType} from '../../../shared/types/Topology';
import type {Theme, WithStyles} from '@material-ui/core';

export const NetworkDrawerConstants = {
  DRAWER_MIN_WIDTH: 330,
  DRAWER_MAX_WIDTH: 800,
};

const styles = theme => ({
  appBarSpacer: theme.mixins.toolbar,
  content: {
    height: '100%',
    padding: theme.spacing(2),
    overflowX: 'hidden',
  },
  draggerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  drawerPaper: {
    width: 'inherit',
    height: 'inherit',
  },
});

type Props = {
  context: NetworkContextType,
  speedTestId: ?string,
  networkTestId: ?string,
  onNetworkTestPanelClosed: () => any,
  mapRef: ?mapboxgl.Map,
  plannedSiteProps: PlannedSiteProps,
  routesProps: Routes,
  searchNearbyProps: {|
    nearbyNodes: NearbyNodes,
    onUpdateNearbyNodes: NearbyNodes => any,
  |},
  mapLayersProps: MapLayersProps,
  onNetworkDrawerResize: number => any,
  networkDrawerWidth: number,
};

type State = {
  // Panels
  // -> expanded?
  overviewPanelExpanded: boolean,
  mapLayersPanelExpanded: boolean,
  ignitionStatePanelExpanded: boolean,
  accessPointsPanelExpanded: boolean,
  upgradeProgressPanelExpanded: boolean,
  // -> visible?
  showIgnitionStatePanel: boolean,
  showAccessPointsPanel: boolean,
  // -> closing?
  closingNodes: {},
  closingLinks: {},
  closingSites: {},
  closingSearchNearby: {},
  closingDefaultRoute: {},

  // Topology details
  topologyParams: ?$Shape<EditNodeParams> | EditLinkParams | $Shape<SiteType>,
  editTopologyElement: ?boolean,
  addTopologyElementType: ?$Values<typeof TopologyElement>,
  topologyPanelExpanded: boolean,
  //show or hide drawer
  drawerOpen: boolean,
};

class NetworkDrawer extends React.Component<
  Props & WithStyles<typeof styles> & {theme: Theme},
  State,
> {
  constructor(props) {
    super(props);

    this.state = {
      // Panels
      // -> expanded?
      overviewPanelExpanded: !(
        props.context.selectedElement || props.context.pinnedElements.length
      ),
      mapLayersPanelExpanded: false,
      ignitionStatePanelExpanded: false,
      accessPointsPanelExpanded: false,
      upgradeProgressPanelExpanded: true,
      // -> visible?
      showIgnitionStatePanel: false,
      showAccessPointsPanel: false,
      // -> closing?
      closingNodes: {},
      closingLinks: {},
      closingSites: {},
      closingSearchNearby: {},
      closingDefaultRoute: {},

      // Topology details
      topologyParams: null,
      editTopologyElement: null,
      addTopologyElementType: null,
      topologyPanelExpanded: false,
      drawerOpen: true,
    };
  }

  componentDidUpdate(prevProps: Props) {
    const {selectedElement, pinnedElements} = this.props.context;
    const {
      overviewPanelExpanded,
      mapLayersPanelExpanded,
      ignitionStatePanelExpanded,
      accessPointsPanelExpanded,
      upgradeProgressPanelExpanded,
      topologyPanelExpanded,
    } = this.state;

    // Expand or unexpand panels based on changes to context
    if (
      this.props.context.selectedElement &&
      this.props.context.selectedElement != prevProps.context.selectedElement
    ) {
      // If the selected element changed, unexpand all other panels
      this.setUnexpandPanelsState();
    } else {
      // If there are no more selected/pinned elements and nothing is expanded,
      // expand the "Overview" panel
      const hasTopologyElements = selectedElement || pinnedElements.length;
      const prevHadTopologyElements =
        prevProps.context.selectedElement ||
        prevProps.context.pinnedElements.length;
      if (!hasTopologyElements && prevHadTopologyElements) {
        const isAnyPanelExpanded =
          overviewPanelExpanded ||
          mapLayersPanelExpanded ||
          ignitionStatePanelExpanded ||
          accessPointsPanelExpanded ||
          upgradeProgressPanelExpanded ||
          topologyPanelExpanded;

        this.isSpeedTestMode();
        if (!isAnyPanelExpanded) {
          this.handleoverViewPanelExpand();
        }
      }
    }
  }

  handleoverViewPanelExpand() {
    this.setState({
      overviewPanelExpanded: true,
    });
  }

  handleHorizontalResize = width => {
    this.props.onNetworkDrawerResize(width);
    // Force map to resize
    window.dispatchEvent(new Event('resize'));
  };

  onClosePanel(name, type, stateKey) {
    // Close a topology element panel
    const {context, searchNearbyProps, routesProps, theme} = this.props;
    const closingMap = this.state[stateKey];
    if (closingMap.hasOwnProperty(name)) {
      return;
    }

    // Actually close after a delay (to show the sliding-out animation)
    closingMap[name] = setTimeout(() => {
      const closingMap = this.state[stateKey];
      delete closingMap[name];
      // $FlowFixMe Set state for each field
      this.setState({[stateKey]: closingMap});

      // Perform the real action
      if (type === 'search_nearby') {
        // Remove the "Search Nearby" panel
        const {nearbyNodes, onUpdateNearbyNodes} = searchNearbyProps;
        delete nearbyNodes[name];
        onUpdateNearbyNodes(nearbyNodes);
      } else if (type === 'show_route') {
        // Remove the "Show route" panel
        const {onUpdateRoutes} = routesProps;
        onUpdateRoutes({
          node: null,
          links: {},
          nodes: new Set(),
        });
      } else {
        // Close the element in the context
        context.removeElement(type, name);
      }
    }, theme.transitions.duration.leavingScreen + 100 /* to be safe */);
    // $FlowFixMe Set state for each field
    this.setState({[stateKey]: closingMap});
  }

  isTestMode = () => {
    return (
      typeof this.props.networkTestId === 'string' &&
      this.props.networkTestId.trim() !== ''
    );
  };

  isSpeedTestMode = () => {
    return typeof this.props.speedTestId === 'string';
  };

  getUnexpandPanelsState() {
    return {
      overviewPanelExpanded: false,
      mapLayersPanelExpanded: false,
      ignitionStatePanelExpanded: false,
      accessPointsPanelExpanded: false,
      upgradeProgressPanelExpanded: false,
      topologyParams: null,
      editTopologyElement: null,
      addTopologyElementType: null,
      topologyPanelExpanded: false,
    };
  }

  setUnexpandPanelsState() {
    this.setState(this.getUnexpandPanelsState());
  }

  onEditTopology = (params, topologyElement) => {
    this.setState({
      ...this.getUnexpandPanelsState(),
      topologyParams: params,
      editTopologyElement: true,
      addTopologyElementType: topologyElement,
    });
  };

  onAddTopology = (params, topologyElement) => {
    this.setState({
      ...this.getUnexpandPanelsState(),
      topologyParams: params,
      addTopologyElementType: topologyElement,
    });
  };

  renderTopologyElement({type, name, expanded}, SlideProps) {
    // Render a topology element panel
    const {context, searchNearbyProps, routesProps} = this.props;
    const {networkConfig, pinnedElements} = context;
    const {
      controller_version,
      ignition_state,
      status_dump,
      topology,
      wireless_controller_stats,
    } = networkConfig;
    const {
      networkName,
      networkNodeHealth,
      networkLinkHealth,
      networkLinkMetrics,
      nodeMap,
      linkMap,
      siteMap,
      siteToNodesMap,
    } = context;
    const pinned = !!pinnedElements.find(
      el => el.type === type && el.name === name,
    );

    if (type === TopologyElementType.NODE) {
      const node = nodeMap[name];
      // hack to get around issues with flow
      const {node: _, ...routesPropsWithoutNode} = routesProps;
      return (
        <Slide
          {...SlideProps}
          key={name}
          in={!this.state.closingNodes.hasOwnProperty(name)}>
          <NodeDetailsPanel
            expanded={expanded}
            onPanelChange={() => context.toggleExpanded(type, name, !expanded)}
            networkName={networkName}
            nodeDetailsProps={{
              ctrlVersion: controller_version,
              node: node,
              statusReport: node
                ? status_dump.statusReports[node.mac_addr]
                : null,
              networkNodeHealth: networkNodeHealth,
              networkConfig: networkConfig,
              onSelectLink: linkName =>
                context.setSelected(TopologyElementType.LINK, linkName),
              onSelectSite: siteName =>
                context.setSelected(TopologyElementType.SITE, siteName),
              topology: topology,
            }}
            onClose={() => this.onClosePanel(name, type, 'closingNodes')}
            pinned={pinned}
            onPin={() => context.togglePin(type, name, !pinned)}
            onEdit={params => this.onEditTopology(params, TopologyElement.node)}
            {...searchNearbyProps}
            {...routesPropsWithoutNode}
            node={node}
          />
        </Slide>
      );
    } else if (type === TopologyElementType.LINK) {
      const link = linkMap[name];
      return (
        <Slide
          {...SlideProps}
          key={name}
          in={!this.state.closingLinks.hasOwnProperty(name)}>
          <LinkDetailsPanel
            expanded={expanded}
            onPanelChange={() => context.toggleExpanded(type, name, !expanded)}
            networkName={networkName}
            link={link}
            nodeMap={nodeMap}
            networkLinkHealth={networkLinkHealth}
            networkLinkMetrics={networkLinkMetrics}
            networkConfig={networkConfig}
            ignitionEnabled={
              !(
                ignition_state &&
                ignition_state.igParams.linkAutoIgnite[name] === false
              )
            }
            onClose={() => {
              this.onClosePanel(name, type, 'closingLinks');
            }}
            onSelectNode={nodeName =>
              context.setSelected(TopologyElementType.NODE, nodeName)
            }
            pinned={pinned}
            onPin={() => context.togglePin(type, name, !pinned)}
          />
        </Slide>
      );
    } else if (type === TopologyElementType.SITE) {
      const site = siteMap[name];
      const wapStats = get(
        wireless_controller_stats,
        [name.toLowerCase()],
        null,
      );
      return (
        <Slide
          {...SlideProps}
          key={name}
          in={!this.state.closingSites.hasOwnProperty(name)}>
          <SiteDetailsPanel
            expanded={expanded}
            onPanelChange={() => context.toggleExpanded(type, name, !expanded)}
            networkName={networkName}
            topology={topology}
            site={site}
            siteMap={siteMap}
            siteNodes={siteToNodesMap[name] || new Set()}
            nodeMap={nodeMap}
            networkLinkHealth={networkLinkHealth}
            wapStats={wapStats}
            onClose={() => this.onClosePanel(name, type, 'closingSites')}
            onSelectNode={nodeName =>
              context.setSelected(TopologyElementType.NODE, nodeName)
            }
            pinned={pinned}
            onPin={() => context.togglePin(type, name, !pinned)}
            onEdit={params =>
              this.onEditTopology(
                {name: params.name, location: {...params}},
                TopologyElement.site,
              )
            }
            onUpdateRoutes={routesProps.onUpdateRoutes}
          />
        </Slide>
      );
    }
    return null;
  }

  renderDefaultRouteHistoryPanel(nodeName, SlideProps) {
    const {context, routesProps} = this.props;
    const {topology} = context.networkConfig;
    const {networkName, nodeMap, siteMap, siteToNodesMap} = context;
    const node = nodeMap[nodeName];
    return (
      <Slide
        {...SlideProps}
        key={node.site_name}
        in={!this.state.closingDefaultRoute.hasOwnProperty(node.site_name)}>
        <DefaultRouteHistoryPanel
          networkName={networkName}
          topology={topology}
          node={node}
          nodeMap={nodeMap}
          site={siteMap[node.site_name]}
          onClose={() =>
            this.onClosePanel(
              node.site_name,
              'show_route',
              'closingDefaultRoute',
            )
          }
          routes={routesProps}
          siteNodes={siteToNodesMap[node.site_name]}
        />
      </Slide>
    );
  }

  renderSearchNearby(nodeName, SlideProps) {
    // Render a "Search Nearby" panel
    const {context, searchNearbyProps} = this.props;
    const {topology} = context.networkConfig;
    const {networkName, nodeMap, siteMap} = context;
    const node = nodeMap[nodeName];

    return (
      <Slide
        {...SlideProps}
        key={nodeName}
        in={!this.state.closingSearchNearby.hasOwnProperty(nodeName)}>
        <SearchNearbyPanel
          networkName={networkName}
          topology={topology}
          node={node}
          site={siteMap[node.site_name]}
          onClose={() =>
            this.onClosePanel(nodeName, 'search_nearby', 'closingSearchNearby')
          }
          onAddNode={params => this.onAddTopology(params, TopologyElement.node)}
          onAddLink={params => this.onAddTopology(params, TopologyElement.link)}
          onAddSite={params => this.onAddTopology(params, TopologyElement.site)}
          {...searchNearbyProps}
        />
      </Slide>
    );
  }

  updateTopologyPanelExpanded = topologyPanelExpanded => {
    this.setState({...this.getUnexpandPanelsState(), topologyPanelExpanded});
  };

  onDrawerToggle = () => {
    const {drawerOpen} = this.state;
    const {theme, onNetworkDrawerResize} = this.props;
    const newWidth = drawerOpen ? 0 : NetworkDrawerConstants.DRAWER_MIN_WIDTH;
    onNetworkDrawerResize(newWidth);
    this.setState({drawerOpen: !drawerOpen}, () => {
      // Figure out duration of animation
      let duration = theme.transitions.duration.enteringScreen;
      if (drawerOpen) {
        duration = theme.transitions.duration.leavingScreen;
      }

      // Add a some buffer to the duration in case it misses an edge
      duration += 20;
      const startTime = new Date().getTime();
      const interval = setInterval(() => {
        // Clear the interval after
        if (new Date().getTime() - startTime > duration) {
          clearInterval(interval);
          return;
        }
        window.dispatchEvent(new Event('resize'));
      }, 10 /* 100 fps, should be good */);
    });
  };

  render() {
    const {
      classes,
      context,
      mapLayersProps,
      plannedSiteProps,
      searchNearbyProps,
      routesProps,
      mapRef,
      networkDrawerWidth,
    } = this.props;
    const {
      networkName,
      nodeMap,
      networkLinkHealth,
      selectedElement,
      pinnedElements,
    } = context;
    const {
      topology,
      ignition_state,
      status_dump,
      upgrade_state,
      wireless_controller,
      wireless_controller_stats,
    } = context.networkConfig;
    const {
      overviewPanelExpanded,
      mapLayersPanelExpanded,
      ignitionStatePanelExpanded,
      accessPointsPanelExpanded,
      upgradeProgressPanelExpanded,
      topologyParams,
      editTopologyElement,
      addTopologyElementType,
      drawerOpen,
    } = this.state;

    const drawerDimensions = {
      width: networkDrawerWidth,
      height: '100%',
    };

    // Build list of topology elements
    const topologyElements: Array<Element> = [];
    if (selectedElement) {
      topologyElements.push(selectedElement);
    }
    pinnedElements
      .filter(
        el =>
          !(
            selectedElement &&
            el.type === selectedElement.type &&
            el.name === selectedElement.name
          ),
      )
      .forEach(el => topologyElements.push(el));

    // Is an upgrade ongoing?
    // TODO - Support FULL_UPGRADE
    const upgradeReq = upgrade_state.curReq.urReq;
    const showUpgradeProgressPanel =
      upgradeReq.upgradeReqId &&
      (upgradeReq.urType === UpgradeReqType.PREPARE_UPGRADE ||
        upgradeReq.urType === UpgradeReqType.COMMIT_UPGRADE);

    return (
      <Drawer
        variant="permanent"
        classes={{paper: classes.drawerPaper}}
        style={drawerDimensions}
        anchor="right">
        <div className={classes.appBarSpacer} />
        <div className={classes.draggerContainer}>
          <Dragger
            direction="horizontal"
            minSize={NetworkDrawerConstants.DRAWER_MIN_WIDTH}
            maxSize={NetworkDrawerConstants.DRAWER_MAX_WIDTH}
            onResize={this.handleHorizontalResize}
          />
        </div>

        <div className={classes.content}>
          {showUpgradeProgressPanel ? (
            <UpgradeProgressPanel
              expanded={upgradeProgressPanelExpanded}
              onPanelChange={() =>
                this.setState({
                  upgradeProgressPanelExpanded: !upgradeProgressPanelExpanded,
                })
              }
              topology={topology}
              nodeMap={nodeMap}
              upgradeStateDump={upgrade_state}
              statusReports={status_dump.statusReports}
            />
          ) : null}
          {!this.isTestMode() && (
            <OverviewPanel
              expanded={overviewPanelExpanded}
              onPanelChange={() =>
                this.setState({overviewPanelExpanded: !overviewPanelExpanded})
              }
              networkConfig={context.networkConfig}
              networkLinkHealth={networkLinkHealth}
              onViewIgnitionState={() =>
                this.setState({
                  overviewPanelExpanded: false,
                  showIgnitionStatePanel: true,
                  ignitionStatePanelExpanded: true,
                })
              }
              onViewAccessPointList={() =>
                this.setState({
                  overviewPanelExpanded: false,
                  showAccessPointsPanel: true,
                  accessPointsPanelExpanded: true,
                })
              }
            />
          )}

          {this.isTestMode() && (
            <TestExecutionPanel
              expanded={true}
              testId={this.props.networkTestId}
              selectedElement={selectedElement}
              onClose={this.props.onNetworkTestPanelClosed}
            />
          )}
          {this.isSpeedTestMode() && (
            <SpeedTestPanel
              selectedElement={selectedElement}
              expanded={this.isSpeedTestMode()}
              testId={this.props.speedTestId}
            />
          )}

          <MapLayersPanel
            {...mapLayersProps}
            networkName={networkName}
            expanded={mapLayersPanelExpanded}
            onPanelChange={() =>
              this.setState({mapLayersPanelExpanded: !mapLayersPanelExpanded})
            }
          />
          <Slide
            {...SlideProps}
            unmountOnExit
            in={this.state.showIgnitionStatePanel}>
            <IgnitionStatePanel
              expanded={ignitionStatePanelExpanded}
              onPanelChange={() =>
                this.setState({
                  ignitionStatePanelExpanded: !ignitionStatePanelExpanded,
                })
              }
              onClose={() => this.setState({showIgnitionStatePanel: false})}
              networkName={networkName}
              ignitionState={ignition_state}
              refreshNetworkConfig={context.refreshNetworkConfig}
            />
          </Slide>
          <Slide
            {...SlideProps}
            unmountOnExit
            in={this.state.showAccessPointsPanel}>
            <AccessPointsPanel
              expanded={accessPointsPanelExpanded}
              onPanelChange={() =>
                this.setState({
                  accessPointsPanelExpanded: !accessPointsPanelExpanded,
                })
              }
              onClose={() => this.setState({showAccessPointsPanel: false})}
              onSelectSite={siteName =>
                context.setSelected(TopologyElementType.SITE, siteName)
              }
              topology={topology}
              wirelessController={wireless_controller}
              wirelessControllerStats={wireless_controller_stats}
            />
          </Slide>

          {Object.keys(searchNearbyProps.nearbyNodes).map(txNode =>
            this.renderSearchNearby(txNode, SlideProps),
          )}

          {routesProps.node
            ? this.renderDefaultRouteHistoryPanel(routesProps.node, SlideProps)
            : null}

          {topologyElements.map(el =>
            this.renderTopologyElement(el, SlideProps),
          )}
          <SnackbarProvider
            maxSnack={3}
            autoHideDuration={10000}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}>
            <TopologyBuilderMenu
              plannedSiteProps={plannedSiteProps}
              editTopologyElement={editTopologyElement}
              addTopologyElementType={addTopologyElementType}
              params={topologyParams}
              mapRef={mapRef}
              updateTopologyPanelExpanded={this.updateTopologyPanelExpanded}
            />
          </SnackbarProvider>
          <DrawerToggleButton
            drawerWidth={networkDrawerWidth}
            drawerOpen={drawerOpen}
            onDrawerToggle={this.onDrawerToggle}
          />
        </div>
      </Drawer>
    );
  }
}

export default withTheme(withStyles(styles, {withTheme: true})(NetworkDrawer));
