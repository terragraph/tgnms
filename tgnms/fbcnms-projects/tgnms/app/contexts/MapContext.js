/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NmsOptionsContext from './NmsOptionsContext';
import useUnmount from '../hooks/useUnmount';
import {DEFAULT_MAP_PROFILE} from '../constants/MapProfileConstants';
import {getUrlSearchParam} from '../helpers/NetworkUrlHelpers';
import {useLocation} from 'react-router-dom';

import type Map from 'mapbox-gl/src/ui/map';
import type {Boundary} from '../../shared/dto/NetworkState';
import type {GeoCoord} from '@turf/turf';
import type {
  LayerData,
  MapFeatureTopology,
  Overlay,
  OverlaysConfig,
  SelectedLayersType,
  SelectedOverlays,
} from '../views/map/NetworkMapTypes';
import type {MapProfile} from '../../shared/dto/MapProfile';

type OverlayMap = LayerData<Overlay>;

export const MAPMODE = {
  DEFAULT: 'DEFAULT',
  HISTORICAL: 'HISTORICAL',
  NETWORK_TEST: 'NETWORK_TEST',
  SCAN_SERVICE: 'SCAN_SERVICE',
  CUSTOM_OVERLAYS: 'CUSTOM_OVERLAYS',
  PLANNING: 'PLANNING',
};

export type MapContext = {|
  mapMode: string,
  setMapMode: string => void,
  // layers
  selectedLayers: SelectedLayersType,
  setSelectedLayers: SelectedLayersType => void,
  setIsLayerSelected: (layer_id: string, selected: boolean) => void,
  // currently available overlays to choose from
  overlaysConfig: OverlaysConfig,
  setOverlaysConfig: OverlaysConfig => void,
  // selected overlay ids
  selectedOverlays: SelectedOverlays,
  // set the overlay for a specific layer
  setLayerOverlay: (layer_id: string, overlay_id: string) => void,
  // replace all overlay selections
  setSelectedOverlays: SelectedOverlays => void,
  // instances of the selected overlays
  overlays: OverlayMap,
  mapFeatures: MapFeatureTopology,
  setMapFeatures: (f: MapFeatureTopology) => void,
  // data to overlay
  overlayData: LayerData<{}>,
  setOverlayData: (LayerData<{}>) => void,
  // metadata about topology elements being rendered
  overlayMetadata: LayerData<{}>,
  setOverlayMetadata: (LayerData<{}>) => void,
  isOverlayLoading: boolean,
  setIsOverlayLoading: boolean => void,
  mapProfiles: Array<MapProfile>,
  mapboxRef: ?Map,
  moveMapTo: ({
    bbox?: Boundary,
    center?: GeoCoord,
  }) => void,
|};

const empty = () => {};
const defaultValue: MapContext = {
  mapMode: '',
  setMapMode: empty,
  selectedLayers: {},
  selectedOverlays: {},
  setSelectedLayers: empty,
  setIsLayerSelected: empty,
  setLayerOverlay: empty,
  setSelectedOverlays: empty,
  overlays: {},
  overlaysConfig: {},
  setOverlaysConfig: empty,
  overlayData: {},
  setOverlayData: empty,
  overlayMetadata: {},
  setOverlayMetadata: empty,
  isOverlayLoading: false,
  setIsOverlayLoading: empty,
  mapProfiles: [DEFAULT_MAP_PROFILE],
  mapboxRef: null,
  moveMapTo: () => {},
  mapFeatures: {sites: {}, links: {}, nodes: {}},
  setMapFeatures: empty,
};

const context = React.createContext<MapContext>(defaultValue);
export default context;

export type ProviderProps = {|
  children: React.Node,
  defaultMapMode?: string,
  overlayData?: LayerData<{}>,
  mapProfiles: Array<MapProfile>,
  mapboxRef: ?Map,
|};

const defaultSelectedLayers: SelectedLayersType = {
  link_lines: true,
  site_icons: true,
  alert_popups: true,
};

export function MapContextProvider({
  children,
  defaultMapMode,
  mapboxRef,
  mapProfiles,
}: ProviderProps) {
  const {networkMapOptions, updateNetworkMapOptions} = React.useContext(
    NmsOptionsContext,
  );
  const location = useLocation();
  const {Provider} = context;
  const [mapMode, setMapMode] = React.useState(
    networkMapOptions.mapMode || defaultMapMode || MAPMODE.DEFAULT,
  );
  const [selectedLayers, setSelectedLayers] = React.useState<
    $Shape<SelectedLayersType>,
  >(networkMapOptions.selectedLayers || defaultSelectedLayers);
  const [selectedOverlays, setSelectedOverlays] = React.useState<
    $Shape<SelectedOverlays>,
  >(networkMapOptions.selectedOverlays || {});
  const [isOverlayLoading, setIsOverlayLoading] = React.useState(false);
  const [mapFeatures, setMapFeatures] = React.useState(
    defaultValue.mapFeatures,
  );
  const [overlaysConfig, setOverlaysConfig] = React.useState<OverlaysConfig>(
    {},
  );
  const [overlayData, setOverlayData] = React.useState(
    networkMapOptions.overlayData || {},
  );
  const [overlayMetadata, setOverlayMetadata] = React.useState(
    networkMapOptions.overlayData || {},
  );
  const setIsLayerSelected = React.useCallback(
    (layer_id, selected) =>
      setSelectedLayers(prev => ({...prev, [layer_id]: selected})),
    [setSelectedLayers],
  );
  const setLayerOverlay = React.useCallback(
    (layer_id, overlay_id) =>
      setSelectedOverlays(prev => ({...prev, [layer_id]: overlay_id})),
    [setSelectedOverlays],
  );

  React.useEffect(() => {
    const urlMapMode = getUrlSearchParam('mapMode', location);
    if (!urlMapMode) {
      return;
    }
    //clear persisted overlays if loading to map with nondefault mapmode
    updateNetworkMapOptions({
      selectedOverlays: undefined,
    });
    if (urlMapMode !== mapMode) {
      setMapMode(urlMapMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMapModeDecorated = React.useCallback(
    (mode: string) => {
      setMapMode(mode);
      updateNetworkMapOptions({
        selectedOverlays: undefined,
        overlayData: {},
      });
    },
    [updateNetworkMapOptions, setMapMode],
  );

  const moveMapTo = React.useCallback(
    ({bbox, center}: {bbox?: Boundary, center?: GeoCoord}) => {
      // Move to a location returned by the geocoder
      if (mapboxRef) {
        if (bbox) {
          mapboxRef.fitBounds([
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ]);
        } else {
          mapboxRef.flyTo({center});
        }
      }
    },
    [mapboxRef],
  );

  // when overlaysConfig is set, swap to default overlays
  const setOverlaysConfigSelectDefaults = React.useCallback(
    (conf: OverlaysConfig) => {
      setOverlaysConfig(conf);
      const selectionUpdate = {};
      for (const layerId in conf) {
        const layerConf = conf[layerId];
        if (typeof layerConf.defaultOverlayId === 'string') {
          selectionUpdate[layerId] = layerConf.defaultOverlayId;
        }
      }
      if (!networkMapOptions.selectedOverlays) {
        setSelectedOverlays(curr => ({...curr, ...selectionUpdate}));
      }
    },
    [setOverlaysConfig, setSelectedOverlays, networkMapOptions],
  );

  /**
   * get the currently selected overlay configs and pass them to the render
   * layers
   */
  const overlays = React.useMemo<OverlayMap>(() => {
    const map: $Shape<OverlayMap> = {};
    for (const layer_id in selectedOverlays) {
      const selectedOverlayId: string = selectedOverlays[layer_id];
      const overlayConfig = overlaysConfig[layer_id];
      if (overlayConfig) {
        const overlay = overlayConfig?.overlays?.find(
          o => o.id === selectedOverlayId,
        );
        map[layer_id] = overlay;
      }
    }
    return map;
  }, [selectedOverlays, overlaysConfig]);

  // when this component unmounts, persist the network map options
  useUnmount(() => {
    updateNetworkMapOptions({
      selectedLayers,
      selectedOverlays,
      mapMode,
      overlayData,
    });
  });

  return (
    <Provider
      value={{
        mapMode,
        setMapMode: setMapModeDecorated,
        selectedLayers,
        setSelectedLayers,
        setIsLayerSelected,
        selectedOverlays,
        setLayerOverlay,
        setSelectedOverlays,
        overlaysConfig,
        setOverlaysConfig: setOverlaysConfigSelectDefaults,
        mapFeatures,
        setMapFeatures,
        overlayData,
        setOverlayData,
        overlayMetadata,
        setOverlayMetadata,
        overlays,
        isOverlayLoading,
        setIsOverlayLoading,
        mapProfiles,
        mapboxRef,
        moveMapTo,
      }}>
      {children}
    </Provider>
  );
}

export function useMapContext(): MapContext {
  const ctx = React.useContext(context);
  return ctx;
}
