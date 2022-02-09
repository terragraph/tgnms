/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

export default function MapSettingsLayout({
  description,
  title,
  children,
  isSubmitDisabled,
  onSubmit,
  onCancel,
}: {
  title: React.Node,
  description: React.Node,
  children: React.Node,
  isSubmitDisabled: boolean,
  onSubmit: (e: Event) => void,
  onCancel: (e: Event) => void,
}) {
  return (
    <Grid
      container
      direction="column"
      spacing={4}
      component="form"
      onSubmit={onSubmit}>
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
                disabled={isSubmitDisabled}
                onClick={onCancel}
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
                disabled={isSubmitDisabled}
                onClick={onSubmit}>
                Save Profile
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid container item spacing={3} direction={'column'} xs={10}>
        {children}
      </Grid>
    </Grid>
  );
}
