/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import AccessPointsPanel from '../../components/mappanels/AccessPointsPanel';
import AddIcon from '@material-ui/icons/Add';
import AddLinkPanel from '../../components/mappanels/AddLinkPanel';
import AddNodePanel from '../../components/mappanels/AddNodePanel';
import AddSitePanel from '../../components/mappanels/AddSitePanel';
import Dragger from '../../components/common/Dragger';
import Drawer from '@material-ui/core/Drawer';
import Fab from '@material-ui/core/Fab';
import IgnitionStatePanel from '../../components/mappanels/IgnitionStatePanel';
import LinkDetailsPanel from '../../components/mappanels/LinkDetailsPanel';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MapLayersPanel from '../../components/mappanels/MapLayersPanel';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NodeDetailsPanel from '../../components/mappanels/NodeDetailsPanel';
import OverviewPanel from '../../components/mappanels/OverviewPanel';
import PropTypes from 'prop-types';
import React from 'react';
import SearchNearbyPanel from '../../components/mappanels/SearchNearbyPanel';
import ShowRoutePanel from '../../components/mappanels/ShowRoutePanel';
import SiteDetailsPanel from '../../components/mappanels/SiteDetailsPanel';
import Slide from '@material-ui/core/Slide';
import SpeedTestPanel from '../../components/mappanels/SpeedTestPanel';
import TestExecutionPanel from '../../components/mappanels/TestExecutionPanel';
import UpgradeProgressPanel from '../../components/mappanels/UpgradeProgressPanel';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {UpgradeReqType} from '../../../thrift/gen-nodejs/Controller_types';
import {get} from 'lodash';
import {
  getAddSiteIcon,
  getLinkIcon,
  getNodeIcon,
} from '../../helpers/MapPanelHelpers';
import {withStyles} from '@material-ui/core/styles';

export const NetworkDrawerConstants = {
  DRAWER_MIN_WIDTH: 330,
  DRAWER_MAX_WIDTH: 800,
};

const styles = theme => ({
  addButton: {
    position: 'fixed',
    right: 0,
    margin: theme.spacing.unit * 2,
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    height: '100%',
    padding: theme.spacing.unit * 2,
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

class NetworkDrawer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Topology builder menu
      addButtonAnchorEl: null,

      // Panels
      // -> expanded?
      overviewPanelExpanded: !(
        props.context.selectedElement || props.context.pinnedElements.length
      ),
      mapLayersPanelExpanded: false,
      addNodePanelExpanded: false,
      addLinkPanelExpanded: false,
      addSitePanelExpanded: false,
      ignitionStatePanelExpanded: false,
      accessPointsPanelExpanded: false,
      upgradeProgressPanelExpanded: true,
      // -> visible?
      showAddNodePanel: false,
      showAddLinkPanel: false,
      showAddSitePanel: false,
      showIgnitionStatePanel: false,
      showAccessPointsPanel: false,
      // -> initial params?
      addNodeParams: {},
      addLinkParams: {},
      addSiteParams: {},
      // -> form type? ('CREATE' or 'EDIT')
      addNodeFormType: '',
      addSiteFormType: '',
      // -> closing?
      closingNodes: {},
      closingLinks: {},
      closingSites: {},
      closingSearchNearby: {},
      closingShowRoute: {},

      // State variable for resizable drawer
      width: NetworkDrawerConstants.DRAWER_MIN_WIDTH,

      // Current site being edited
      editingSite: null,
    };
  }

  componentDidUpdate(prevProps: Props) {
    // Expand or unexpand panels based on changes to context
    if (
      this.props.context.selectedElement &&
      this.props.context.selectedElement != prevProps.context.selectedElement
    ) {
      // If the selected element changed, unexpand all other panels
      this.setState(this.getUnexpandPanelsState());
    } else {
      // If there are no more selected/pinned elements and nothing is expanded,
      // expand the "Overview" panel
      const hasTopologyElements =
        this.props.context.selectedElement ||
        this.props.context.pinnedElements.length;
      const prevHadTopologyElements =
        prevProps.context.selectedElement ||
        prevProps.context.pinnedElements.length;
      if (!hasTopologyElements && prevHadTopologyElements) {
        const isAnyPanelExpanded =
          this.state.overviewPanelExpanded ||
          this.state.maplayersPanelExpanded ||
          this.state.addNodePanelExpanded ||
          this.state.addLinkPanelExpanded ||
          this.state.addSitePanelExpanded ||
          this.state.ignitionStatePanelExpanded ||
          this.state.accessPointsPanelExpanded ||
          this.state.upgradeProgressPanelExpanded ||
          this.isSpeedTestMode();
        if (!isAnyPanelExpanded) {
          this.setState({
            overviewPanelExpanded: true,
          });
        }
      }
    }
  }

  handleHorizontalResize = width => {
    // Handle dragger resize event
    this.setState({width});

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
    this.setState({[stateKey]: closingMap});
  }

  onCloseAddButtonMenu() {
    // Close the topology builder menu
    this.setState({addButtonAnchorEl: null});
  }

  onAddPlannedSite = location => {
    // Add a planned site to the map
    const {context, mapRef, plannedSiteProps} = this.props;
    const {plannedSite, onUpdatePlannedSite, unhideSite} = plannedSiteProps;
    const {addSiteFormType, editingSite} = this.state;

    // If there's already a planned site...
    if (plannedSite && addSiteFormType === 'EDIT' && editingSite) {
      // Stop editing the previous site
      unhideSite(editingSite);
      this.setState({editingSite: null});
    }

    // Set initial position to the center of the map, or the provided location
    let initialPosition;
    if (location) {
      const {latitude, longitude} = location;
      initialPosition = {latitude, longitude};
    } else if (mapRef) {
      const {lat, lng} = mapRef.getCenter();
      initialPosition = {latitude: lat, longitude: lng};
    } else {
      // Use networkConfig if map reference isn't set (shouldn't happen...)
      const [[minLng, minLat], [maxLng, maxLat]] = context.networkConfig.bounds;
      const latitude = minLat + (maxLat - minLat) / 2;
      const longitude = minLng + (maxLng - minLng) / 2;
      initialPosition = {latitude, longitude};
    }
    this.setState({
      addSiteParams: {
        name: '',
        altitude: 0,
        accuracy: 40000000,
      },
      addSiteFormType: 'CREATE',
    });
    onUpdatePlannedSite(initialPosition);
  };

  onRemovePlannedSite = () => {
    // Remove the planned site from the map
    const {plannedSiteProps} = this.props;
    const {onUpdatePlannedSite, unhideSite} = plannedSiteProps;
    const {editingSite} = this.state;

    // Stop editing the previous site
    if (editingSite) {
      unhideSite(editingSite);
      this.setState({editingSite: null});
    }

    onUpdatePlannedSite(null);
  };

  onEditSite = params => {
    // Edit the given site
    const {plannedSiteProps} = this.props;
    const {onUpdatePlannedSite, hideSite, unhideSite} = plannedSiteProps;
    const {editingSite} = this.state;

    // Stop editing the previous site
    if (editingSite) {
      unhideSite(editingSite);
    }

    const {name, latitude, longitude} = params;
    this.setState({
      showAddSitePanel: true,
      addSiteParams: params,
      addSiteFormType: 'EDIT',
      addSitePanelExpanded: true,
      editingSite: name,
    });
    onUpdatePlannedSite({latitude, longitude});
    hideSite(name);
  };

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
      addNodePanelExpanded: false,
      addLinkPanelExpanded: false,
      addSitePanelExpanded: false,
      ignitionStatePanelExpanded: false,
      accessPointsPanelExpanded: false,
      upgradeProgressPanelExpanded: false,
    };
  }

  renderTopologyBuilderMenu() {
    // Render the FAB with topology builder actions (add node/link/site)
    const {classes, bottomOffset} = this.props;
    const {addButtonAnchorEl} = this.state;
    const unexpandPanels = this.getUnexpandPanelsState();

    return (
      <div>
        <Fab
          className={classes.addButton}
          style={{bottom: bottomOffset}}
          color="primary"
          aria-haspopup="true"
          onClick={ev => this.setState({addButtonAnchorEl: ev.currentTarget})}>
          <AddIcon />
        </Fab>
        <Menu
          id="topology-builder-menu"
          anchorEl={addButtonAnchorEl}
          open={Boolean(addButtonAnchorEl)}
          onClose={() => this.onCloseAddButtonMenu()}>
          <MenuItem
            onClick={() => {
              this.setState({
                ...unexpandPanels,
                addNodePanelExpanded: true,
                showAddNodePanel: true,
                addNodeParams: {},
                addNodeFormType: 'CREATE',
              });
              this.onCloseAddButtonMenu();
            }}>
            <ListItemIcon>{getNodeIcon()}</ListItemIcon>
            <ListItemText inset primary="Add Node" />
          </MenuItem>
          <MenuItem
            onClick={() => {
              this.setState({
                ...unexpandPanels,
                addLinkPanelExpanded: true,
                showAddLinkPanel: true,
              });
              this.onCloseAddButtonMenu();
            }}>
            <ListItemIcon>{getLinkIcon()}</ListItemIcon>
            <ListItemText inset primary="Add Link" />
          </MenuItem>
          <MenuItem
            onClick={() => {
              // Show a planned site feature on the map
              this.onAddPlannedSite();

              this.setState({
                ...unexpandPanels,
                addSitePanelExpanded: true,
                showAddSitePanel: true,
              });
              this.onCloseAddButtonMenu();
            }}>
            <ListItemIcon>{getAddSiteIcon()}</ListItemIcon>
            <ListItemText inset primary="Add Planned Site" />
          </MenuItem>
        </Menu>
      </div>
    );
  }

  renderTopologyElement({type, name, expanded}, slideProps) {
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
      return (
        <Slide
          {...slideProps}
          key={name}
          in={!this.state.closingNodes.hasOwnProperty(name)}>
          <NodeDetailsPanel
            expanded={expanded}
            onPanelChange={() => context.toggleExpanded(type, name, !expanded)}
            networkName={networkName}
            ctrlVersion={controller_version}
            networkConfig={networkConfig}
            topology={topology}
            node={node}
            statusReport={
              node ? status_dump.statusReports[node.mac_addr] : null
            }
            networkNodeHealth={networkNodeHealth}
            onClose={() => this.onClosePanel(name, type, 'closingNodes')}
            onSelectLink={linkName =>
              context.setSelected(TopologyElementType.LINK, linkName)
            }
            onSelectSite={siteName =>
              context.setSelected(TopologyElementType.SITE, siteName)
            }
            pinned={pinned}
            onPin={() => context.togglePin(type, name, !pinned)}
            onEdit={params =>
              this.setState({
                ...this.getUnexpandPanelsState(),
                addNodePanelExpanded: true,
                showAddNodePanel: true,
                addNodeParams: params,
                addNodeFormType: 'EDIT',
              })
            }
            {...searchNearbyProps}
            {...routesProps}
          />
        </Slide>
      );
    } else if (type === TopologyElementType.LINK) {
      const link = linkMap[name];
      return (
        <Slide
          {...slideProps}
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
          {...slideProps}
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
            onEdit={this.onEditSite}
          />
        </Slide>
      );
    }
    return null;
  }

  renderShowRouteMenu(nodeName, slideProps) {
    const {context, routesProps} = this.props;
    const {topology} = context.networkConfig;
    const {networkName, nodeMap, siteMap} = context;
    const node = nodeMap[nodeName];

    return (
      <Slide
        {...slideProps}
        key={nodeName}
        in={!this.state.closingShowRoute.hasOwnProperty(nodeName)}>
        <ShowRoutePanel
          networkName={networkName}
          topology={topology}
          node={node}
          nodeMap={nodeMap}
          site={siteMap[node.site_name]}
          onClose={() =>
            this.onClosePanel(nodeName, 'show_route', 'closingShowRoute')
          }
          {...routesProps}
        />
      </Slide>
    );
  }

  renderSearchNearby(nodeName, slideProps) {
    // Render a "Search Nearby" panel
    const {context, searchNearbyProps} = this.props;
    const {topology} = context.networkConfig;
    const {networkName, nodeMap, siteMap} = context;
    const node = nodeMap[nodeName];

    return (
      <Slide
        {...slideProps}
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
          onAddNode={params =>
            this.setState({
              ...this.getUnexpandPanelsState(),
              addNodePanelExpanded: true,
              showAddNodePanel: true,
              addNodeParams: params,
              addNodeFormType: 'CREATE',
            })
          }
          onAddLink={params =>
            this.setState({
              ...this.getUnexpandPanelsState(),
              addLinkPanelExpanded: true,
              showAddLinkPanel: true,
              addLinkParams: params,
            })
          }
          onAddSite={params => {
            // Show a planned site feature on the map
            this.onAddPlannedSite(params);

            this.setState({
              ...this.getUnexpandPanelsState(),
              addSitePanelExpanded: true,
              showAddSitePanel: true,
              addSiteParams: params,
            });
          }}
          {...searchNearbyProps}
        />
      </Slide>
    );
  }

  render() {
    const {
      classes,
      bottomOffset,
      context,
      mapLayersProps,
      plannedSiteProps,
      searchNearbyProps,
      routesProps,
    } = this.props;
    const {
      networkName,
      nodeMap,
      networkLinkHealth,
      selectedElement,
      pinnedElements,
    } = context;
    const {
      controller_version,
      topology,
      ignition_state,
      status_dump,
      upgrade_state,
      wireless_controller,
      wireless_controller_stats,
    } = context.networkConfig;
    const {
      width,
      overviewPanelExpanded,
      mapLayersPanelExpanded,
      addNodePanelExpanded,
      addLinkPanelExpanded,
      addSitePanelExpanded,
      ignitionStatePanelExpanded,
      accessPointsPanelExpanded,
      upgradeProgressPanelExpanded,
      addNodeFormType,
      addSiteFormType,
    } = this.state;
    const drawerDimensions = {
      width,
      height: bottomOffset === 0 ? '100%' : `calc(100% - ${bottomOffset}px)`,
    };
    const slideProps = {
      direction: 'left',
      mountOnEnter: true,
      // Don't set unmountOnExit if any action is taken on mount!
      // (interferes with onClosePanel() logic and causes unmount-mount-unmount)
    };

    // Build list of topology elements
    const topologyElements = [];
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
            expanded={mapLayersPanelExpanded}
            onPanelChange={() =>
              this.setState({mapLayersPanelExpanded: !mapLayersPanelExpanded})
            }
          />

          <Slide {...slideProps} unmountOnExit in={this.state.showAddNodePanel}>
            <AddNodePanel
              expanded={addNodePanelExpanded}
              onPanelChange={() =>
                this.setState({addNodePanelExpanded: !addNodePanelExpanded})
              }
              onClose={() => {
                // If editing a node and nothing else is selected,
                // re-select the node onClose
                if (addNodeFormType === 'EDIT' && !selectedElement) {
                  context.setSelected(
                    TopologyElementType.NODE,
                    this.state.addNodeParams.name,
                  );
                }

                this.setState({
                  showAddNodePanel: false,
                  addNodeParams: {},
                });
              }}
              formType={addNodeFormType}
              initialParams={this.state.addNodeParams}
              ctrlVersion={controller_version}
              networkName={networkName}
              topology={topology}
            />
          </Slide>
          <Slide {...slideProps} unmountOnExit in={this.state.showAddLinkPanel}>
            <AddLinkPanel
              expanded={addLinkPanelExpanded}
              onPanelChange={() =>
                this.setState({addLinkPanelExpanded: !addLinkPanelExpanded})
              }
              onClose={() =>
                this.setState({showAddLinkPanel: false, addLinkParams: {}})
              }
              initialParams={this.state.addLinkParams}
              topology={topology}
              networkName={networkName}
            />
          </Slide>
          <Slide {...slideProps} unmountOnExit in={this.state.showAddSitePanel}>
            <AddSitePanel
              expanded={addSitePanelExpanded}
              onPanelChange={() =>
                this.setState({addSitePanelExpanded: !addSitePanelExpanded})
              }
              onClose={() => {
                // Hide the planned state feature on the map
                this.onRemovePlannedSite();

                // If editing a site and nothing else is selected,
                // re-select the site onClose
                if (addSiteFormType === 'EDIT' && !selectedElement) {
                  context.setSelected(
                    TopologyElementType.SITE,
                    this.state.addSiteParams.name,
                  );
                }

                this.setState({
                  showAddSitePanel: false,
                  addSiteParams: {},
                });
              }}
              formType={addSiteFormType}
              initialParams={this.state.addSiteParams}
              networkName={networkName}
              plannedSite={plannedSiteProps.plannedSite}
              onUpdatePlannedSite={plannedSiteProps.onUpdatePlannedSite}
            />
          </Slide>
          <Slide
            {...slideProps}
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
            {...slideProps}
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
            this.renderSearchNearby(txNode, slideProps),
          )}

          {routesProps.routes.node
            ? this.renderShowRouteMenu(routesProps.routes.node, slideProps)
            : null}

          {topologyElements.map(el =>
            this.renderTopologyElement(el, slideProps),
          )}

          {this.renderTopologyBuilderMenu()}
        </div>
      </Drawer>
    );
  }
}

NetworkDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
  bottomOffset: PropTypes.number.isRequired,
  context: PropTypes.object.isRequired,
  mapRef: PropTypes.object,
  mapLayersProps: PropTypes.object.isRequired,
  plannedSiteProps: PropTypes.object.isRequired,
  searchNearbyProps: PropTypes.object.isRequired,
  routesProps: PropTypes.object.isRequired,
};

export default withStyles(styles, {withTheme: true})(NetworkDrawer);
