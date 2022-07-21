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
import ZmqUrl from './ZmqUrl';

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
      <ZmqUrl />
    </ConfigTaskGroup>
  );
}
