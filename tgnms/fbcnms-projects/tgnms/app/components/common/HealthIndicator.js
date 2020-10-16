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
  health?: number,
  className?: string,
  color?: string,
};

export default function HealthIndicator(props: Props) {
  const {health, className, color} = props;

  return (
    <StatusIndicator
      color={health != null ? getHealthDef(health).color : color ?? ''}
      className={classNames(className)}
      clearIndicator={true}
    />
  );
}
