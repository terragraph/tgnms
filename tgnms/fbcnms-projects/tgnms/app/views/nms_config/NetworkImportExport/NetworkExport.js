/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as FileSaver from 'file-saver';
import FileDownloadIcon from '@material-ui/icons/CloudDownload';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';

import type {NetworkInstanceConfig} from '@fbcnms/tg-nms/shared/dto/NetworkState';

import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

type Props = {
  networkConfig: NetworkInstanceConfig,
  onComplete: () => any,
};

export default function NetworkExport({networkConfig, onComplete}: Props) {
  const snackbars = useSnackbars();

  const handleJSONTopologyExport = async (networkName: string) => {
    try {
      const response = await apiRequest({
        networkName,
        endpoint: 'getTopology',
      });
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json',
      });

      FileSaver.saveAs(blob, `${networkName}_topology.json`);
    } catch (err) {
      const errorText = err?.response?.data?.message
        ? err.response.data.message
        : 'Unable to export json topology.';
      snackbars.error(errorText);
    }
  };

  return (
    <MenuItem
      onClick={async () => {
        await handleJSONTopologyExport(networkConfig.name);
        onComplete();
      }}>
      <ListItemIcon>
        <FileDownloadIcon />
      </ListItemIcon>
      <ListItemText primary="JSON Topology Export" />
    </MenuItem>
  );
}
