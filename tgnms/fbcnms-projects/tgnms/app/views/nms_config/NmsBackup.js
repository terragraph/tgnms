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
