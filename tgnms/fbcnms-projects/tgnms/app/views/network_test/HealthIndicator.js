/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import React from 'react';
import {getHealthDef} from '../../constants/HealthConstants';
import StatusIndicator from '../../components/common/StatusIndicator';

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
