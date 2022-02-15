/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApi from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import * as turf from '@turf/turf';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {useAnnotationGroups} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

export default function CreateAnnotationGroupForm({
  onClose,
}: {
  onClose: () => void,
}) {
  const {groups, loadGroups} = useAnnotationGroups();
  const {networkName} = useNetworkContext();
  const {handleInputChange, formState} = useForm({
    initialState: {
      name: '',
    },
  });
  const {isLoading, isError, message, setMessage, setState} = useTaskState();
  const handleSubmit = React.useCallback(
    async e => {
      e.preventDefault();
      setState(TASK_STATE.LOADING);
      if (groups.some(group => group.name === formState.name)) {
        setState(TASK_STATE.ERROR);
        setMessage(`Cannot create duplicate group: ${formState.name}`);
        return;
      }
      try {
        await mapApi.saveAnnotationGroup({
          networkName,
          group: {
            name: formState.name,
            geojson: JSON.stringify(turf.featureCollection([])),
          },
        });
        await loadGroups();
        onClose();
      } catch (err) {
        setState(TASK_STATE.ERROR);
        setMessage(`Could not create group`);
      }
    },
    [formState, networkName, onClose, setState, setMessage, loadGroups, groups],
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
            Create
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}
