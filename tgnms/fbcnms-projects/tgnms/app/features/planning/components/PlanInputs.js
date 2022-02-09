/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import ANPFileDownloadButton from './ANPFileDownloadButton';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';

export default function PlanInputs({files}: {files: Array<ANPFileHandle>}) {
  const dsm = files.find(x => x?.file_role === FILE_ROLE.DSM_GEOTIFF);
  const sites = files.find(x => x?.file_role === FILE_ROLE.URBAN_SITE_FILE);
  const boundary = files.find(x => x?.file_role === FILE_ROLE.BOUNDARY_FILE);
  return (
    <Grid item container direction="column">
      {dsm && (
        <Grid
          item
          container
          justifyContent="space-between"
          alignContent="center">
          <Grid item>
            <Typography>DSM</Typography>
          </Grid>
          <Grid item>
            <Typography>
              {dsm.file_name} <ANPFileDownloadButton file={dsm} />
            </Typography>
          </Grid>
        </Grid>
      )}
      {sites && (
        <Grid item container justifyContent="space-between">
          <Grid item>
            <Typography>Sites</Typography>
          </Grid>
          <Grid item>
            <Typography>
              {sites.file_name} <ANPFileDownloadButton file={sites} />
            </Typography>
          </Grid>
        </Grid>
      )}
      {boundary && (
        <Grid item container justifyContent="space-between">
          <Grid item>
            <Typography>Boundary</Typography>
          </Grid>
          <Grid item>
            <Typography>
              {boundary.file_name} <ANPFileDownloadButton file={boundary} />
            </Typography>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}
