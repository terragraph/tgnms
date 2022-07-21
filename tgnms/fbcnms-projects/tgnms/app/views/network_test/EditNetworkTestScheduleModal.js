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
import * as testApi from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import EditIcon from '@material-ui/icons/Edit';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NetworkTestAdvancedParams from './NetworkTestAdvancedParams';
import SchedulerModal from '@fbcnms/tg-nms/app/components/scheduler/SchedulerModal';
import TextField from '@material-ui/core/TextField';
import {
  MODAL_MODE,
  NETWORK_TEST_DEFS,
  NETWORK_TEST_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {IperfOptions as IperfOptionsType} from '@fbcnms/tg-nms/shared/dto/NetworkTestTypes';

const useStyles = makeStyles(theme => ({
  selector: {
    marginTop: theme.spacing(1.5),
  },
  editIcon: {
    marginRight: theme.spacing(),
  },
  editText: {
    textTransform: 'uppercase',
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
  const snackbars = useSnackbars();

  const {id, onActionClick, initialOptions, type, initialCronString} = props;
  const {networkName} = React.useContext(NetworkContext);
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
        .then(_ => snackbars.success('Successfully edited test schedule!'))
        .catch(err =>
          snackbars.error('Failed to edit test schedule: ' + err.message),
        );
      onActionClick();
    },
    [id, networkName, iperfOptions, onActionClick, snackbars],
  );

  return (
    <SchedulerModal
      buttonTitle={
        <>
          <EditIcon className={classes.editIcon} />{' '}
          <span className={classes.editText}>edit</span>
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
            value={NETWORK_TEST_TYPES[type]}
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
