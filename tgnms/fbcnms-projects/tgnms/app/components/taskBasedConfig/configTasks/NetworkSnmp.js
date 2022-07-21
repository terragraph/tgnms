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
import ConfigOptionSelector from '../ConfigOptionSelector';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';

export default function KafkaParams() {
  return (
    <ConfigTaskGroup
      title="SNMP"
      description="Simple Network Management Protocol (SNMP) enables remote polling of device and network statistics."
      enabler={{
        label: 'Enable SNMP',
        configField: 'envParams.SNMP_ENABLED',
      }}>
      <ConfigOptionSelector
        options={{
          V2c: {
            name: 'V2C',
            description: 'SNMP using community authentication (no encryption)',

            configGroup: (
              <>
                <ConfigTaskInput
                  label="Community"
                  configField="snmpConfig.snmpV2C.tg.community"
                />
                <ConfigTaskInput
                  label="Source (IP or IP prefix)"
                  configField="snmpConfig.snmpV2C.tg.source"
                />
              </>
            ),
          },
          V3: {
            name: 'V3',
            description: 'Protocol with Authentication and Encryption',
            setConfigs: [
              {
                configField: 'snmpConfig.snmpV3',
              },
            ],
            configGroup: (
              <>
                <ConfigTaskInput
                  label="Username"
                  configField="snmpConfig.snmpV3.tg.username"
                />
                <ConfigTaskInput
                  label="Authentication Type"
                  configField="snmpConfig.snmpV3.tg.authType"
                />
                <ConfigTaskInput
                  label="Authentication Password"
                  configField="snmpConfig.snmpV3.tg.authPassphrase"
                />
                <ConfigTaskInput
                  label="Privacy (Encryption) Protocol"
                  configField="snmpConfig.snmpV3.tg.privProtocol"
                />
                <ConfigTaskInput
                  label="Privacy (Encryption) Passphrase"
                  configField="snmpConfig.snmpV3.tg.privPassphrase"
                />
              </>
            ),
          },
        }}
      />
    </ConfigTaskGroup>
  );
}
