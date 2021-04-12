/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import ScheduleParams from './ScheduleParams';
import ScheduleTime from './ScheduleTime';
import {MODAL_MODE} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
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
  content: {
    overflow: 'hidden',
  },
}));

export type Props = {
  buttonTitle: React.Node,
  modalTitle: string,
  modalSubmitText?: string,
  modalScheduleText?: string,
  onSubmit: (?string, boolean) => void,
  enableTime?: boolean,
  scheduleParams: ScheduleParamsType,
  modalMode: $Values<typeof MODAL_MODE>,
  initialCronString?: string,
  type: string,
};

export default function SchedulerModal(props: Props) {
  const {
    buttonTitle,
    modalTitle,
    modalSubmitText,
    modalScheduleText,
    onSubmit,
    scheduleParams,
    modalMode,
    initialCronString,
    type,
  } = props;

  const [isOpen, setIsOpen] = React.useState(false);
  const classes = useModalStyles();

  const editModalMode = modalMode === MODAL_MODE.EDIT;
  const enableTime = props.enableTime === undefined ? true : props.enableTime;

  const [adHoc, setAdHoc] = React.useState(editModalMode ? false : true);
  const [cronString, setCronString] = React.useState(null);

  const handleCronStringUpdate = (newCronString: ?string) =>
    setCronString(newCronString);

  const handleAdHocChange = (newAdHoc: boolean) => setAdHoc(newAdHoc);

  const handleClose = React.useCallback(() => {
    setIsOpen(false), setAdHoc(editModalMode ? false : true);
  }, [editModalMode]);

  const handleSubmitButtonPress = React.useCallback(() => {
    onSubmit(cronString, adHoc);
    handleClose();
  }, [onSubmit, cronString, handleClose, adHoc]);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={editModalMode ? 'text' : 'outlined'}
        style={{backgroundColor: editModalMode ? 'transparent' : null}}>
        {buttonTitle}
      </Button>
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        modalContent={
          <Grid
            container
            className={classes.content}
            direction="column"
            spacing={2}>
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
                    onAdHocChange={handleAdHocChange}
                    onCronStringUpdate={handleCronStringUpdate}
                    modalMode={modalMode || MODAL_MODE.CREATE}
                    initialCronString={initialCronString}
                    type={type}
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
              {adHoc
                ? modalSubmitText || 'Submit'
                : modalScheduleText || 'Schedule'}
            </Button>
          </>
        }
      />
    </>
  );
}
