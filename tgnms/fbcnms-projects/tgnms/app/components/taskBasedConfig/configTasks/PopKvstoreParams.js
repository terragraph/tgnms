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

export default function PopKvstoreParams() {
  return (
    <ConfigTaskGroup
      title="Key-Value Store Parameters"
      description="These params are required for all pops to bring them online.">
      <ConfigTaskInput
        label="e2e-ctrl-url"
        configField="kvstoreParams.e2e-ctrl-url"
      />
      <ConfigTaskInput
        label="e2e-ctrl-url-backup"
        configField="kvstoreParams.e2e-ctrl-url-backup"
      />
      <ConfigTaskInput
        label="e2e-network-prefix"
        configField="kvstoreParams.e2e-network-prefix"
      />
      <ConfigTaskInput
        label="e2e-aggr-url"
        configField="kvstoreParams.e2e-aggr-url"
      />
    </ConfigTaskGroup>
  );
}
