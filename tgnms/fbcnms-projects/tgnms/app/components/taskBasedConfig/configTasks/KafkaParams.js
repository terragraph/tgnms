/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
