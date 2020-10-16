/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import RootRef from '@material-ui/core/RootRef';
import axios from 'axios';
import {BUTTON_TYPES} from '../../constants/ScheduleConstants';
import {useSnackbars} from '../../hooks/useSnackbar';

type Props = {
  id: string,
};

export default function ResultExport(props: Props): React.Node {
  const {id} = props;
  const cancelSource = axios.CancelToken.source();
  const anchorRef = React.useRef(null);
  const snackbars = useSnackbars();
  const [exportMenuToggle, setExportMenu] = React.useState(false);

  const exportTestResults = (exportType: string) => {
    return testApi
      .getExecutionResults({
        executionId: id,
        cancelToken: cancelSource.token,
      })
      .then(data => {
        const {results} = data;
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
          fileName = `network_test_results_${id}.csv`;
        } else if (exportType === 'json') {
          fileName = `network_test_results_${id}.json`;
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
      })
      .catch(_ => snackbars.error('Unable to fetch file right now.'))
      .finally(_ => {
        setExportMenu(false);
      });
  };

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
