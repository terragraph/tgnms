/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import React from 'react';
import {withStyles} from '@material-ui/core/styles';

const styles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

type Props = {
  classes: {
    [$Keys<typeof styles>]: string,
  },
  fullScreen: boolean,
};

class LoadingBox extends React.Component<Props> {
  static defaultProps = {
    fullScreen: true,
  };

  render() {
    const {classes, fullScreen} = this.props;
    return (
      <div
        className={classes.root}
        style={{height: fullScreen ? '100vh' : '100%'}}>
        <CircularProgress />
      </div>
    );
  }
}

export default withStyles(styles)(LoadingBox);
