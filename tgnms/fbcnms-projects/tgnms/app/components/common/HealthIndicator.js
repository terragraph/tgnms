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

type Props = {
  health: number,
  className?: string,
};

export default function HealthIndicator(props: Props) {
  const {health, className} = props;

  return (
    <StatusIndicator
      color={getHealthDef(health).color}
      className={classNames(className)}
    />
  );
}
