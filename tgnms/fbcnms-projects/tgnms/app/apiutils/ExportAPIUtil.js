/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as FileSaver from 'file-saver';
import * as React from 'react';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import axios from 'axios';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {useCancelToken} from '@fbcnms/tg-nms/app/hooks/axiosHooks';

import type {CancelToken} from 'axios';

export async function exportFileType({
  networkName,
  table,
  fileType,
  cancelToken,
}: {
  networkName: string,
  table: string,
  fileType: 'csv', //only csv is supported currently
  cancelToken: CancelToken,
}): Promise<string> {
  const response = await axios.get<void, string>(
    `/export/${networkName}/${table}/${fileType}`,
    {
      cancelToken,
    },
  );
  return response.data;
}

export function useExport({table}: {table: string}) {
  const {cancelToken} = useCancelToken();
  const {state, setState} = useTaskState();
  const {networkName} = React.useContext(NetworkContext);
  const exportCSV = React.useCallback(async () => {
    setState(TASK_STATE.LOADING);
    const csvData = await exportFileType({
      fileType: 'csv',
      networkName,
      table,
      cancelToken,
    });

    try {
      const blob = new Blob([csvData], {
        type: 'text/plain;charset=utf-8',
      });
      FileSaver.saveAs(blob, `${networkName}_${table}.csv`);
    } catch (err) {
      setState(TASK_STATE.ERROR);
      throw err;
    } finally {
      setState(TASK_STATE.SUCCESS);
    }
  }, [networkName, cancelToken, table, setState]);
  return {
    exportCSV,
    exportState: state,
  };
}
