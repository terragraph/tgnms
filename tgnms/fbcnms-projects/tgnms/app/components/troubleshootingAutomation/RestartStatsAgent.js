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
