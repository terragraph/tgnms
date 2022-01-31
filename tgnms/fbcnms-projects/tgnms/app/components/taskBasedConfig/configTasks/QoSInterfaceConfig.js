/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskGroup from '../ConfigTaskGroup';
import ConfigTaskMapInput from '../ConfigTaskMapInput';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const POLICING_CONFIG_FIELD = 'cpeParams.policers';
const METADATA_FIELD = 'cpeConfig.mapVal.objVal.properties.policers';

export default function QoSInterfaceConfig({
  cpeInterface,
}: {
  cpeInterface: string,
}) {
  const {onUpdate} = useConfigTaskContext();
  const onUpdateRef = React.useRef(onUpdate);
  const handlePolicingConfigChange = React.useCallback(
    change => {
      const configField = `${POLICING_CONFIG_FIELD}.${cpeInterface}`;
      onUpdateRef.current({configField, draftValue: change});
    },
    [onUpdateRef, cpeInterface],
  );
  return (
    <ConfigTaskGroup
      title={`Policing Classification for ${cpeInterface}`}
      description={'Configure custom CIR and EIR for each Traffic Class'}>
      <ConfigTaskMapInput
        metadataField={METADATA_FIELD}
        configField={`${POLICING_CONFIG_FIELD}.${cpeInterface}`}
        buttonText="Add Forwarding Class"
        customKeyLabel="Traffic Class"
        onChange={handlePolicingConfigChange}
      />
    </ConfigTaskGroup>
  );
}
