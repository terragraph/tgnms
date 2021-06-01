/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import type {ANPFolder} from '@fbcnms/tg-nms/shared/dto/ANP';

type Props = {|
  isOpen: boolean,
  onClose: () => void,
  onComplete: () => void,
|};
export default function CreateFolderModal({
  isOpen,
  onClose,
  onComplete,
}: Props) {
  const taskState = useTaskState();
  const {formState, handleInputChange} = useForm<ANPFolder>({initialState: {}});
  const handleSubmitClick = React.useCallback(async () => {
    try {
      taskState.reset();
      taskState.loading();
      if (!validate(formState)) {
        throw new Error('Folder name is required');
      }
      await networkPlanningAPIUtil.createFolder(formState);
      taskState.success();
      onComplete();
      onClose();
    } catch (err) {
      taskState.setMessage(err.message);
      taskState.error();
    }
  }, [formState, taskState, onComplete, onClose]);
  return (
    <MaterialModal
      open={isOpen}
      onClose={onClose}
      modalTitle={'Create new plan folder'}
      modalContent={
        <Grid container direction="column">
          {taskState.isSuccess && (
            <Alert color="success" severity="success">
              <Typography>Folder created</Typography>
            </Alert>
          )}
          {taskState.isError && (
            <Alert color="error" severity="error">
              <Grid item container direction="column">
                <Grid item>
                  <Typography>Creating folder failed</Typography>
                </Grid>
                {taskState.message && (
                  <Grid item>
                    <Typography>{taskState.message}</Typography>
                  </Grid>
                )}{' '}
              </Grid>
            </Alert>
          )}
          <Grid item xs={8}>
            <TextField
              id="folder_name"
              onChange={handleInputChange(x => ({folder_name: x}))}
              value={formState.folder_name}
              placeholder="Folder Name"
              disabled={taskState.isLoading}
            />
          </Grid>
        </Grid>
      }
      modalActions={
        <>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            disabled={!validate(formState)}
            color="primary"
            onClick={handleSubmitClick}
            variant="contained">
            Submit{' '}
            {taskState.isLoading && (
              <CircularProgress size={10} style={{marginLeft: 5}} />
            )}
          </Button>
        </>
      }
    />
  );
}

function validate(folder: ANPFolder) {
  return !isNullOrEmptyString(folder.folder_name);
}
