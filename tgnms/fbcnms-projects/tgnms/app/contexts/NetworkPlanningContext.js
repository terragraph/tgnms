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
import type {PlanFolder} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type LngLat = [number, number];
export type BBox = [LngLat, LngLat];

type FolderMap = {|[id: number]: PlanFolder|};
export type NetworkPlanningContext = {|
  selectedPlanId: ?string,
  setSelectedPlanId: (planId: ?number | ?string) => void,
  planTopology: ?ANPUploadTopologyType,
  setPlanTopology: ANPUploadTopologyType => void,
  // planSitesFile: Object,
  folders: ?FolderMap,
  setFolders: (((?FolderMap) => ?FolderMap) | ?FolderMap) => void,
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
};

const context = React.createContext<NetworkPlanningContext>(defaultValue);
export default context;

export function useNetworkPlanningContext(): NetworkPlanningContext {
  return React.useContext<NetworkPlanningContext>(context);
}

export function NetworkPlanningContextProvider({
  children,
}: {
  children: React.Node,
}) {
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
  const [
    planTopology,
    setPlanTopology,
  ] = React.useState<?ANPUploadTopologyType>(null);
  const [folders, setFolders] = React.useState<?FolderMap>(null);
  return (
    <context.Provider
      value={{
        selectedPlanId,
        setSelectedPlanId,
        planTopology,
        setPlanTopology,
        folders,
        setFolders,
      }}>
      {children}
    </context.Provider>
  );
}
