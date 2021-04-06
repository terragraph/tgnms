/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import TroubleshootWarning from './TroubleshootWarning';

export default function NodeOffline() {
  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Node Offline"
      modalContent={
        <Grid container spacing={3}>
          <Grid item container>
            <Grid item>A node can be offline for a variety of reasons.</Grid>
            <Grid item>First check that all MAC addresses are correct.</Grid>
            <Grid item>
              If these are correct, then verify that the controller URL on the
              node is correct.
            </Grid>
            <Grid item>
              Verify minion on node is running and reporting status to
              controller.
            </Grid>
            <Grid item>
              Attempt to ping controller from the node. If the controller is
              pingable check TCP port 7007 is open.
            </Grid>
          </Grid>
        </Grid>
      }
    />
  );
}
