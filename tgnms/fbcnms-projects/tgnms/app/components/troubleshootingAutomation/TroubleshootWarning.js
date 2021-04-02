/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import MaterialModal from '../common/MaterialModal';
import ReportProblemOutlinedIcon from '@material-ui/icons/ReportProblemOutlined';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '../../hooks/modalHooks';

const WARNING_YELLOW = '#FFB400';

const useStyles = makeStyles(theme => ({
  icon: {
    color: WARNING_YELLOW,
  },
  root: {
    minWidth: theme.spacing(3),
  },
}));

export default function TroubleshootWarning({
  isToolTip,
  title,
  modalContent,
  onAttemptFix,
}: {
  isToolTip?: boolean,
  title: string,
  modalContent: React.Node,
  onAttemptFix: () => void,
}) {
  const classes = useStyles();
  const {isOpen, open, close} = useModalState();
  const handleConfirm = React.useCallback(async () => {
    await onAttemptFix();
    close();
  }, [onAttemptFix, close]);

  return (
    isFeatureEnabled('SOLUTION_AUTOMATION_ENABLED') && (
      <>
        <Tooltip
          title={isToolTip ? title : ''}
          placement="top"
          classesName={classes.root}>
          <Button size="small" className={classes.root} onClick={open}>
            <ReportProblemOutlinedIcon className={classes.icon} />
            <Typography>{isToolTip ? '' : title}</Typography>
          </Button>
        </Tooltip>
        <MaterialModal
          open={isOpen}
          onClose={close}
          modalTitle={title}
          modalContent={modalContent}
          modalActions={
            <>
              <Button onClick={close} variant="outlined">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant="contained"
                color="primary">
                Confirm
              </Button>
            </>
          }
        />
      </>
    )
  );
}
