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
import type {
  NetworkPlan,
  PlanFolder,
  SitesFile,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
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

const DEFAULT_PENDING_TOPOLOGY: PendingTopology = {
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
  // network. Deduplication is done inside getTopologyToCommit.
  _pendingTopology: PendingTopology,
  _setPendingTopology: SetState<PendingTopology>,
  // Represents the UN-EXPANDED count of the selected topology elements.
  // This doesn't include the sites implicitely added by selecting links.
  _pendingTopologyCount: number,
  _setPendingTopologyCount: SetState<number>,

  // I/O files states
  inputFiles: ?Array<ANPFileHandle>,
  setInputFiles: SetState<?Array<ANPFileHandle>>,
  loadInputFilesTask: TaskState,

  outputFiles: ?Array<ANPFileHandle>,
  setOutputFiles: SetState<?Array<ANPFileHandle>>,
  loadOutputFilesTask: TaskState,
  downloadOutputTask: TaskState,

  // sites-file editor
  sitesFile: ?SitesFile,
  setSitesFile: SetState<?SitesFile>,
  sitesFileTask: TaskState,
  selectedSites: Array<number>,
  setSelectedSites: SetState<Array<number>>,
  pendingSitesFile: ?SitesFile,
  setPendingSitesFile: SetState<?SitesFile>,
  pendingSitesFileTask: TaskState,
|};

export const PLAN_ID_NEW = '';
export const PLAN_ID_QUERY_KEY = 'planid';
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
  _pendingTopologyCount: 0,
  _setPendingTopologyCount: empty,
  inputFiles: null,
  setInputFiles: empty,
  loadInputFilesTask: emptyTask,
  outputFiles: null,
  setOutputFiles: empty,
  loadOutputFilesTask: emptyTask,
  downloadOutputTask: emptyTask,
  sitesFile: null,
  setSitesFile: empty,
  sitesFileTask: emptyTask,
  selectedSites: [],
  setSelectedSites: empty,
  pendingSitesFile: null,
  setPendingSitesFile: empty,
  pendingSitesFileTask: emptyTask,
};

const context = React.createContext<NetworkPlanningContext>(defaultValue);
export default context;

export function useNetworkPlanningContext(): NetworkPlanningContext {
  return React.useContext<NetworkPlanningContext>(context);
}

export type NetworkPlanningContextProviderProps = {|
  children: React.Node,
  planTopology?: ?ANPUploadTopologyType,
  pendingTopology?: PendingTopology,
  setPlanTopology?: () => void,
  folders?: ?FolderMap,
  mapOptions?: MapOptionsState,
  setMapOptions?: () => void,
  plan?: ?NetworkPlan,
  /**
   * Only use this for testing
   */
  __ref?: {current: ?NetworkPlanningContext},
|};

/**
 * The developer has the option to pass in the state object, or
 * we will create it for them. Typically you'd only need to pass in manually
 * when testing (see useNetworkPlanningManager-test.js).
 */
export function NetworkPlanningContextProvider({
  children,
  mapOptions: overrideMapOptions = null,
  setMapOptions: overrideSetMapOptions = null,
  planTopology: overridePlanTopology = null,
  setPlanTopology: overrideSetPlanTopology = null,
  pendingTopology: overridePendingTopology = null,
  folders = null,
  plan = null,
  __ref = null,
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
  if (overrideSetMapOptions && !overrideMapOptions) {
    throw new Error(
      'If you input setMapOptions, you have to include mapOptions as well.',
    );
  }
  const [_mapOptions, _setMapOptions] = React.useState<MapOptionsState>(
    overrideMapOptions || DEFAULT_MAP_OPTIONS_STATE,
  );
  const [mapOptions, setMapOptions] = overrideSetMapOptions
    ? [overrideMapOptions, overrideSetMapOptions]
    : [_mapOptions, _setMapOptions];

  // Create plan topology state
  if (overrideSetPlanTopology && !overridePlanTopology) {
    throw new Error(
      'If you input setPlanTopology, you have to include planTopology as well.',
    );
  }
  const [
    _planTopology,
    _setPlanTopology,
  ] = React.useState<?ANPUploadTopologyType>(overridePlanTopology);
  const [planTopology, setPlanTopology] = overrideSetPlanTopology
    ? [overridePlanTopology, overrideSetPlanTopology]
    : [_planTopology, _setPlanTopology];

  // Create pending topology state. These are private because they should
  // only be used in conjunction with useNetworkPlanningManager
  const [
    _pendingTopology,
    _setPendingTopology,
  ] = React.useState<PendingTopology>(
    overridePendingTopology || DEFAULT_PENDING_TOPOLOGY,
  );
  const [_pendingTopologyCount, _setPendingTopologyCount] = React.useState(0);

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

  const {
    obj: sitesFile,
    setter: setSitesFile,
    taskState: sitesFileTask,
  } = useStateWithTaskState<?SitesFile>(null);
  const {
    obj: pendingSitesFile,
    setter: setPendingSitesFile,
    taskState: pendingSitesFileTask,
  } = useStateWithTaskState<?SitesFile>(null);

  const [selectedSites, setSelectedSites] = React.useState<Array<number>>([]);
  // Other state objects.
  const [_folders, setFolders] = React.useState<?FolderMap>(folders);
  const [refreshDate, setRefreshDate] = React.useState(new Date().getTime());
  const contextVal = {
    selectedPlanId,
    setSelectedPlanId,
    plan: _plan,
    setPlan: _setPlan,
    loadPlanTask,
    // Use overrides if passed in.
    planTopology,
    setPlanTopology,
    folders: _folders,
    setFolders,
    // Use overrides if passed in.
    mapOptions,
    setMapOptions,
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
    _pendingTopologyCount,
    _setPendingTopologyCount,

    // sites file
    sitesFile,
    setSitesFile,
    sitesFileTask,
    selectedSites,
    setSelectedSites,
    /**
     * pendingSitesFile will be synced to the backend by SitesFileTable
     * when changed
     */
    pendingSitesFile,
    setPendingSitesFile,
    pendingSitesFileTask,
  };
  React.useEffect(() => {
    if (__ref != null) {
      __ref.current = contextVal;
    }
  });
  return <context.Provider value={contextVal}>{children}</context.Provider>;
}
