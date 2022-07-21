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
import {apiServiceRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {makeStyles} from '@material-ui/styles';
import {useConfirmationModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

type modalProps = {
  title: string,
  content: React.Node,
  confirmText?: string,
};

const useStyles = makeStyles(_ => ({
  root: {
    width: '40%',
    minWidth: 400,
  },
  button: {
    margin: '8px',
    float: 'right',
  },
}));

export default function useConfirmationModal({
  onSuccess,
}: {
  onSuccess: () => void,
}) {
  const classes = useStyles();
  const snackbars = useSnackbars();
  const {
    isOpen,
    cancel,
    confirm,
    requestConfirmation,
  } = useConfirmationModalState();
  const {networkName} = useNetworkContext();

  const openConfirmation = React.useCallback(
    <T>({
      endpoint,
      data,
      successMessage,
    }: {
      endpoint: string,
      data: T,
      successMessage?: string,
    }) =>
      requestConfirmation(async () => {
        try {
          await apiServiceRequest(networkName, endpoint, data);
          await onSuccess();
          snackbars.success(successMessage ?? 'Success');
        } catch (error) {
          snackbars.error(error);
        }
      }),
    [requestConfirmation, snackbars, networkName, onSuccess],
  );
  const ConfirmationModal = React.useCallback(
    ({title, content, confirmText}: modalProps) => (
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={cancel}
        modalContent={content}
        modalTitle={title}
        modalActions={
          <>
            <Button
              className={classes.button}
              onClick={cancel}
              variant="outlined">
              Cancel
            </Button>
            <Button
              className={classes.button}
              color="primary"
              onClick={confirm}
              variant="contained">
              {confirmText ?? 'Confirm'}
            </Button>
          </>
        }
      />
    ),
    [isOpen, cancel, confirm, classes],
  );

  return {
    openConfirmation,
    ConfirmationModal: ConfirmationModal,
  };
}
