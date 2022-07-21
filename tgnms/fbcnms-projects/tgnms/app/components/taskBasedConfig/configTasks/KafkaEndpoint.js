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
