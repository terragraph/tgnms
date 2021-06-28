/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import {makeStyles} from '@material-ui/styles';

const styles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '20px',
  },
};

const useStyles = makeStyles(() => styles);

type Props = {
  fullScreen?: boolean,
  text?: string,
  'data-testid'?: ?string,
};

export default function LoadingBox(props: Props) {
  const classes = useStyles(props);
  const fullScreen = props.fullScreen !== null ? props.fullScreen : true;
  return (
    <div
      className={classes.root}
      data-testid={props['data-testid'] ?? 'loading-box'}
      style={{height: fullScreen ? '100vh' : '100%'}}>
      <Grid cols={1}>
        <Grid item>{props.text}</Grid>
        <Grid item className={classes.container}>
          <CircularProgress />
        </Grid>
      </Grid>
    </div>
  );
}
