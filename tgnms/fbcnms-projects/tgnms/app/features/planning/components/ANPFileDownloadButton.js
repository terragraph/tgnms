/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import GetAppIcon from '@material-ui/icons/GetApp';
import IconButton from '@material-ui/core/IconButton';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';

export default function DownloadButton({file}: {file: ANPFileHandle}) {
  return (
    <IconButton
      size="small"
      edge="end"
      component="a"
      href={`/network_plan/file/${file.id}`}
      title={`Download ${file.file_name}`}
      target="_blank"
      rel="noopener">
      <GetAppIcon />
    </IconButton>
  );
}
