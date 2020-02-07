/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import classNames from 'classnames';
import {makeStyles} from '@material-ui/styles';

type Props = {
  color: string,
  className?: string,
};

const styles = {
  statusIndicator: {
    borderRadius: '50%',
    display: 'inline-block',
    height: '17px',
    margin: '3px 8px 3px 3px',
    verticalAlign: 'middle',
    width: '17px',
    background: ({color}: Props) =>
      `radial-gradient(circle, ${color} 40%, transparent 70%)`,
  },
};

const useStyles = makeStyles(styles);

export const StatusIndicatorColor = {
  GREEN: '#2ecc71',
  RED: '#d63031',
  YELLOW: '#f1c40f',
  BLACK: '#333333',
  GREY: '#9e9e9e',
};

export default function StatusIndicator(props: Props) {
  const classes = useStyles(props);
  return (
    <span className={classNames(classes.statusIndicator, props.className)} />
  );
}
