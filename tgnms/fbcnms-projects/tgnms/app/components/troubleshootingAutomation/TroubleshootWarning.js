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
import Button from '@material-ui/core/Button';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import ReportProblemOutlinedIcon from '@material-ui/icons/ReportProblemOutlined';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

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
  onClose,
}: {
  isToolTip?: boolean,
  title: string,
  modalContent: React.Node,
  onAttemptFix?: () => void,
  onClose?: () => void,
}) {
  const classes = useStyles();
  const {isOpen, open, close} = useModalState();

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
    close();
  }, [close, onClose]);

  const handleConfirm = React.useCallback(async () => {
    if (onAttemptFix) {
      await onAttemptFix();
    }
    handleClose();
  }, [onAttemptFix, handleClose]);

  return (
    isFeatureEnabled('SOLUTION_AUTOMATION_ENABLED') && (
      <>
        <Tooltip
          title={isToolTip ? title : ''}
          placement="top"
          className={classes.root}>
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
              <Button onClick={handleClose} variant="outlined">
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
