/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as React from 'react';
import * as mapApi from '../../apiutils/MapAPIUtil';
import Dragger from '../../components/common/Dragger';
import MapLayers from './mapLayers/MapLayers';
import MapOverlayLegend from '../../components/mappanels/MapOverlayLegend';
import NetworkContext from '../../contexts/NetworkContext';
import NetworkDrawer from './NetworkDrawer';
import NetworkTables from '../tables/NetworkTables';
import ReactMapboxGl from 'react-mapbox-gl';
import TableControl from './TableControl';
import TgMapboxNavigation from '../../components/mapboxNavigation/TgMapboxNavigation';
import {DEFAULT_MAP_PROFILE} from '../../constants/MapProfileConstants';
import {MAPMODE, MapContextProvider} from '../../contexts/MapContext';
import {MapAnnotationContextProvider} from '../../contexts/MapAnnotationContext';
import {NetworkDrawerConstants} from './NetworkDrawer';
import {PlannedSiteContextProvider} from '../../contexts/PlannedSiteContext';
import {Route, withRouter} from 'react-router-dom';
import {Provider as RoutesContextProvider} from '../../contexts/RouteContext';
import {getScanId} from '../../helpers/ScanServiceHelpers';
import {getTestOverlayId} from '../../helpers/NetworkTestHelpers';
import {getUIEnvVal} from '../../common/uiConfig';
import {withStyles} from '@material-ui/core/styles';

import type Map from 'mapbox-gl/src/ui/map';
import type {Coordinate, NetworkState} from '../../../shared/dto/NetworkState';
import type {MapProfile} from '../../../shared/dto/MapProfile';
import type {NearbyNodes} from '../../components/mappanels/MapPanelTypes';
import type {RouterHistory} from 'react-router-dom';
import type {Routes} from '../../contexts/RouteContext';

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

const MAPBOX_ACCESS_TOKEN = getUIEnvVal('MAPBOX_ACCESS_TOKEN');
const MapBoxGL = ReactMapboxGl({
  accessToken: MAPBOX_ACCESS_TOKEN,
  attributionControl: false,
});

// Initial map bounding box:
// https://www.mapbox.com/mapbox-gl-js/api/#map#fitbounds
const FIT_BOUND_OPTIONS = {padding: 32, maxZoom: 18, animate: false};

// All supported map styles:
// https://www.mapbox.com/api-documentation/#styles
const DefaultMapBoxStyles = [
  {name: 'Streets', endpoint: 'streets-v10'},
  {name: 'Satellite', endpoint: 'satellite-streets-v10'},
];
const getMapBoxStyleUrl = endpoint => 'mapbox://styles/mapbox/' + endpoint;

// Table size limits (in pixels)
const TABLE_LIMITS = {minHeight: 360, maxHeight: 720};

type Props = {
  classes: {[string]: string},
  location: Location,
  networkConfig: NetworkState,
  networkName: string,
  siteToNodesMap: {[string]: Set<string>},
  match: Object,
  history: RouterHistory,
};

type State = {
  mapRef: ?Map, // reference to Map class
  mapBounds?: [Coordinate, Coordinate],
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

class NetworkMap extends React.Component<Props, State> {
  _mapBoxStyles;

  constructor(props) {
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
      selectedMapStyle: this._mapBoxStyles[0].endpoint,

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
    const customStyles = getUIEnvVal('TILE_STYLE');
    // use default styles if no override specified
    if (!customStyles) {
      return DefaultMapBoxStyles.map(({name, endpoint}) => ({
        name,
        endpoint: getMapBoxStyleUrl(endpoint),
      }));
    }
    // override list of styles if env specified
    // parse style format
    // <Display Name>=<Tile URL>,...
    const tileStyleUrls = customStyles.split(',');
    return tileStyleUrls.map(tileStyle => {
      const [name, endpoint] = tileStyle.split('=');
      return {name, endpoint};
    });
  }

  handleTableResize = height => {
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

  onGeocoderEvent = feature => {
    // Move to a location returned by the geocoder
    const {mapRef} = this.state;
    if (mapRef) {
      const {bbox, center} = feature;
      if (bbox) {
        mapRef.fitBounds([
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ]);
      } else {
        mapRef.flyTo({center});
      }
    }
  };

  updateRoutes = routes => {
    this.setState({routes});
  };

  resetRoutes = () => {
    this.setState({routes: {node: null, links: {}, nodes: new Set()}});
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

  handleStyleLoad = map => {
    this.setState({mapRef: map});
  };

  render() {
    const {classes, match, history, location} = this.props;
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
              <MapContextProvider
                defaultMapMode={MAPMODE.DEFAULT}
                mapboxRef={mapRef}
                mapProfiles={mapProfiles}>
                <MapAnnotationContextProvider>
                  <TgMapboxNavigation
                    accessToken={MAPBOX_ACCESS_TOKEN}
                    mapRef={mapRef}
                    onSelectFeature={this.onGeocoderEvent}
                  />
                  <MapOverlayLegend />
                  <div className={classes.container}>
                    <div className={classes.topContainer}>
                      <MapBoxGL
                        fitBounds={mapBounds}
                        fitBoundsOptions={FIT_BOUND_OPTIONS}
                        style={selectedMapStyle}
                        onStyleLoad={this.handleStyleLoad}
                        containerStyle={{width: '100%', height: 'inherit'}}>
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
                        siteProps={{
                          hideSite: this.hideSite,
                          unhideSite: this.unhideSite,
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
                          selectedElement={context.selectedElement}
                          // fixes this component's usage of withRouter
                          match={match}
                          location={location}
                          history={history}
                          isEmbedded={true}
                          onResize={this.handleTableResize}
                          tableHeight={tableHeight}
                        />
                      </div>
                    )}
                  </div>
                </MapAnnotationContextProvider>
              </MapContextProvider>
            </PlannedSiteContextProvider>
          </RoutesContextProvider>
        )}
      </NetworkContext.Consumer>
    );
  }
}

export default withStyles(styles, {withTheme: true})(withRouter(NetworkMap));
