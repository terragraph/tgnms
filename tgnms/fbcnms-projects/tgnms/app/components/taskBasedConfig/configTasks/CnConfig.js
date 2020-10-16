/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
