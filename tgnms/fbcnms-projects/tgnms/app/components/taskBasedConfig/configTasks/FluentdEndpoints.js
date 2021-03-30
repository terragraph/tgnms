/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskMapInput from '../ConfigTaskMapInput';

export default function FluentdEndpoints() {
  return (
    <ConfigTaskGroup title="Fluentd Endpoints">
      <ConfigTaskMapInput
        configField="fluentdParams.endpoints"
        buttonText="Add Endpoint"
      />
    </ConfigTaskGroup>
  );
}
