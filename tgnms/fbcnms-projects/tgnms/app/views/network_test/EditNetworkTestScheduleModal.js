/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import EditIcon from '@material-ui/icons/Edit';
import NetworkContext from '../../contexts/NetworkContext';
import NetworkTestAdvancedParams from './NetworkTestAdvancedParams';
import SchedulerModal from '../../components/scheduler/SchedulerModal';
import TextField from '@material-ui/core/TextField';
import {
  MODAL_MODE,
  NETWORK_TEST_DEFS,
  NETWORK_TEST_TYPES,
} from '../../constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

import type {IperfOptions as IperfOptionsType} from '../../../shared/dto/NetworkTestTypes';

const useStyles = makeStyles(theme => ({
  selector: {
    marginTop: theme.spacing(1.5),
  },
}));

type Props = {
  id: number,
  type: $Keys<typeof NETWORK_TEST_DEFS>,
  onActionClick: () => void,
  initialOptions: IperfOptionsType,
  initialCronString: string,
};

export default function EditNetworkTestScheduleModal(props: Props) {
  const classes = useStyles();

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
      buttonTitle={
        <>
          <EditIcon />
          Edit
        </>
      }
      modalTitle="Edit Network Test Schedule"
      modalScheduleText="Save Changes"
      onSubmit={handleSubmit}
      initialCronString={initialCronString}
      modalMode={MODAL_MODE.EDIT}
      type={NETWORK_TEST_TYPES[type].toLowerCase()}
      scheduleParams={{
        typeSelector: (
          <TextField
            className={classes.selector}
            disabled
            value={type}
            InputProps={{disableUnderline: true}}
            fullWidth
          />
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
