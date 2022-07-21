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

export default function CnConfig() {
  return (
    <ConfigTaskGroup>
      <ConfigTaskInput
        label="CPE Interface"
        configField="envParams.CPE_INTERFACE"
      />
      <ConfigTaskInput
        label="Max time to back off from using a flapping link (ms)"
        configField="envParams.OPENR_LINK_FLAP_MAX_BACKOFF_MS"
      />
    </ConfigTaskGroup>
  );
}
