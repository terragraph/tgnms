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
import InputAdornment from '@material-ui/core/InputAdornment';
import SettingsGroup from '../SettingsGroup';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import type {HandleRangeChange} from './MapProfileForm';
import type {McsLinkBudget} from '@fbcnms/tg-nms/shared/dto/MapProfile';

export default function McsTableEditor({
  mcsTable,
  onRangeChange,
  disabled,
}: {
  mcsTable: {|[string]: McsLinkBudget|},
  onRangeChange: HandleRangeChange,
  disabled?: boolean,
}) {
  const handleRangeChange = React.useCallback(
    (e: SyntheticInputEvent<HTMLInputElement>) => {
      const mcs = parseInt(e.target.name);
      const range = parseInt(e.target.value);
      onRangeChange(mcs, range);
    },
    [onRangeChange],
  );
  return (
    <SettingsGroup
      title="MCS Estimate"
      description="Set the maximum budgeted range of each MCS Index.">
      <Grid xs={12} item container direction="column" spacing={1}>
        <Grid item container alignItems="center" xs={8}>
          <Grid item xs={2}>
            <Typography variant="subtitle2" color="textSecondary">
              MCS
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="subtitle2" color="textSecondary">
              Range
            </Typography>
          </Grid>
        </Grid>
        {objectValuesTypesafe(mcsTable).map(def => {
          return (
            <Grid
              item
              key={def.mcs}
              container
              alignItems="center"
              xs={8}
              spacing={2}>
              <Grid item xs={2}>
                <Typography color="textSecondary">{def.mcs}</Typography>
              </Grid>
              <Grid item xs={5}>
                <TextField
                  name={def.mcs.toString()}
                  value={def.rangeMeters}
                  onChange={handleRangeChange}
                  type="number"
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">m</InputAdornment>
                    ),
                  }}
                  disabled={disabled}
                />
              </Grid>
            </Grid>
          );
        })}
      </Grid>
    </SettingsGroup>
  );
}
