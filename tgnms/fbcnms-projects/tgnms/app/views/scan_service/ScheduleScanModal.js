/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as scanApi from '../../apiutils/ScanServiceAPIUtil';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import MenuItem from '@material-ui/core/MenuItem';
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
import {useNetworkContext} from '../../contexts/NetworkContext';

const useStyles = makeStyles(theme => ({
  selector: {
    marginTop: theme.spacing(1.5),
  },
}));

type Props = {onActionClick: () => void};

export default function ScheduleScanModal(props: Props) {
  const classes = useStyles();
  const {networkName} = useNetworkContext();
  const enqueueSnackbar = useEnqueueSnackbar();
  const scheduleTypes = Object.keys(SCAN_SERVICE_TYPES);
  const {onActionClick} = props;
  const {formState, handleInputChange} = useForm({
    initialState: {type: scheduleTypes[0], mode: Object.keys(SCAN_MODE)[0]},
  });

  const handleSubmit = React.useCallback(
    (cronExpr: ?string, adhoc: boolean) => {
      if (cronExpr) {
        scanApi
          .scheduleScan({
            cronExpr,
            type: SCAN_TYPES[formState.type],
            networkName,
            mode: SCAN_MODE[formState.mode],
          })
          .then(_ => {
            enqueueSnackbar('Successfully scheduled scan!', {
              variant: 'success',
            });
          })
          .catch(err =>
            enqueueSnackbar('Failed to schedule scan: ' + err, {
              variant: 'error',
            }),
          );
      }
      if (adhoc) {
        scanApi
          .startExecution({
            type: SCAN_TYPES[formState.type],
            networkName,
            mode: SCAN_MODE[formState.mode],
          })
          .then(_ =>
            enqueueSnackbar('Successfully started scan!', {
              variant: 'success',
            }),
          )
          .catch(err =>
            enqueueSnackbar('Failed to start scan: ' + err, {
              variant: 'error',
            }),
          );
      }
      onActionClick();
    },
    [enqueueSnackbar, networkName, formState, onActionClick],
  );

  return (
    <SchedulerModal
      buttonTitle="Schedule Scan"
      modalTitle="Schedule Scan"
      modalSubmitText="Start Scan"
      modalScheduleText="Schedule Scan"
      onSubmit={handleSubmit}
      type={SCAN_SERVICE_TYPES[formState.type]}
      scheduleParams={{
        typeSelector: (
          <TextField
            className={classes.selector}
            disabled
            value={SCAN_SERVICE_TYPES[formState.type]}
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
      modalMode={MODAL_MODE.CREATE}
    />
  );
}
