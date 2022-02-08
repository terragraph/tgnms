/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {PLANNING_FOLDER_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {matchPath, useLocation} from 'react-router-dom';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';

import type {FileRoles} from '@fbcnms/tg-nms/shared/dto/ANP';

import type {
  InputFile,
  NetworkPlan,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type PlanFormState = {|
  id: number,
  name: string,
  dsm?: ?InputFile,
  siteList?: ?InputFile,
  boundary?: ?InputFile,
  hardwareBoardIds?: ?Array<string>,
|};

export function usePlanningFolderId(): string {
  const location = useLocation();
  const match = matchPath(location.pathname, {
    path: PLANNING_FOLDER_PATH,
  });
  return match?.params?.folderId ?? '';
}

/**
 * Loads the folders list if it's not already cached
 */
export function useFolders() {
  const {folders, setFolders} = useNetworkPlanningContext();
  const loadfoldersTask = useTaskState();
  React.useEffect(() => {
    (async () => {
      try {
        if (folders == null) {
          loadfoldersTask.setState(TASK_STATE.LOADING);
          const _folders = await networkPlanningAPIUtil.getFolders();
          const folderLookup = _folders.reduce((map, folder) => {
            map[folder.id] = folder;
            return map;
          }, {});
          setFolders(folderLookup);
          loadfoldersTask.setState(TASK_STATE.SUCCESS);
        }
      } catch (err) {
        loadfoldersTask.setState(TASK_STATE.ERROR);
      }
    })();
  }, [setFolders, folders, loadfoldersTask]);

  return {
    folders,
    setFolders,
    taskState: loadfoldersTask,
  };
}

export function useFolderPlans({folderId}: {folderId: string}) {
  const [plans, setPlans] = React.useState<?Array<NetworkPlan>>();
  const loadPlansTask = useTaskState();
  const [lastRefreshDate, setLastRefreshDate] = React.useState(
    new Date().getTime(),
  );
  const refresh = React.useCallback(
    () => setLastRefreshDate(new Date().getTime()),
    [],
  );
  React.useEffect(() => {
    (async () => {
      if (isNullOrEmptyString(folderId)) {
        return;
      }
      try {
        loadPlansTask.setState(TASK_STATE.LOADING);
        const _plans = await networkPlanningAPIUtil.getPlansInFolder({
          folderId: folderId,
        });
        setPlans(_plans);
        loadPlansTask.setState(TASK_STATE.SUCCESS);
      } catch (err) {
        loadPlansTask.setState(TASK_STATE.ERROR);
      }
    })();
  }, [folderId, lastRefreshDate, loadPlansTask]);

  return {
    plans,
    refresh,
    taskState: loadPlansTask,
  };
}

export function useInputFiles({role}: {role: FileRoles}) {
  const [files, setFiles] = React.useState<Array<InputFile>>([]);
  const loadFilesTask = useTaskState();
  React.useEffect(() => {
    (async () => {
      try {
        loadFilesTask.setState(TASK_STATE.LOADING);
        const _files = await networkPlanningAPIUtil.getInputFiles({role});
        setFiles(_files);
        loadFilesTask.setState(TASK_STATE.SUCCESS);
      } catch (err) {
        loadFilesTask.setState(TASK_STATE.ERROR);
        loadFilesTask.setMessage(err.message);
      }
    })();
  }, [role, loadFilesTask, setFiles]);
  return {
    files,
    task: loadFilesTask,
  };
}
