/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import {withStyles} from '@material-ui/core/styles';

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

type Props = {
  classes: {
    [$Keys<typeof styles>]: string,
  },
  fullScreen: boolean,
  text: string,
};

class MessageLoadingBox extends React.Component<Props> {
  static defaultProps = {
    fullScreen: true,
  };

  render() {
    const {classes, fullScreen, text} = this.props;
    return (
      <div
        className={classes.root}
        style={{height: fullScreen ? '100vh' : '100%'}}>
        <Grid cols={1}>
          <Grid item>{text}</Grid>
          <Grid item className={classes.container}>
            <CircularProgress />
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default withStyles(styles)(MessageLoadingBox);
