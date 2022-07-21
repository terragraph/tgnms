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
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

export default function SettingsFormHeading({
  title,
  description,
  resetForm,
  changedSettings,
}: {
  title?: string,
  description?: string,
  resetForm: () => void,
  changedSettings: Array<string>,
}) {
  return (
    <Grid
      container
      item
      justifyContent="space-between"
      alignContent="center"
      alignItems="center"
      wrap="nowrap">
      <Grid item>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      </Grid>
      <Grid item>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              onClick={resetForm}
              data-testid="cancel-button"
              variant="text">
              Cancel
            </Button>
          </Grid>
          <Grid item>
            <Button
              type="submit"
              data-testid="submit-button"
              variant="contained"
              color="primary"
              disabled={changedSettings.length === 0}>
              Save
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
