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
import {
  MODAL_MODE,
  NETWORK_TEST_IPERF_DEFAULTS,
  NETWORK_TEST_TYPES,
} from '../../constants/ScheduleConstants';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

import type {IperfOptions as IperfOptionsType} from '../../../shared/dto/NetworkTestTypes';

type Props = {
  id: number,
  type: $Keys<typeof NETWORK_TEST_IPERF_DEFAULTS>,
  onActionClick: () => void,
  initialOptions: IperfOptionsType,
  initialCronString: string,
};

export default function EditNetworkTestScheduleModal(props: Props) {
  const {id, onActionClick, initialOptions, type, initialCronString} = props;
  const {networkName} = React.useContext(NetworkContext);
  const enqueueSnackbar = useEnqueueSnackbar();
  const [iperfOptions, setIperfOptions] = React.useState(initialOptions);

  const handleSubmit = React.useCallback(
    (cronExpr: ?string, _adhoc: boolean) => {
      if (!cronExpr) {
        return;
      }
      testApi
        .editTestSchedule({
          inputData: {cronExpr, networkName, iperfOptions},
          scheduleId: id,
        })
        .then(_ =>
          enqueueSnackbar('Successfully edited test schedule!', {
            variant: 'success',
          }),
        )
        .catch(err =>
          enqueueSnackbar('Failed to edit test schedule: ' + err.message, {
            variant: 'error',
          }),
        );
      onActionClick();
    },
    [enqueueSnackbar, id, networkName, iperfOptions, onActionClick],
  );

  return (
    <SchedulerModal
      buttonTitle="Edit"
      modalTitle="Edit Network Test Schedule"
      modalScheduleText="Edit Schedule"
      onSubmit={handleSubmit}
      initialCronString={initialCronString}
      modalMode={MODAL_MODE.EDIT}
      scheduleParams={{
        typeSelector: (
          <TextField
            disabled
            select
            variant="outlined"
            value={type}
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth>
            <MenuItem key={type} value={type}>
              {NETWORK_TEST_TYPES[type]}
            </MenuItem>
          </TextField>
        ),
        advancedParams: (
          <NetworkTestAdvancedParams
            onIperfOptionsUpdate={setIperfOptions}
            initialOptions={initialOptions}
            type={type}
          />
        ),
      }}
    />
  );
}
