/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import axios from 'axios';
import useTaskState, {TASK_STATE} from '../../hooks/useTaskState';
import {makeStyles} from '@material-ui/styles';
import {useSnackbars} from '../../hooks/useSnackbar';

const useStyles = makeStyles(theme => ({
  paper: {
    flexGrow: 1,
    padding: theme.spacing(),
    overflowX: 'auto',
  },
  button: {
    margin: theme.spacing(1),
    float: 'right',
  },
  fileInput: {
    display: 'none',
  },
}));

export default function NmsImportForm() {
  const classes = useStyles();
  const snackbars = useSnackbars();
  const {isLoading, isSuccess, setState} = useTaskState();
  const [summary, setSummary] = React.useState(null);

  const handleImport = target => {
    setState(TASK_STATE.LOADING);

    const backupFile = target.files[0];
    if (backupFile) {
      const data = new FormData();
      data.append('file', backupFile);
      axios.post(`/import`, data).then(response => {
        setState(TASK_STATE.SUCCESS);
        setSummary(response.data);
      });
    } else {
      snackbars.error('Unable to load backup file');
    }
  };

  return (
    <Paper className={classes.paper} elevation={2}>
      <Button className={classes.button} component="label" variant="outlined">
        <Typography variant="button">Import</Typography>
        <input
          className={classes.fileInput}
          accept=".json"
          onChange={e => handleImport(e.target)}
          type="file"
        />
      </Button>
      {isLoading && <CircularProgress />}
      {isSuccess && (
        <>
          <Typography>Network Import Summary</Typography>
          <Grid container direction="column" spacing={2}>
            <Grid item container spacing={1}>
              <Grid item>
                <CheckCircleIcon />
              </Grid>
              <Grid item>
                <Typography>
                  {summary?.success?.length} {summary?.success?.join(', ')}
                </Typography>
              </Grid>
            </Grid>
            <Grid item container spacing={1}>
              <Grid item>
                <CancelIcon />
              </Grid>
              <Grid item>
                <Typography>
                  {summary?.errors?.length} {summary?.errors?.join(', ')}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </>
      )}
    </Paper>
  );
}
