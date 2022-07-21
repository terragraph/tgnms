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

export default function KafkaParams() {
  return (
    <ConfigTaskGroup
      title="Kafka Parameters"
      enabler={{
        label: 'Enable Kafka',
        configField: 'statsAgentParams.endpointParams.kafkaParams.enabled',
      }}>
      <ConfigTaskInput
        label="Endpoint"
        configField="statsAgentParams.endpointParams.kafkaParams.config.brokerEndpointList"
      />
    </ConfigTaskGroup>
  );
}
