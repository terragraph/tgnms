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
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const CPE_INTERFACES_FIELD = 'cpeParams.cpeInterfaces';

export default function QoSTrafficConfig() {
  const {onUpdate, draftChanges} = useConfigTaskContext();
  const onUpdateRef = React.useRef(onUpdate);

  const currentCpeInterfaces: Array<string> = React.useMemo(
    () =>
      // $FlowIgnore
      draftChanges?.cpeParams?.cpeInterfaces.split(',') ?? [],
    [draftChanges],
  );

  const handlePolicingConfigChange = React.useCallback(
    (cpeInterface, change) => {
      const configField = `cpeParams.policers.${cpeInterface}`;
      onUpdateRef.current({configField, draftValue: change});
    },
    [onUpdateRef],
  );

  return (
    isFeatureEnabled('QOS_CONFIG') && (
      <ConfigTaskGroup title="QoS Config">
        <ConfigTaskInput
          label="CPE Interfaces"
          configField={CPE_INTERFACES_FIELD}
        />
        {currentCpeInterfaces.map(cpeInterface => (
          <ConfigTaskMapInput
            label={`Policing Classification for ${cpeInterface}`}
            configField={`cpeParams.policers`}
            buttonText="Add Forwarding Class"
            onChange={change =>
              handlePolicingConfigChange(cpeInterface, change)
            }
          />
        ))}
      </ConfigTaskGroup>
    )
  );
}
