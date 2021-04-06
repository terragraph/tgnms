/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import TroubleshootWarning from './TroubleshootWarning';

export default function HardwareChange() {
  return (
    <TroubleshootWarning
      isToolTip={true}
      title="Hardware Change"
      modalContent={
        <Grid container spacing={3}>
          <Grid item container>
            <Grid item>
              It seems that the hardware for this node has been changed.
            </Grid>
            <Grid item>
              Make sure the correct MAC address and config params for this new
              hardware are set.
            </Grid>
          </Grid>
        </Grid>
      }
    />
  );
}
