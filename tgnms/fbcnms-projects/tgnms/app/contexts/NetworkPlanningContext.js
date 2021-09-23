/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import useRouter from '@fbcnms/ui/hooks/useRouter';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  deleteUrlSearchParam,
  getUrlSearchParam,
  setUrlSearchParam,
} from '@fbcnms/tg-nms/app/helpers/NetworkUrlHelpers';
import {useStateWithTaskState} from '@fbcnms/tg-nms/app/helpers/ContextHelpers';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {MapOptionsState} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {PlanFolder} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {SetState} from '@fbcnms/tg-nms/app/helpers/ContextHelpers';
import type {TaskState} from '@fbcnms/tg-nms/app/hooks/useTaskState';

export type LngLat = [number, number];
export type BBox = [LngLat, LngLat];
const DEFAULT_MAP_OPTIONS_STATE = {
  enabledStatusTypes: {
    PROPOSED: true,
    UNAVAILABLE: true,
    CANDIDATE: false,
  },
};

const DEFAULT_PENDING_TOPOLOGY = {
  links: new Set(),
  sites: new Set(),
};

export type PendingTopology = {
  links: Set<string>,
  sites: Set<string>,
};

type FolderMap = {|[id: number]: PlanFolder|};

export type NetworkPlanningContext = {|
  // The currently selected plan ID.
  selectedPlanId: ?string,
  setSelectedPlanId: (planId: ?number | ?string) => void,

  // The current network plan.
  plan: ?NetworkPlan,
  setPlan: SetState<?NetworkPlan>,
  loadPlanTask: TaskState,

  // The raw, unfiltered topology of the plan.
  // (i.e. this should be the unedited output of reporting graph)
  planTopology: ?ANPUploadTopologyType,
  setPlanTopology: SetState<?ANPUploadTopologyType>,

  // The currently selected batch of folders.
  folders: ?FolderMap,
  setFolders: SetState<?FolderMap>,

  // The current map filter selections.
  mapOptions: MapOptionsState,
  setMapOptions: SetState<MapOptionsState>,

  // The next time to trigger a refresh.
  refreshDate: ?number,
  setRefreshDate: SetState<?number>,

  // Represents the sites and links that have been selected for commit.
  // This may included elements that have already been committed to the
  // network. Deduplication is done inside getPendingTopology.
  _pendingTopology: PendingTopology,
  _setPendingTopology: SetState<PendingTopology>,

  // I/O files states
  inputFiles: ?Array<ANPFileHandle>,
  setInputFiles: SetState<?Array<ANPFileHandle>>,
  loadInputFilesTask: TaskState,

  outputFiles: ?Array<ANPFileHandle>,
  setOutputFiles: SetState<?Array<ANPFileHandle>>,
  loadOutputFilesTask: TaskState,

  downloadOutputTask: TaskState,
|};

export const PLAN_ID_NEW = '';
const PLAN_ID_QUERY_KEY = 'planid';
const empty = () => {};
const emptyTask: $Shape<TaskState> = {};
const defaultValue: NetworkPlanningContext = {
  selectedPlanId: null,
  setSelectedPlanId: empty,
  plan: null,
  setPlan: empty,
  loadPlanTask: emptyTask,
  planTopology: null,
  setPlanTopology: empty,
  folders: null,
  setFolders: empty,
  mapOptions: DEFAULT_MAP_OPTIONS_STATE,
  setMapOptions: empty,
  refreshDate: null,
  setRefreshDate: empty,
  _pendingTopology: DEFAULT_PENDING_TOPOLOGY,
  _setPendingTopology: empty,
  inputFiles: null,
  setInputFiles: empty,
  loadInputFilesTask: emptyTask,
  outputFiles: null,
  setOutputFiles: empty,
  loadOutputFilesTask: emptyTask,
  downloadOutputTask: emptyTask,
};

const context = React.createContext<NetworkPlanningContext>(defaultValue);
export default context;

export function useNetworkPlanningContext(): NetworkPlanningContext {
  return React.useContext<NetworkPlanningContext>(context);
}

export type NetworkPlanningContextProviderProps = {|
  children: React.Node,
  planTopology?: ?ANPUploadTopologyType,
  setPlanTopology?: () => void,
  folders?: ?FolderMap,
  mapOptions?: MapOptionsState,
  setMapOptions?: () => void,
  plan?: ?NetworkPlan,
|};

/**
 * The developer has the option to pass in the state object, or
 * we will create it for them. Typically you'd only need to pass in manually
 * when testing (see useNetworkPlanningManager-test.js).
 */
export function NetworkPlanningContextProvider({
  children,
  mapOptions = null,
  setMapOptions = null,
  planTopology = null,
  setPlanTopology = null,
  folders = null,
  plan = null,
}: NetworkPlanningContextProviderProps) {
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

  // Create map options state
  if (!!mapOptions != !!setMapOptions)
    throw new Error('Supply both mapOptions and setMapOptions, or neither.');
  const [_mapOptions, _setMapOptions] = React.useState<MapOptionsState>(
    DEFAULT_MAP_OPTIONS_STATE,
  );

  // Create plan topology state
  if (!!planTopology != !!setPlanTopology) {
    throw new Error(
      'Supply both planTopology and setPlanTopology, or neither.',
    );
  }
  const [
    _planTopology,
    _setPlanTopology,
  ] = React.useState<?ANPUploadTopologyType>();

  // Create pending topology state.
  const [
    _pendingTopology,
    _setPendingTopology,
  ] = React.useState<PendingTopology>(DEFAULT_PENDING_TOPOLOGY);

  // Create plan state.
  const {
    obj: _plan,
    setter: _setPlan,
    taskState: loadPlanTask,
  } = useStateWithTaskState<?NetworkPlan>(plan);

  // Create I/O files and task states.
  const {
    obj: inputFiles,
    setter: setInputFiles,
    taskState: loadInputFilesTask,
  } = useStateWithTaskState<?Array<ANPFileHandle>>(null);
  const {
    obj: outputFiles,
    setter: setOutputFiles,
    taskState: loadOutputFilesTask,
  } = useStateWithTaskState<?Array<ANPFileHandle>>(null);
  const downloadOutputTask = useTaskState();

  // Other state objects.
  const [_folders, setFolders] = React.useState<?FolderMap>(folders);
  const [refreshDate, setRefreshDate] = React.useState(new Date().getTime());
  return (
    <context.Provider
      value={{
        selectedPlanId,
        setSelectedPlanId,
        plan: _plan,
        setPlan: _setPlan,
        loadPlanTask,
        planTopology: planTopology ? planTopology : _planTopology,
        setPlanTopology: setPlanTopology ? setPlanTopology : _setPlanTopology,
        folders: _folders,
        setFolders,
        mapOptions: mapOptions ? mapOptions : _mapOptions,
        setMapOptions: setMapOptions ? setMapOptions : _setMapOptions,
        refreshDate,
        setRefreshDate,

        // I/O files
        inputFiles,
        setInputFiles,
        loadInputFilesTask,
        outputFiles,
        setOutputFiles,
        loadOutputFilesTask,

        downloadOutputTask,

        // Hidden "internal" fields, that should NOT BE ACCESSED
        // by anyone BUT useNetworkPlanningManager.
        _pendingTopology,
        _setPendingTopology,
      }}>
      {children}
    </context.Provider>
  );
}
