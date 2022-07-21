/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(_theme => ({
  button: {
    position: 'relative',
  },
  buttonProgress: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: ({size}) => -(size / 2.0),
    marginTop: ({size}) => -(size / 2.0),
  },
}));

type Props = {
  className?: string,
  children: React.Node,
  loading: boolean,
  size: number,
};

export default function ProgressButton({
  loading,
  className,
  children,
  size,
  ...props
}: Props) {
  const classes = useStyles({size});
  return (
    <Button {...props} className={`${classes.button} ${className || ''}`}>
      {children}
      {loading && (
        <CircularProgress size={size} className={classes.buttonProgress} />
      )}
    </Button>
  );
}

ProgressButton.defaultProps = {
  size: 24,
};
