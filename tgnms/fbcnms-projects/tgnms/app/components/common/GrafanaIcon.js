/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import icon from '../../../static/images/grafana_icon.svg';
import {makeStyles} from '@material-ui/styles';

const styles = {
  grafanaIcon: {
    height: '18px',
    margin: '2px',
  },
};

const useStyles = makeStyles(styles);

export default function GrafanaIcon() {
  const classes = useStyles();
  return (
    <img
      className={classes.grafanaIcon}
      data-testid="grafana-icon"
      src={icon}
    />
  );
}
