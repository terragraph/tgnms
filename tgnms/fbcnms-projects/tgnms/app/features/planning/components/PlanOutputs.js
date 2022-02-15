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

import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';

export default function PlanOutputs({files}: {files: Array<ANPFileHandle>}) {
  return (
    <Grid item container direction="column">
      {files &&
        files.map(file => {
          /**
            ANP filenames have a format like:
            (6_Report KPIs & Financial Metrics) reporting_graph_json
            This strips off the parentheses and everything inside them
           */
          const shortFileName = file.file_name.replace(/(\(.+\))/, '');
          return (
            <Grid key={file.id} item container justifyContent="space-between">
              <Grid item>
                <Typography>{shortFileName}</Typography>
              </Grid>
              <Grid item>
                <ANPFileDownloadButton file={file} />
              </Grid>
            </Grid>
          );
        })}
    </Grid>
  );
}
