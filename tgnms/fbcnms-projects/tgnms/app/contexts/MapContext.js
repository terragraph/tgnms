/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NmsOptionsContext from './NmsOptionsContext';
import useUnmount from '../hooks/useUnmount';
import {getUrlSearchParam} from '../helpers/NetworkUrlHelpers';
import {useLocation} from 'react-router-dom';

import type {
  LayerData,
  Overlay,
  OverlaysConfig,
  SelectedLayersType,
  SelectedOverlays,
} from '../views/map/NetworkMapTypes';

type OverlayMap = LayerData<Overlay>;

export const MAPMODE = {
  DEFAULT: 'DEFAULT',
  HISTORICAL: 'HISTORICAL',
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
  // data to overlay
  overlayData: LayerData<{}>,
  setOverlayData: (LayerData<{}>) => void,
  isOverlayLoading: boolean,
  setIsOverlayLoading: boolean => void,
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
  isOverlayLoading: false,
  setIsOverlayLoading: empty,
};

const context = React.createContext<MapContext>(defaultValue);
export default context;

export type ProviderProps = {|
  children: React.Node,
  defaultMapMode?: string,
  overlayData?: LayerData<{}>,
|};

const defaultSelectedLayers: SelectedLayersType = {
  link_lines: true,
  site_icons: true,
};
export function MapContextProvider({children, defaultMapMode}: ProviderProps) {
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
  const [overlaysConfig, setOverlaysConfig] = React.useState<OverlaysConfig>(
    {},
  );
  const [overlayData, setOverlayData] = React.useState(
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

  // when overlaysConfig is set, swap to default overlays
  const setOverlaysConfigSelectDefaults = React.useCallback(
    (conf: OverlaysConfig) => {
      setOverlaysConfig(conf);

      const selectionUpdate = {};
      if (conf.link_lines && conf.link_lines.defaultOverlayId) {
        selectionUpdate.link_lines = conf.link_lines.defaultOverlayId;
      }
      if (conf.site_icons && conf.site_icons.defaultOverlayId) {
        selectionUpdate.site_icons = conf.site_icons.defaultOverlayId;
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
        const overlay = overlayConfig.overlays.find(
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
        overlayData,
        setOverlayData,
        overlays,
        isOverlayLoading,
        setIsOverlayLoading,
      }}>
      {children}
    </Provider>
  );
}

export function useMapContext(): MapContext {
  const ctx = React.useContext(context);
  return ctx;
}
