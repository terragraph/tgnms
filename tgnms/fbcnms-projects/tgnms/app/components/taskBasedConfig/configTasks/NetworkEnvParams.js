/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';

export default function NetworkEnvParams() {
  return (
    <ConfigTaskGroup title="Environment Parameters">
      <ConfigTaskInput label="Timezone" configField="envParams.TIMEZONE" />
      <ConfigTaskInput
        label="CPE Interface"
        configField="envParams.CPE_INTERFACE"
      />
      <ConfigTaskInput
        label="Use Open/R IP Allocation"
        configField="envParams.OPENR_STATIC_PREFIX_ALLOC"
      />
    </ConfigTaskGroup>
  );
}
