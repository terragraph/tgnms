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
