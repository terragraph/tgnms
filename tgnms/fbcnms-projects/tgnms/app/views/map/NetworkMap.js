/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as React from 'react';
import * as mapApi from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import Dragger from '@fbcnms/tg-nms/app/components/common/Dragger';
import MapLayers from './mapLayers/MapLayers';
import MapOverlayLegend from '@fbcnms/tg-nms/app/views/map/mapControls/MapOverlayLegend';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NetworkDrawer from './NetworkDrawer';
import NetworkTables from '../tables/NetworkTables';
import ReactMapboxGl from 'react-mapbox-gl';
import TableControl from './TableControl';
import TgMapboxNavigation from '@fbcnms/tg-nms/app/views/map/mapControls/mapboxNavigation/TgMapboxNavigation';
import {DEFAULT_MAP_PROFILE} from '@fbcnms/tg-nms/app/constants/MapProfileConstants';
import {
  MAPMODE,
  MapContextProvider,
} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {MapAnnotationContextProvider} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {NetworkDrawerConstants} from './NetworkDrawer';
import {PlannedSiteContextProvider} from '@fbcnms/tg-nms/app/contexts/PlannedSiteContext';
import {Route} from 'react-router-dom';
import {Provider as RoutesContextProvider} from '@fbcnms/tg-nms/app/contexts/RouteContext';
import {TopologyBuilderContextProvider} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {getMapStyles, getUIEnvVal} from '../../common/uiConfig';
import {getScanId} from '@fbcnms/tg-nms/app/features/scans/ScanServiceHelpers';
import {getTestOverlayId} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {useLocation, useRouteMatch} from 'react-router';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type Map from 'mapbox-gl/src/ui/map';
import type {GeoCoord} from '@turf/turf';
import type {Location} from 'react-router-dom';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';
import type {NearbyNodes} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {NetworkState} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {Routes} from '@fbcnms/tg-nms/app/contexts/RouteContext';

type MapboxStyle = {name: string, endpoint: string};

const useStyles = makeStyles(theme => ({
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
    zIndex: theme.zIndex.drawer,
  },
  mapboxMap: {
    '& canvas': {
      outline: 'none',
    },
  },
}));

const MAPBOX_ACCESS_TOKEN = getUIEnvVal('MAPBOX_ACCESS_TOKEN');
const MapBoxGL = ReactMapboxGl({
  accessToken: MAPBOX_ACCESS_TOKEN ?? '',
  attributionControl: false,
});

// Initial map bounding box:
// https://www.mapbox.com/mapbox-gl-js/api/#map#fitbounds
const FIT_BOUND_OPTIONS = {padding: 32, maxZoom: 18, animate: false};
// Table size limits (in pixels)
const TABLE_LIMITS = {minHeight: 360, maxHeight: 720};

type Props = {
  classes: {[string]: string},
  location: Location,
  networkConfig: NetworkState,
  networkName: string,
  siteToNodesMap: {[string]: Set<string>},
  match: Object,
};

type State = {
  mapRef: ?Map, // reference to Map class
  mapBounds?: [GeoCoord, GeoCoord],
  showTable: boolean,
  tableHeight: number,
  // Selected map style (from MapBoxStyles)
  selectedMapStyle: string,

  // Planned site location ({latitude, longitude} or null)
  // plannedSite: ?PlannedSite,

  // Nearby nodes ({nodeName: TopologyScanInfo[]})
  nearbyNodes: NearbyNodes,

  // routes properties
  routes: $Shape<Routes>,

  // Sites that should not be rendered on the map (e.g. while editing)
  hiddenSites: Set<string>,
  networkDrawerWidth: number,
  mapProfiles: Array<MapProfile>,
};

class NetworkMapContent extends React.Component<Props, State> {
  _mapBoxStyles: Array<MapboxStyle>;

  constructor(props: Props) {
    super(props);
    // construct styles list
    this._mapBoxStyles = this.mapBoxStylesList();

    this.state = {
      // Map config
      mapRef: null, // reference to Map class
      mapBounds: props.networkConfig.bounds,
      // Map tables
      showTable: false,
      tableHeight: TABLE_LIMITS.minHeight,

      overlayLoading: false,

      // Selected map style (from MapBoxStyles)
      selectedMapStyle: this._mapBoxStyles[0]?.endpoint,

      // // Planned site location ({latitude, longitude} or null)
      // plannedSite: null,

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

      // Sites that should not be rendered on the map (e.g. while editing)
      hiddenSites: new Set(),
      networkDrawerWidth: NetworkDrawerConstants.DRAWER_MIN_WIDTH,
      mapProfiles: [DEFAULT_MAP_PROFILE],
    };
  }

  componentDidMount() {
    this.loadMapProfiles();
  }
  loadMapProfiles = async () => {
    try {
      const profiles = await mapApi.getProfiles();
      this.setState({mapProfiles: [DEFAULT_MAP_PROFILE].concat(profiles)});
    } catch (error) {
      console.error(error);
    }
  };
  mapBoxStylesList() {
    const mapStyles = getMapStyles();
    return mapStyles.map<MapboxStyle>(({name, url}) => ({
      name,
      endpoint: url,
    }));
  }

  handleTableResize = (height: number) => {
    // Handle dragger resize event on the table
    this.setState({tableHeight: height}, () =>
      // Force map to resize
      window.dispatchEvent(new Event('resize')),
    );
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

  updateRoutes = (routes: $Shape<Routes>) => {
    this.setState({routes});
  };

  resetRoutes = () => {
    this.setState({routes: {node: null, links: {}, nodes: new Set()}});
  };

  hideSite = (name: string) => {
    // Hide the given site
    const {hiddenSites} = this.state;
    hiddenSites.add(name);
    this.setState({hiddenSites});
  };

  unhideSite = (name: string) => {
    // Unhide the given site
    const {hiddenSites} = this.state;
    hiddenSites.delete(name);
    this.setState({hiddenSites});
  };

  setIsSiteHidden = (name: string, hidden: boolean) => {
    if (hidden) {
      this.hideSite(name);
    } else {
      this.unhideSite(name);
    }
  };

  handleStyleLoad = (map: ?Map) => {
    this.setState({mapRef: map});
  };

  render() {
    const {classes, match, location} = this.props;
    const {
      mapRef,
      mapBounds,
      selectedMapStyle,
      showTable,
      tableHeight,
      nearbyNodes,
      routes,
      hiddenSites,
      networkDrawerWidth,
      mapProfiles,
    } = this.state;
    return (
      <NetworkContext.Consumer>
        {context => (
          <RoutesContextProvider
            {...routes}
            onUpdateRoutes={this.updateRoutes}
            resetRoutes={this.resetRoutes}>
            <PlannedSiteContextProvider>
              <TopologyBuilderContextProvider>
                <MapContextProvider
                  defaultMapMode={MAPMODE.DEFAULT}
                  mapboxRef={mapRef}
                  mapProfiles={mapProfiles}
                  setIsSiteHidden={this.setIsSiteHidden}>
                  <MapAnnotationContextProvider>
                    <TgMapboxNavigation
                      accessToken={MAPBOX_ACCESS_TOKEN}
                      mapRef={mapRef}
                    />
                    <MapOverlayLegend />
                    <div className={classes.container}>
                      <div className={classes.topContainer}>
                        <MapBoxGL
                          className={classes.mapboxMap}
                          fitBounds={mapBounds}
                          fitBoundsOptions={FIT_BOUND_OPTIONS}
                          style={selectedMapStyle}
                          onStyleLoad={this.handleStyleLoad}
                          containerStyle={{
                            width: '100%',
                            height: 'inherit',
                          }}>
                          <Route
                            path={`${match.url}/:tableName?`}
                            render={routerProps => (
                              <TableControl
                                style={{left: 10, bottom: 10}}
                                baseUrl={match.url}
                                onToggleTable={this.onToggleTable}
                                {...routerProps}
                              />
                            )}
                          />
                          <MapLayers
                            context={context}
                            nearbyNodes={nearbyNodes}
                            hiddenSites={hiddenSites}
                          />
                        </MapBoxGL>
                        <NetworkDrawer
                          mapLayersProps={{
                            mapStylesConfig: this._mapBoxStyles,
                            selectedMapStyle,
                            onMapStyleSelectChange: selectedMapStyle =>
                              this.setState({selectedMapStyle}),
                            expanded: false,
                            onPanelChange: () => {},
                          }}
                          searchNearbyProps={{
                            nearbyNodes: nearbyNodes,
                            onUpdateNearbyNodes: nearbyNodes =>
                              this.setState({nearbyNodes}),
                          }}
                          networkTestId={getTestOverlayId(location)}
                          scanId={getScanId(location)}
                          onNetworkDrawerResize={networkDrawerWidth =>
                            this.setState({networkDrawerWidth})
                          }
                          networkDrawerWidth={networkDrawerWidth}
                        />
                      </div>
                      {showTable && (
                        <div
                          style={{
                            height: tableHeight,
                            width: `calc(100% - ${networkDrawerWidth}px)`,
                          }}>
                          <div className={classes.draggerContainer}>
                            <Dragger
                              direction="vertical"
                              minSize={TABLE_LIMITS.minHeight}
                              maxSize={TABLE_LIMITS.maxHeight}
                              onResize={this.handleTableResize}
                            />
                          </div>
                          <NetworkTables
                            onResize={this.handleTableResize}
                            tableHeight={tableHeight}
                          />
                        </div>
                      )}
                    </div>
                  </MapAnnotationContextProvider>
                </MapContextProvider>
              </TopologyBuilderContextProvider>
            </PlannedSiteContextProvider>
          </RoutesContextProvider>
        )}
      </NetworkContext.Consumer>
    );
  }
}

export default function NetworkMap() {
  const {networkName, networkConfig, siteToNodesMap} = useNetworkContext();
  const classes = useStyles();
  const location = useLocation();
  const match = useRouteMatch();

  return (
    <NetworkMapContent
      classes={classes}
      location={location}
      match={match}
      networkName={networkName}
      networkConfig={networkConfig}
      siteToNodesMap={siteToNodesMap}
    />
  );
}
