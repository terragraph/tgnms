/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import TroubleshootWarning from './TroubleshootWarning';

export default function RestartStatsAgent() {
  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Execution with null data"
      modalContent={
        <Grid container spacing={3}>
          <Grid item container>
            <Grid item>
              When a successful scan or test execution result has all failed
              data, this is a sign that the stats agent container must be
              restarted.
            </Grid>
            <Grid item>
              After restarting stats agent, alive links and nodes should provide
              valid execution results.
            </Grid>
          </Grid>
        </Grid>
      }
    />
  );
}
