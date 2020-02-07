/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import StatusIndicator from '../../components/common/StatusIndicator';
import {getHealthDef} from '../../constants/HealthConstants';

export default function HealthIndicator({
  health,
  className,
}: {
  health: number,
  className?: string,
}) {
  return (
    <StatusIndicator color={getHealthDef(health).color} className={className} />
  );
}
