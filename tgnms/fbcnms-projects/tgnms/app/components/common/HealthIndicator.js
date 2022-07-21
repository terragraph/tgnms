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
import StatusIndicator from '@fbcnms/tg-nms/app/components/common/StatusIndicator';
import classNames from 'classnames';
import {getHealthDef} from '@fbcnms/tg-nms/app/constants/HealthConstants';

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
