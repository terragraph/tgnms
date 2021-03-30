/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '../../contexts/NetworkContext';
import NetworkTestAdvancedParams from './NetworkTestAdvancedParams';
import SchedulerModal from '../../components/scheduler/SchedulerModal';
import TextField from '@material-ui/core/TextField';
import useForm from '../../hooks/useForm';
import {
  MODAL_MODE,
  NETWORK_TEST_TYPES,
  TEST_TYPE_CODES,
} from '../../constants/ScheduleConstants';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {useSnackbars} from '../../hooks/useSnackbar';

type Props = {onActionClick: () => void};

export default function ScheduleNetworkTestModal(props: Props) {
  const {networkName} = React.useContext(NetworkContext);
  const snackbars = useSnackbars();
  const scheduleTypes = objectValuesTypesafe<string>(TEST_TYPE_CODES);
  const {onActionClick} = props;
  const {formState, handleInputChange, updateFormState} = useForm({
    initialState: {type: scheduleTypes[0], iperfOptions: {}},
  });

  const handleIperfOptionsUpdate = iperfUpdate => {
    updateFormState({iperfOptions: iperfUpdate});
  };

  const handleSubmit = React.useCallback(
    (cronExpr: ?string, adhoc: boolean) => {
      if (cronExpr) {
        testApi
          .scheduleTest({
            cronExpr,
            testType: formState.type,
            networkName,
            iperfOptions: formState.iperfOptions,
          })
          .then(_ => {
            snackbars.success('Successfully scheduled test!');
          })
          .catch(err => snackbars.error('Failed to schedule test: ' + err));
      }
      if (adhoc) {
        testApi
          .startExecution({
            testType: formState.type,
            networkName,
            iperfOptions: formState.iperfOptions,
          })
          .then(_ => snackbars.success('Successfully started test!'))
          .catch(err => snackbars.error('Failed to start test: ' + err));
      }
      onActionClick();
    },
    [networkName, formState, onActionClick, snackbars],
  );

  return (
    <SchedulerModal
      buttonTitle="Schedule Network Test"
      modalTitle="Schedule Network Test"
      modalSubmitText="Start Test"
      modalScheduleText="Schedule Test"
      onSubmit={handleSubmit}
      type={NETWORK_TEST_TYPES[formState.type].toLowerCase()}
      scheduleParams={{
        typeSelector: (
          <TextField
            select
            variant="outlined"
            value={formState.type}
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            onChange={handleInputChange(val => ({type: val}))}>
            {scheduleTypes.map(name => (
              <MenuItem key={name} value={name}>
                {NETWORK_TEST_TYPES[name]}
              </MenuItem>
            ))}
          </TextField>
        ),
        advancedParams: (
          <NetworkTestAdvancedParams
            onIperfOptionsUpdate={handleIperfOptionsUpdate}
            type={formState.type}
          />
        ),
      }}
      modalMode={MODAL_MODE.CREATE}
    />
  );
}
