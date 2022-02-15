/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApi from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  useAnnotationGroups,
  useMapAnnotationContext,
} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import type {MapAnnotationGroupIdent} from '@fbcnms/tg-nms/shared/dto/MapAnnotations';

export default function RenameAnnotationGroupForm({
  group,
  onClose,
}: {
  group: ?MapAnnotationGroupIdent,
  onClose: () => void,
}) {
  const {setCurrent} = useMapAnnotationContext();
  const {groups, loadGroups} = useAnnotationGroups();
  const {handleInputChange, formState} = useForm({
    initialState: {
      name: group?.name,
    },
  });
  const {isLoading, isError, message, setMessage, setState} = useTaskState();
  const handleSubmit = React.useCallback(
    async e => {
      e.preventDefault();
      setState(TASK_STATE.LOADING);
      if (groups.some(group => group.name === formState.name)) {
        setState(TASK_STATE.ERROR);
        setMessage(`Name must be unique: ${formState.name}`);
        return;
      }
      try {
        const renamed = await mapApi.setAnnotationGroupProperties({
          groupId: group?.id ?? 0,
          name: formState.name,
        });
        await loadGroups();
        setCurrent(renamed);
        onClose();
      } catch (err) {
        setState(TASK_STATE.ERROR);
        setMessage(`Could not rename group`);
      }
    },
    [
      groups,
      setState,
      setMessage,
      onClose,
      loadGroups,
      group,
      formState,
      setCurrent,
    ],
  );
  return (
    <Grid
      component="form"
      onSubmit={handleSubmit}
      item
      container
      xs={12}
      direction="column"
      wrap="nowrap"
      spacing={1}>
      <Grid item container justifyContent="center">
        {isLoading && <CircularProgress />}
        {isError && (
          <Alert color="error" severity="error">
            {message}
          </Alert>
        )}
      </Grid>
      <Grid item xs={12}>
        <Typography color="textSecondary">Rename Layer</Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Name"
          name="name"
          fullWidth
          value={formState.name}
          onChange={handleInputChange(val => ({name: val}))}
        />
      </Grid>
      <Grid item container justifyContent="flex-end" spacing={1}>
        <Grid item>
          <Button variant="outlined" size="small" onClick={onClose}>
            Cancel
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            size="small"
            type="submit">
            Save
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}
