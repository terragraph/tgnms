/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NetworkContext from '../contexts/NetworkContext';
import axios from 'axios';
import useTaskState, {TASK_STATE} from '../hooks/useTaskState';
import {useCancelToken} from '../hooks/axiosHooks';
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
    const downloadLink = document.createElement('a');
    const data = 'data:text/plain;charset=utf-8,' + encodeURIComponent(csvData);
    downloadLink.href = data;
    downloadLink.download = `${networkName}_${table}.csv`;
    downloadLink.target = '_blank';
    try {
      document.body && document.body.appendChild(downloadLink);
      downloadLink.click();
    } catch (err) {
      setState(TASK_STATE.ERROR);
      throw err;
    } finally {
      setState(TASK_STATE.SUCCESS);
      document.body && document.body.removeChild(downloadLink);
    }
  }, [networkName, cancelToken, table, setState]);
  return {
    exportCSV,
    exportState: state,
  };
}
