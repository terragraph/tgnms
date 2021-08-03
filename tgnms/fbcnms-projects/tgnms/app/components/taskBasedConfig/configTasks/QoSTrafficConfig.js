/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskInput from '../ConfigTaskInput';
import QoSInterfaceConfig from './QoSInterfaceConfig';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const CPE_INTERFACES_FIELD = 'cpeParams.cpeInterfaces';

export default function QoSTrafficConfig() {
  const {draftChanges} = useConfigTaskContext();
  const currentCpeInterfaces: Array<string> = React.useMemo(
    () =>
      // $FlowIgnore
      draftChanges?.cpeParams?.cpeInterfaces.split(',') ?? [],
    [draftChanges],
  );

  return (
    isFeatureEnabled('QOS_CONFIG') && (
      <ConfigTaskGroup title="QoS Config">
        <ConfigTaskInput
          label="CPE Interfaces"
          configField={CPE_INTERFACES_FIELD}
        />
        {currentCpeInterfaces.map(cpeInterface => (
          <QoSInterfaceConfig cpeInterface={cpeInterface} />
        ))}
      </ConfigTaskGroup>
    )
  );
}
