/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import axios from 'axios';
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
}));

export default function NmsExportForm() {
  const classes = useStyles();
  const snackbars = useSnackbars();

  const handleExport = () => {
    return axios
      .post(`/export`)
      .then(response => {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'octet/stream',
        });

        const anchor = document.createElement('a');
        window.document.body.appendChild(anchor);
        anchor.style.display = 'none';
        const url = window.URL.createObjectURL(blob);
        anchor.href = url;
        anchor.download = 'nms_export.json';
        anchor.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(_ => snackbars.error('Unable to export NMS data right now'));
  };

  return (
    <Paper className={classes.paper} elevation={2}>
      <Button
        className={classes.button}
        variant="outlined"
        onClick={handleExport}>
        Export
      </Button>
    </Paper>
  );
}
