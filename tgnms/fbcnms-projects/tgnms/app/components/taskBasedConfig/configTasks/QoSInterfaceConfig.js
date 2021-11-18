/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigOptionSelector from '../ConfigOptionSelector';
import ConfigTaskInput from '../ConfigTaskInput';
import ConfigTaskMapInput from '../ConfigTaskMapInput';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

const SIMPLE_TC = ['0', '1', '2', '3'];
const POLICING_CONFIG_FIELD = 'cpeParams.policers';

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

  const {updateFormState} = useForm({
    initialState: {cir: 0, eir: 0},
    onFormUpdated: state => {
      const formattedChange = SIMPLE_TC.reduce((res, tc) => {
        res[tc] = state;
        return res;
      }, {});
      handlePolicingConfigChange(formattedChange);
    },
  });

  const handleSimpleChange = (key: string, value) => {
    updateFormState({[key]: value});
  };

  return (
    <ConfigOptionSelector
      title={`Policing Classification for ${cpeInterface}`}
      options={{
        simple: {
          name: 'Simple',
          description:
            'All Traffic Classes will have the same CIR (critical information rate) and EIR (excess information rate) values',
          configGroup: (
            <>
              <ConfigTaskInput
                label="CIR"
                onChange={val => handleSimpleChange('cir', Number(val))}
              />
              <ConfigTaskInput
                label="EIR"
                onChange={val => handleSimpleChange('eir', Number(val))}
              />
            </>
          ),
        },
        custom: {
          name: 'Custom',
          description: 'Configure custom CIR and EIR for each Traffic Class',
          configGroup: (
            <ConfigTaskMapInput
              configField="cpeParams.policers"
              buttonText="Add Forwarding Class"
              customKeyLabel="Traffic Class"
              onChange={handlePolicingConfigChange}
            />
          ),
        },
      }}
    />
  );
}
