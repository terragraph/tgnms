/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import StatusIndicator from '../../components/common/StatusIndicator';
import classNames from 'classnames';
import {getHealthDef} from '../../constants/HealthConstants';
import {makeStyles} from '@material-ui/styles';

type Props = {
  health: number,
  className?: string,
};

const styles = makeStyles(() => ({
  healthIndicator: {
    background: ({health}: Props) =>
      `radial-gradient(circle, ${
        getHealthDef(health).color
      } 50%, transparent 60%)`,
  },
}));

export default function HealthIndicator(props: Props) {
  const classes = styles();

  const {health, className} = props;

  return (
    <StatusIndicator
      color={getHealthDef(health).color}
      className={classNames(className, classes.healthIndicator)}
    />
  );
}
