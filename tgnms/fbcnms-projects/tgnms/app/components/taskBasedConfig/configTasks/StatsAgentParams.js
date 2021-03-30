/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';
import ConfigTaskMapInput from '../ConfigTaskMapInput';

export default function StatsAgentParams() {
  return (
    <ConfigTaskGroup title="Stats Agent Parameters">
      <ConfigTaskMapInput
        label="Stats Agent High Frequency Allow List"
        configField="statsAgentParams.publisherParams.highFrequencyStatsWhitelist"
        buttonText="Add Allow String"
      />
      <ConfigTaskMapInput
        label="Stats Agent Block List"
        configField="statsAgentParams.publisherParams.statsBlacklist"
        buttonText="Add Block String"
      />
      <ConfigTaskInput
        label="ZMQ Controller URL"
        configField="statsAgentParams.sources.controller.zmq_url"
      />
    </ConfigTaskGroup>
  );
}
