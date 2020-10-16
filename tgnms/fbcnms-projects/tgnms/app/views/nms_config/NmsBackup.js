/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import NmsExportForm from './NmsExportForm';
import NmsImportForm from './NmsImportForm';

export default function NmsBackup() {
  return (
    <Grid container direction="column" spacing={2}>
      <Grid item>
        <NmsExportForm />
      </Grid>
      <Grid item>
        <NmsImportForm />
      </Grid>
    </Grid>
  );
}
