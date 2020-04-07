/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '../../components/common/MaterialModal';
import React, {useCallback, useState} from 'react';
import ScheduleParams from './ScheduleParams';
import ScheduleTime from './ScheduleTime';
import {makeStyles} from '@material-ui/styles';

import type {ScheduleParamsType} from './SchedulerTypes';

const useModalStyles = makeStyles(theme => ({
  root: {
    width: '60%',
    minWidth: 400,
  },
  button: {
    margin: theme.spacing(),
  },
  divider: {
    marginLeft: -theme.spacing(2),
    marginRight: -theme.spacing(2),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}));

type Props = {
  buttonTitle: string,
  modalTitle: string,
  modalSubmitText: string,
  modalScheduleText?: string,
  handleSubmit: () => void,
  handleSchedule?: string => void,
  scheduleParams: ScheduleParamsType,
  enableTime?: boolean,
};

export default function SchedulerModal(props: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const classes = useModalStyles();

  const enableTime = props.enableTime === undefined ? true : props.enableTime;

  const {
    buttonTitle,
    modalTitle,
    modalSubmitText,
    modalScheduleText,
    handleSchedule,
    handleSubmit,
    scheduleParams,
  } = props;

  const [adHoc, setAdHoc] = useState(true);
  const [cronString, setCronString] = useState(null);

  const handleCronStringUpdate = (newCronString: ?string) =>
    setCronString(newCronString);

  const handleAdHocChange = (newAdHoc: boolean) => setAdHoc(newAdHoc);

  const handleClose = useCallback(() => {
    setIsOpen(false), setAdHoc(true);
  }, [setIsOpen, setAdHoc]);

  const handleSubmitButtonPress = useCallback(() => {
    if (adHoc) {
      handleSubmit();
    }
    if (cronString && handleSchedule) {
      handleSchedule(cronString);
    }
  }, [adHoc, cronString, handleSchedule, handleSubmit]);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outlined">
        {buttonTitle}
      </Button>
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        modalContent={
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <ScheduleParams scheduleParams={scheduleParams} />
            </Grid>
            {enableTime ? (
              <>
                <Grid item>
                  <Divider className={classes.divider} />
                </Grid>
                <Grid item>
                  <ScheduleTime
                    adHoc={adHoc}
                    handleAdHocChange={handleAdHocChange}
                    handleCronStringUpdate={handleCronStringUpdate}
                  />
                </Grid>
              </>
            ) : null}
          </Grid>
        }
        modalTitle={modalTitle}
        modalActions={
          <>
            <Button
              className={classes.button}
              onClick={handleClose}
              variant="outlined">
              Cancel
            </Button>
            <Button
              className={classes.button}
              color="primary"
              onClick={handleSubmitButtonPress}
              variant="contained">
              {adHoc ? modalSubmitText : modalScheduleText || 'Schedue'}
            </Button>
          </>
        }
      />
    </>
  );
}
