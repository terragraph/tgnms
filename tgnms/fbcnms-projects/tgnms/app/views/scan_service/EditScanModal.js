/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as scanAPI from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import SchedulerModal from '@fbcnms/tg-nms/app/components/scheduler/SchedulerModal';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {
  MODAL_MODE,
  SCAN_MODE,
  SCAN_SERVICE_MODE,
  SCAN_SERVICE_TYPES,
  SCAN_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

const useStyles = makeStyles(theme => ({
  selector: {
    marginTop: theme.spacing(1.5),
  },
}));

type Props = {
  id: number,
  type: $Keys<typeof SCAN_TYPES>,
  onActionClick: () => void,
  mode: $Keys<typeof SCAN_MODE>,
  initialCronString: string,
};

export default function EditScanModal(props: Props) {
  const classes = useStyles();
  const snackbars = useSnackbars();
  const {id, onActionClick, type, initialCronString} = props;
  const {formState, handleInputChange} = useForm({
    initialState: {mode: props.mode},
  });
  const {networkName} = React.useContext(NetworkContext);

  const handleSubmit = React.useCallback(
    (cronExpr: ?string, _adhoc: boolean) => {
      if (!cronExpr) {
        return;
      }
      scanAPI
        .editScanSchedule({
          inputData: {
            cronExpr,
            networkName,
            type: SCAN_TYPES[type],
            mode: SCAN_MODE[formState.mode],
          },
          scheduleId: id,
        })
        .then(_ => snackbars.success('Successfully edited scan schedule!'))
        .catch(err =>
          snackbars.error('Failed to edit scan schedule: ' + err.message),
        );
      onActionClick();
    },
    [id, networkName, onActionClick, formState, type, snackbars],
  );

  return (
    <SchedulerModal
      buttonTitle="Edit"
      modalTitle="Edit Scan Schedule"
      modalScheduleText="Save Changes"
      onSubmit={handleSubmit}
      initialCronString={initialCronString}
      modalMode={MODAL_MODE.EDIT}
      type={SCAN_SERVICE_TYPES[type]}
      scheduleParams={{
        typeSelector: (
          <TextField
            className={classes.selector}
            disabled
            value={SCAN_SERVICE_TYPES[type]}
            InputProps={{disableUnderline: true}}
            fullWidth
          />
        ),
        advancedParams: (
          <FormGroup row={false}>
            <FormLabel component="legend">
              <span>Scan Mode</span>
            </FormLabel>
            <TextField
              select
              variant="outlined"
              value={formState.mode}
              InputLabelProps={{shrink: true}}
              margin="dense"
              fullWidth
              onChange={handleInputChange(val => ({mode: val}))}>
              {Object.keys(SCAN_SERVICE_MODE).map(mode => (
                <MenuItem key={mode} value={mode}>
                  {SCAN_SERVICE_MODE[mode]}
                </MenuItem>
              ))}
            </TextField>
          </FormGroup>
        ),
      }}
    />
  );
}
