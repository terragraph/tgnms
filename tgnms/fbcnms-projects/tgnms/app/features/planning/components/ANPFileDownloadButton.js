/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import GetAppIcon from '@material-ui/icons/GetApp';
import IconButton from '@material-ui/core/IconButton';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';

export default function ANPFileDownloadButton({file}: {file: ANPFileHandle}) {
  return (
    <IconButton
      size="small"
      edge="end"
      component="a"
      disabled={file.id == null}
      href={`/network_plan/file/${file.id}/anp-download`}
      title={`Download ${file.file_name}`}
      target="_blank"
      rel="noopener">
      <GetAppIcon />
    </IconButton>
  );
}
