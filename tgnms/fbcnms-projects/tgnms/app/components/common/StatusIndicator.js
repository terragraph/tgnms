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

const useStyles = makeStyles(theme => ({
  statusIndicator: {
    borderRadius: '50%',
    display: 'inline-block',
    height: '10px',
    margin: `0 ${theme.spacing()}px`,
    verticalAlign: 'middle',
    width: '10px',
    background: ({color}: Props) => color,
  },
}));

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
