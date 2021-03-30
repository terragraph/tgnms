/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as scanApi from '../../apiutils/ScanServiceAPIUtil';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import RootRef from '@material-ui/core/RootRef';
import axios from 'axios';
import {BUTTON_TYPES} from '../../constants/ScheduleConstants';
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {useSnackbars} from '../../hooks/useSnackbar';
import type {ExecutionResultDataType as ScanDataType} from '../../../shared/dto/ScanServiceTypes';
import type {ExecutionResultDataType as TestDataType} from '../../../shared/dto/NetworkTestTypes';

type Props = {
  id: string,
};

type ExecutionResultDataType = $Shape<ScanDataType & TestDataType>;

export default function ResultExport(props: Props): React.Node {
  const {id} = props;
  const cancelSource = axios.CancelToken.source();
  const anchorRef = React.useRef(null);
  const snackbars = useSnackbars();
  const [exportMenuToggle, setExportMenu] = React.useState(false);
  const {mapMode} = useMapContext();

  const fetchData = React.useCallback(async () => {
    try {
      if (mapMode === MAPMODE.SCAN_SERVICE) {
        const data = await scanApi.getExecutionResults({
          executionId: id,
          cancelToken: cancelSource.token,
        });
        return objectValuesTypesafe<ScanDataType>(data.results);
      } else {
        const data = await testApi.getExecutionResults({
          executionId: id,
          cancelToken: cancelSource.token,
        });
        return data.results;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [id, mapMode, cancelSource]);

  const exportTestResults = React.useCallback(
    async (exportType: string) => {
      const results: ?Array<ExecutionResultDataType> = await fetchData();
      if (!results) {
        snackbars.error('Unable to fetch file right now.');
        setExportMenu(false);
        return;
      }

      let blob = null;
      let fileName = '';
      if (exportType === 'csv') {
        const replaceNull = (key, value) => (value === null ? '' : value);
        const fields = Object.keys(results[0]);
        let csvData = results?.map(row => {
          return fields
            .map(fieldName => {
              return JSON.stringify(row[fieldName], replaceNull);
            })
            .join(',');
        });
        csvData?.unshift(fields.join(','));
        csvData = csvData?.join('\r\n');
        blob = new Blob([csvData], {type: 'octet/stream'});
        fileName = `${
          mapMode === MAPMODE.SCAN_SERVICE ? 'scan' : 'network_test'
        }_results_${id}.csv`;
      } else if (exportType === 'json') {
        fileName = `${
          mapMode === MAPMODE.SCAN_SERVICE ? 'scan' : 'network_test'
        }_results_${id}.json`;
        blob = new Blob([JSON.stringify(results, null, 2)], {
          type: 'octet/stream',
        });
      }

      const anchor = document.createElement('a');
      window.document.body.appendChild(anchor);
      anchor.style.display = 'none';
      const url = window.URL.createObjectURL(blob);
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);

      setExportMenu(false);
    },
    [fetchData, id, mapMode, snackbars],
  );

  return (
    <>
      <RootRef rootRef={anchorRef}>
        <Button
          aria-haspopup="true"
          onClick={() => setExportMenu(true)}
          data-testid="download-button">
          {BUTTON_TYPES.download}
        </Button>
      </RootRef>
      <Menu
        keepMounted
        autoFocus={false}
        open={exportMenuToggle}
        onClose={() => setExportMenu(false)}
        anchorEl={anchorRef.current}>
        <MenuItem onClick={_ => exportTestResults('csv')}>CSV</MenuItem>
        <MenuItem onClick={_ => exportTestResults('json')}>JSON</MenuItem>
      </Menu>
    </>
  );
}
