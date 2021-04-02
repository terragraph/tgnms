/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskInput from '../ConfigTaskInput';

export default function KafkaEndpoint({
  onChange,
}: {
  onChange?: (string | number | boolean) => void,
}) {
  return (
    <ConfigTaskInput
      label="Endpoint"
      onChange={onChange}
      configField="statsAgentParams.endpointParams.kafkaParams.config.brokerEndpointList"
    />
  );
}
