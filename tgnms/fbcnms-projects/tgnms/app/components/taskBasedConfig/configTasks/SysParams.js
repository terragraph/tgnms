/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';

export default function SysParams() {
  return (
    <ConfigTaskGroup title="System Parameters">
      <ConfigTaskInput
        label="Enable Managed Config"
        configField="sysParams.managedConfig"
      />
    </ConfigTaskGroup>
  );
}
