/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import classNames from 'classnames';
import {getHealthDef} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {makeStyles} from '@material-ui/styles';

type Props = {
  health: number,
  text: string,
  className?: string,
};

const styles = makeStyles(theme => ({
  healthIndicator: {
    background: ({health}: Props) => getHealthDef(health).color,
    color: 'white',
    borderRadius: theme.spacing(0.5),
    width: theme.spacing(10),
    textAlign: 'center',
    padding: theme.spacing(0.5),
  },
}));

export default function HealthTextSquare(props: Props) {
  const {text, className, health} = props;
  const classes = styles({health});

  return (
    <div className={classNames(className, classes.healthIndicator)}>
      {text.toUpperCase()}
    </div>
  );
}
