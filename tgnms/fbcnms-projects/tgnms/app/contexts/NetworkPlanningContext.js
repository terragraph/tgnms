/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import useRouter from '@fbcnms/ui/hooks/useRouter';
import {
  deleteUrlSearchParam,
  getUrlSearchParam,
  setUrlSearchParam,
} from '@fbcnms/tg-nms/app/helpers/NetworkUrlHelpers';
import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {MapOptionsState} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import type {PlanFolder} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type LngLat = [number, number];
export type BBox = [LngLat, LngLat];

const DEFAULT_MAP_OPTIONS_STATE = {
  enabledStatusTypes: {
    PROPOSED: true,
    UNAVAILABLE: true,
    CANDIDATE: false,
  },
};

type FolderMap = {|[id: number]: PlanFolder|};
export type NetworkPlanningContext = {|
  selectedPlanId: ?string,
  setSelectedPlanId: (planId: ?number | ?string) => void,
  planTopology: ?ANPUploadTopologyType,
  setPlanTopology: ANPUploadTopologyType => void,
  // planSitesFile: Object,
  folders: ?FolderMap,
  setFolders: (((?FolderMap) => ?FolderMap) | ?FolderMap) => void,
  mapOptions: MapOptionsState,
  setMapOptions: (
    (MapOptionsState => MapOptionsState) | MapOptionsState,
  ) => void,
|};

export const PLAN_ID_NEW = '';
const PLAN_ID_QUERY_KEY = 'planid';
const empty = () => {};
const defaultValue: NetworkPlanningContext = {
  selectedPlanId: null,
  setSelectedPlanId: empty,
  planTopology: null,
  setPlanTopology: empty,
  folders: null,
  setFolders: empty,
  mapOptions: DEFAULT_MAP_OPTIONS_STATE,
  setMapOptions: empty,
};

const context = React.createContext<NetworkPlanningContext>(defaultValue);
export default context;

export function useNetworkPlanningContext(): NetworkPlanningContext {
  return React.useContext<NetworkPlanningContext>(context);
}

export type ProviderProps = {|
  children: React.Node,
  planTopology?: ?ANPUploadTopologyType,
  folders?: ?FolderMap,
  mapOptions?: MapOptionsState,
|};

export function NetworkPlanningContextProvider({
  children,
  mapOptions = DEFAULT_MAP_OPTIONS_STATE,
  planTopology = null,
  folders = null,
}: ProviderProps) {
  const {history, location} = useRouter();
  const setSelectedPlanId = React.useCallback(
    (planId: ?number | ?string) => {
      if (planId == null) {
        deleteUrlSearchParam(history, PLAN_ID_QUERY_KEY);
      } else {
        setUrlSearchParam(history, PLAN_ID_QUERY_KEY, planId.toString());
      }
    },
    [history],
  );
  const selectedPlanId = React.useMemo(
    () => getUrlSearchParam(PLAN_ID_QUERY_KEY, location),
    [location],
  );
  const [_mapOptions, setMapOptions] = React.useState<MapOptionsState>(
    mapOptions,
  );
  const [
    _planTopology,
    setPlanTopology,
  ] = React.useState<?ANPUploadTopologyType>(planTopology);
  const [_folders, setFolders] = React.useState<?FolderMap>(folders);

  return (
    <context.Provider
      value={{
        selectedPlanId,
        setSelectedPlanId,
        planTopology: _planTopology,
        setPlanTopology,
        folders: _folders,
        setFolders,
        mapOptions: _mapOptions,
        setMapOptions,
      }}>
      {children}
    </context.Provider>
  );
}
