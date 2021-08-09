/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import ShowAdvanced from '../common/ShowAdvanced';
import TextField from '@material-ui/core/TextField';

import type {ScheduleParamsType} from './SchedulerTypes';

type Props = {
  scheduleParams: ScheduleParamsType,
};

export default function ScheduleParams(props: Props) {
  const {typeSelector, itemSelector, advancedParams} = props.scheduleParams;

  const context = React.useContext(NetworkContext);

  return (
    <FormGroup row={false}>
      <Grid container direction="column" spacing={2}>
        <Grid item container direction="row" spacing={2}>
          <Grid item xs={6}>
            <FormLabel component="legend">
              <span>Type</span>
            </FormLabel>
            {typeSelector}
          </Grid>
          <Grid item container direction="column" spacing={1} xs={6}>
            <Grid item>
              <FormLabel component="legend">
                <span>Item</span>
              </FormLabel>
              {itemSelector}
            </Grid>
            {!itemSelector && (
              <Grid item>
                <TextField
                  disabled
                  value={context.networkName}
                  InputProps={{disableUnderline: true}}
                  margin="dense"
                  fullWidth
                />
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid item>
          <ShowAdvanced title="Advanced Settings" children={advancedParams} />
        </Grid>
      </Grid>
    </FormGroup>
  );
}
