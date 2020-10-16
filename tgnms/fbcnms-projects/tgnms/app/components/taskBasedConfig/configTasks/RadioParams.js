/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';

export default function RadioParams() {
  return (
    <ConfigTaskGroup title="Radio Parameters">
      <ConfigTaskInput
        label="Wireless Security"
        configField="radioParamsBase.fwParams.wsecEnable"
      />
      <ConfigTaskInput
        label="Enable TPC (Transmit Power Control)"
        configField="linkParamsOverride.fwParams.tpcEnable"
      />
      <ConfigTaskInput
        label="Max Tx Power"
        configField="radioParamsBase.fwParams.maxTxPower"
      />
      <ConfigTaskInput
        label="Min Tx Power"
        configField="radioParamsBase.fwParams.minTxPower"
      />
      <ConfigTaskInput
        label="Tx Power"
        configField="radioParamsBase.fwParams.txPower"
      />
      <ConfigTaskInput
        label="Max MCS"
        configField="radioParamsBase.fwParams.laMaxMcs"
      />
      <ConfigTaskInput
        label="Min MCS"
        configField="radioParamsBase.fwParams.laMinMcs"
      />
      <ConfigTaskInput label="MCS" configField="radioParamsBase.fwParams.mcs" />
    </ConfigTaskGroup>
  );
}
