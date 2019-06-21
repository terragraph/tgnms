/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import BuildingsLayer from './BuildingsLayer';
import Dragger from '../../components/common/Dragger';
import {
  LinkOverlayColors,
  SiteOverlayColors,
} from '../../constants/LayerConstants';
import LinksLayer from './LinksLayer';
import LinkOverlayContext from '../../LinkOverlayContext';
import RouteContext from '../../RouteContext';
import type {Route as NodeRoute} from '../../RouteContext';
import NetworkContext from '../../NetworkContext';
import NetworkDrawer from './NetworkDrawer';
import NetworkTables from '../tables/NetworkTables';
import type {OverlayStrategy} from './overlays';
import {
  LinkMetricsOverlayStrategy,
  TestExecutionOverlayStrategy,
} from './overlays';
import React from 'react';
import {withRouter, Route} from 'react-router-dom';
import ReactMapboxGl, {RotationControl, ZoomControl} from 'react-mapbox-gl';
import SitePopupsLayer from './SitePopupsLayer';
import SitesLayer from './SitesLayer';
import RoutesLayer from './RoutesLayer';
import TableControl from './TableControl';
import TgMapboxGeocoder from '../../components/geocoder/TgMapboxGeocoder';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {withStyles} from '@material-ui/core/styles';
import {
  getTestOverlayId,
  getSpeedTestId,
} from '../../helpers/NetworkTestHelpers';

const styles = theme => ({
  appBarSpacer: theme.mixins.toolbar,
  container: {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
  },
  topContainer: {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'row',
  },
  draggerContainer: {
    position: 'absolute',
    width: '100%',
    zIndex: 2,
  },
});

const {MAPBOX_ACCESS_TOKEN} = window.CONFIG.env;
const MapBoxGL = ReactMapboxGl({accessToken: MAPBOX_ACCESS_TOKEN});

// Initial map bounding box:
// https://www.mapbox.com/mapbox-gl-js/api/#map#fitbounds
const FIT_BOUND_OPTIONS = {padding: 32, maxZoom: 18, animate: false};

// All supported map styles:
// https://www.mapbox.com/api-documentation/#styles
const DefaultMapBoxStyles = [
  {name: 'Streets', endpoint: 'streets-v10'},
  {name: 'Outdoors', endpoint: 'outdoors-v10'},
  {name: 'Light', endpoint: 'light-v9'},
  {name: 'Dark', endpoint: 'dark-v9'},
  {name: 'Satellite', endpoint: 'satellite-v9'},
  {name: 'Satellite (Streets)', endpoint: 'satellite-streets-v10'},
  {name: 'Navigation Preview (Day)', endpoint: 'navigation-preview-day-v4'},
  {name: 'Navigation Preview (Night)', endpoint: 'navigation-preview-night-v4'},
  {name: 'Navigation Guidance (Day)', endpoint: 'navigation-guidance-day-v4'},
  {
    name: 'Navigation Guidance (Night)',
    endpoint: 'navigation-guidance-night-v4',
  },
];
const getMapBoxStyleUrl = endpoint => 'mapbox://styles/mapbox/' + endpoint;

// Interval at which link overlay metrics are refreshed (in ms)
const LINK_OVERLAY_METRIC_REFRESH_INTERVAL_MS = 30000;

// Table size limits (in pixels)
const TABLE_LIMITS = {minHeight: 360, maxHeight: 720};

class NetworkMap extends React.Component {
  overlayStrategy: OverlayStrategy;

  constructor(props) {
    super(props);
    // construct styles list
    this._mapBoxStyles = this.mapBoxStylesList();
    const overlayStrategy = this.updateOverlayStrategy();
    this.state = {
      // Map config
      mapRef: null, // reference to Map class
      mapBounds: this.props.networkConfig.bounds,
      selectedLayers: {
        site_icons: true,
        link_lines: true,
        site_name_popups: false,
        buildings_3d: false,
        routes: false,
      },
      selectedOverlays: overlayStrategy.getDefaultOverlays(),

      // Map tables
      showTable: false,
      tableHeight: TABLE_LIMITS.minHeight,

      // loading indicator bool per layer id, ex: {'link_lines': true}
      overlayLoading: {},

      // link overlay stats received per-link
      linkOverlayMetrics: {},

      // Selected map style (from MapBoxStyles)
      selectedMapStyle: this._mapBoxStyles[0].endpoint,

      // Planned site location ({latitude, longitude} or null)
      plannedSite: null,

      // Nearby nodes ({nodeName: TopologyScanInfo[]})
      nearbyNodes: {},

      // routes properties
      routes: {
        // node with "show route" panel
        node: null,
        // map of routes links (link:weight)
        links: {},
        // map of nodes involved in routes
        nodes: new Set(),
      },

      routesOverlay: {
        selectedNode: null,
        routeData: {},
      },

      // Sites that should not be rendered on the map (e.g. while editing)
      hiddenSites: new Set(),
    };

    // link metric overlay timer to refresh backend stats
    // initialized to null for clearInterval() sanity
    this._refreshLinkMetricOverlayTimer = null;

    // map layers config
    this._layersConfig = [
      {
        layerId: 'link_lines',
        name: 'Link Lines',
        render: this.renderLinks.bind(this),
      },
      {
        layerId: 'site_icons',
        name: 'Site Icons',
        render: this.renderSites.bind(this),
      },
      {
        layerId: 'site_name_popups',
        name: 'Site Name Popups',
        render: this.renderSitePopups.bind(this),
      },
      {
        layerId: 'buildings_3d',
        name: '3D Buildings',
        render: this.render3dBuildings.bind(this),
      },
      {
        layerId: 'routes',
        name: 'Routes',
        render: this.renderRoutes.bind(this),
      },
    ];
  }

  componentDidMount() {
    /**
     * In test mode, all overlays are metrics, so we must fetch their data.
     * In normal mode, the default overlay is health which is already present
     * and does not need to be fetched.
     */
    if (getTestOverlayId(this.props.location)) {
      this.fetchOverlayData();
    }
  }

  componentWillUnmount() {
    clearInterval(this._refreshLinkMetricOverlayTimer);
  }

  mapBoxStylesList() {
    // use default styles if no override specified
    if (!window.CONFIG.env.hasOwnProperty('TILE_STYLE')) {
      return DefaultMapBoxStyles.map(({name, endpoint}) => ({
        name,
        endpoint: getMapBoxStyleUrl(endpoint),
      }));
    }
    // override list of styles if env specified
    const {TILE_STYLE} = window.CONFIG.env;
    // parse style format
    // <Display Name>=<Tile URL>,...
    const tileStyleUrls = TILE_STYLE.split(',');
    return tileStyleUrls.map(tileStyle => {
      const [name, endpoint] = tileStyle.split('=');
      return {name, endpoint};
    });
  }

  handleTableResize = height => {
    // Handle dragger resize event on the table
    this.setState({tableHeight: height});

    // Force map to resize
    window.dispatchEvent(new Event('resize'));
  };

  onToggleTable = (showTable?: boolean) => {
    const nextState =
      typeof showTable === 'boolean' ? showTable : !this.state.showTable;
    // Toggle showing the table
    this.setState({showTable: nextState}, () => {
      // Force map to resize
      window.dispatchEvent(new Event('resize'));
    });
  };

  onFeatureMouseEnter = mapEvent => {
    // Change cursor when hovering over sites/links
    mapEvent.map.getCanvas().style.cursor = 'pointer';
  };

  onFeatureMouseLeave = mapEvent => {
    // Reset cursor when leaving sites/links
    mapEvent.map.getCanvas().style.cursor = '';
  };

  onPlannedSiteMoved = mapEvent => {
    // Update planned site location (based on map event)
    const {lat, lng} = mapEvent.lngLat;
    this.setState({plannedSite: {latitude: lat, longitude: lng}});
  };

  onGeocoderEvent = feature => {
    // Move to a location returned by the geocoder
    const {mapRef} = this.state;
    if (mapRef) {
      const {bbox, center} = feature;
      if (bbox) {
        mapRef.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]]);
      } else {
        mapRef.flyTo({center});
      }
    }
  };

  hideSite = name => {
    // Hide the given site
    const {hiddenSites} = this.state;
    hiddenSites.add(name);
    this.setState({hiddenSites});
  };

  unhideSite = name => {
    // Unhide the given site
    const {hiddenSites} = this.state;
    hiddenSites.delete(name);
    this.setState({hiddenSites});
  };

  getOverlaysConfig = () => {
    const overlayStrategy = this.getOverlayStrategy();
    return [
      {
        layerId: 'link_lines',
        overlays: overlayStrategy.getOverlays(),
        changeOverlayRange: overlayStrategy.changeOverlayRange,
        legend: LinkOverlayColors,
      },
      {
        layerId: 'site_icons',
        overlays: [
          {name: 'Health', type: 'health', id: 'health'},
          {name: 'Polarity', type: 'polarity', id: 'polarity'},
        ],
        legend: SiteOverlayColors,
      },
    ];
  };

  fetchOverlayData = () => {
    return this.getOverlayStrategy()
      .getData({
        networkName: this.props.networkName,
        overlayId: this.state.selectedOverlays.link_lines,
      })
      .then(overlayData => {
        const {overlayLoading} = this.state;
        // remove loading indicator for link lines layer
        delete overlayLoading['link_lines'];
        this.setState({
          linkOverlayMetrics: overlayData,
          overlayLoading,
        });
      });
  };

  selectOverlays = selectedOverlays => {
    // update the selected overlay and fetch data if a link metric is selected
    const linkOverlay = this.getOverlayStrategy().getOverlay(
      selectedOverlays.link_lines,
    );
    // load data if selected overlay is a metric
    // TODO - determine the changed metric instead of fetching the metric on
    // any layer change
    if (linkOverlay.type === 'metric') {
      const {overlayLoading} = this.state;
      overlayLoading['link_lines'] = true;
      this.setState({linkOverlayMetrics: {}, selectedOverlays, overlayLoading});
      // clear any existing schedule and schedule new metric
      this.fetchOverlayData();
      clearInterval(this._refreshLinkMetricOverlayTimer);
      this._refreshLinkMetricOverlayTimer = setInterval(
        this.fetchOverlayData,
        LINK_OVERLAY_METRIC_REFRESH_INTERVAL_MS,
      );
    } else {
      this.setState({
        linkOverlayMetrics: {},
        selectedOverlays,
      });
    }
  };

  setNodeRoutes = (nodeName: string, routes: Array<NodeRoute>) => {
    if (nodeName === null) {
      return this.setState({
        selectedLayers: {
          ...this.state.selectedLayers,
          routes: false,
        },
      });
    }
    this.setState({
      selectedLayers: {
        ...this.state.selectedLayers,
        routes: true,
      },
      routesOverlay: {
        selectedNode: nodeName,
        routeData: Object.assign({}, this.state.routesOverlay.routeData, {
          [nodeName]: routes,
        }),
      },
    });
  };

  render3dBuildings(_context) {
    return <BuildingsLayer key="3d-buildings-layer" />;
  }

  renderSitePopups(context) {
    const {topology} = context.networkConfig;
    return <SitePopupsLayer key="popups-layer" topology={topology} />;
  }

  renderSites(context) {
    const {plannedSite, nearbyNodes, routes} = this.state;
    const {
      selectedElement,
      nodeMap,
      linkMap,
      siteMap,
      siteToNodesMap,
    } = context;
    const {
      controller_version,
      topology,
      topologyConfig,
      offline_whitelist,
    } = context.networkConfig;
    const selectedSites = {};
    if (selectedElement) {
      if (selectedElement.type === TopologyElementType.SITE) {
        selectedSites[selectedElement.name] = siteMap[selectedElement.name];
      } else if (selectedElement.type === TopologyElementType.NODE) {
        // Pick the node's site
        const siteName = nodeMap[selectedElement.name].site_name;
        selectedSites[siteName] = siteMap[siteName];
      } else if (selectedElement.type === TopologyElementType.LINK) {
        // Pick the link's two sites
        const {a_node_name, z_node_name} = linkMap[selectedElement.name];
        const aSiteName = nodeMap[a_node_name].site_name;
        const zSiteName = nodeMap[z_node_name].site_name;
        selectedSites[aSiteName] = siteMap[aSiteName];
        selectedSites[zSiteName] = siteMap[zSiteName];
      }
    }

    return (
      <SitesLayer
        key="sites-layer"
        onSiteMouseEnter={this.onFeatureMouseEnter}
        onSiteMouseLeave={this.onFeatureMouseLeave}
        topology={topology}
        topologyConfig={topologyConfig}
        ctrlVersion={controller_version}
        selectedSites={selectedSites}
        onSelectSiteChange={siteName =>
          context.setSelected(TopologyElementType.SITE, siteName)
        }
        nodeMap={nodeMap}
        siteToNodesMap={siteToNodesMap}
        plannedSite={plannedSite}
        onPlannedSiteMoved={this.onPlannedSiteMoved}
        overlay={this.state.selectedOverlays['site_icons']}
        nearbyNodes={nearbyNodes}
        hiddenSites={this.state.hiddenSites}
        routes={routes}
        offlineWhitelist={offline_whitelist}
      />
    );
  }

  renderLinks(context) {
    const {nearbyNodes, routes} = this.state;
    const {linkMap, selectedElement} = context;
    const {
      controller_version,
      ignition_state,
      topology,
      topologyConfig,
      offline_whitelist,
    } = context.networkConfig;
    const selectedLinks =
      selectedElement && selectedElement.type === TopologyElementType.LINK
        ? {[selectedElement.name]: linkMap[selectedElement.name]}
        : {};
    const selectedNodeName =
      selectedElement && selectedElement.type === TopologyElementType.NODE
        ? selectedElement.name
        : null;

    return (
      <LinksLayer
        key="links-layer"
        onLinkMouseEnter={this.onFeatureMouseEnter}
        onLinkMouseLeave={this.onFeatureMouseLeave}
        topology={topology}
        topologyConfig={topologyConfig}
        ctrlVersion={controller_version}
        selectedLinks={selectedLinks}
        onSelectLinkChange={linkName =>
          context.setSelected(TopologyElementType.LINK, linkName)
        }
        selectedNodeName={selectedNodeName}
        nodeMap={context.nodeMap}
        siteMap={context.siteMap}
        overlay={this.getCurrentLinkOverlay()}
        ignitionState={ignition_state}
        nearbyNodes={nearbyNodes}
        routes={routes}
        offlineWhitelist={offline_whitelist}
      />
    );
  }

  renderRoutes(_context) {
    return <RoutesLayer key="routes-layer" />;
  }

  renderMapLayers(context) {
    const mapLayers = [];
    this._layersConfig.forEach(({layerId, render}) => {
      if (this.state.selectedLayers[layerId]) {
        mapLayers.push(render(context));
      }
    });
    return mapLayers;
  }

  render() {
    return (
      <NetworkContext.Consumer>{this.renderContext}</NetworkContext.Consumer>
    );
  }

  renderContext = (context): ?React.Element => {
    const {classes} = this.props;
    const {
      linkOverlayMetrics,
      mapRef,
      mapBounds,
      selectedMapStyle,
      showTable,
      tableHeight,
    } = this.state;

    return (
      <LinkOverlayContext.Provider
        value={{
          metricData: linkOverlayMetrics,
        }}>
        <RouteContext.Provider
          value={{
            ...this.state.routesOverlay,
            setNodeRoutes: this.setNodeRoutes,
          }}>
          <div className={classes.container}>
            <div className={classes.topContainer}>
              <MapBoxGL
                fitBounds={mapBounds}
                fitBoundsOptions={FIT_BOUND_OPTIONS}
                style={selectedMapStyle}
                onStyleLoad={map => this.setState({mapRef: map})}
                containerStyle={{width: '100%', height: 'inherit'}}>
                <TgMapboxGeocoder
                  accessToken={MAPBOX_ACCESS_TOKEN}
                  mapRef={mapRef}
                  onSelectFeature={this.onGeocoderEvent}
                  onSelectTopologyElement={context.setSelected}
                  nodeMap={context.nodeMap}
                  linkMap={context.linkMap}
                  siteMap={context.siteMap}
                  statusReports={
                    context.networkConfig?.status_dump?.statusReports
                  }
                />
                <ZoomControl />
                <RotationControl style={{top: 80}} />
                <Route
                  path={`${this.props.match.url}/:tableName?`}
                  render={routerProps => (
                    <TableControl
                      style={{left: 10, bottom: 10}}
                      baseUrl={this.props.match.url}
                      onToggleTable={this.onToggleTable}
                      {...routerProps}
                    />
                  )}
                />
                {this.renderMapLayers(context)}
              </MapBoxGL>
              <NetworkDrawer
                bottomOffset={showTable ? tableHeight : 0}
                context={context}
                mapRef={mapRef}
                mapLayersProps={{
                  layersConfig: this._layersConfig,
                  overlaysConfig: this.getOverlaysConfig(),
                  mapStylesConfig: this._mapBoxStyles,
                  selectedLayers: this.state.selectedLayers,
                  selectedOverlays: this.state.selectedOverlays,
                  selectedMapStyle: this.state.selectedMapStyle,
                  onLayerSelectChange: selectedLayers =>
                    this.setState({selectedLayers}),
                  onOverlaySelectChange: this.selectOverlays,
                  onMapStyleSelectChange: selectedMapStyle =>
                    this.setState({selectedMapStyle}),
                  overlayLoading: this.state.overlayLoading,
                }}
                plannedSiteProps={{
                  plannedSite: this.state.plannedSite,
                  onUpdatePlannedSite: plannedSite =>
                    this.setState({plannedSite}),
                  hideSite: this.hideSite,
                  unhideSite: this.unhideSite,
                }}
                searchNearbyProps={{
                  nearbyNodes: this.state.nearbyNodes,
                  onUpdateNearbyNodes: nearbyNodes =>
                    this.setState({nearbyNodes}),
                }}
                routesProps={{
                  routes: this.state.routes,
                  onUpdateRoutes: routes => {
                    this.setState({routes});
                  },
                }}
                networkTestId={getTestOverlayId(this.props.location)}
                speedTestId={getSpeedTestId(this.props.location)}
                onNetworkTestPanelClosed={this.exitTestOverlayMode}
              />
              )}
            </div>
            {showTable && (
              <div style={{height: tableHeight}}>
                <div className={classes.draggerContainer}>
                  <Dragger
                    direction="vertical"
                    minSize={TABLE_LIMITS.minHeight}
                    maxSize={TABLE_LIMITS.maxHeight}
                    onResize={this.handleTableResize}
                  />
                </div>
                <NetworkTables
                  selectedElement={context.selectedElement}
                  // fixes this component's usage of withRouter
                  match={this.props.match}
                  location={this.props.location}
                  history={this.props.history}
                  isEmbedded={true}
                />
              </div>
            )}
          </div>
        </RouteContext.Provider>
      </LinkOverlayContext.Provider>
    );
  };

  componentDidUpdate(prevProps: Props) {
    const currentStrategy = this.overlayStrategy;
    const newStrategy = this.updateOverlayStrategy({
      previousTestId: getTestOverlayId(prevProps.location),
    });

    // if the strategy has changed, load the new data
    if (newStrategy !== currentStrategy) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(
        {selectedOverlays: newStrategy.getDefaultOverlays()},
        () => {
          this.fetchOverlayData();
        },
      );
    }
  }

  /**
   * Decide which overlay strategy to use based on the current props / url
   * All strategy changes should create a new instance instead of modifying the
   * exising instance
   */
  updateOverlayStrategy = ({previousTestId}: {previousTestId: string} = {}) => {
    const testId = getTestOverlayId(this.props.location);

    if (testId && testId !== previousTestId) {
      this.overlayStrategy = new TestExecutionOverlayStrategy({
        testId,
      });
    } else if (
      !testId &&
      !(this.overlayStrategy instanceof LinkMetricsOverlayStrategy)
    ) {
      this.overlayStrategy = new LinkMetricsOverlayStrategy();
    }

    return this.overlayStrategy;
  };

  getCurrentLinkOverlay = () => {
    const overlay = this.getOverlayStrategy().getOverlay(
      this.state.selectedOverlays.link_lines,
    );
    if (!overlay) {
      return {};
    }
    return overlay;
  };

  getOverlayStrategy = (): OverlayStrategy => this.overlayStrategy;

  exitTestOverlayMode = () => {
    const urlWithoutOverlay = new URL(window.location);
    urlWithoutOverlay.searchParams.delete('test');
    this.props.history.replace(
      `${urlWithoutOverlay.pathname}${urlWithoutOverlay.search}`,
    );
  };
}

export default withStyles(styles)(withRouter(NetworkMap));
