/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as scanAPI from '../../apiutils/ScanServiceAPIUtil';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkContext from '../../contexts/NetworkContext';
import SchedulerModal from '../../components/scheduler/SchedulerModal';
import TextField from '@material-ui/core/TextField';
import useForm from '../../hooks/useForm';
import {
  MODAL_MODE,
  SCAN_MODE,
  SCAN_SERVICE_MODE,
  SCAN_SERVICE_TYPES,
  SCAN_TYPES,
} from '../../constants/ScheduleConstants';
import {makeStyles} from '@material-ui/styles';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';

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
  const {id, onActionClick, type, initialCronString} = props;
  const {formState, handleInputChange} = useForm({
    initialState: {mode: props.mode},
  });
  const {networkName} = React.useContext(NetworkContext);
  const enqueueSnackbar = useEnqueueSnackbar();

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
        .then(_ =>
          enqueueSnackbar('Successfully edited scan schedule!', {
            variant: 'success',
          }),
        )
        .catch(err =>
          enqueueSnackbar('Failed to edit scan schedule: ' + err.message, {
            variant: 'error',
          }),
        );
      onActionClick();
    },
    [enqueueSnackbar, id, networkName, onActionClick, formState, type],
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
