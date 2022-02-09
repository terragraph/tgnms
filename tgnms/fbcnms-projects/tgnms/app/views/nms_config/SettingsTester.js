/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as settingsApi from '@fbcnms/tg-nms/app/apiutils/SettingsAPIUtil';
import Button from '@material-ui/core/Button';
import CheckIcon from '@material-ui/icons/Check';
import CircularProgress from '@material-ui/core/CircularProgress';
import Collapse from '@material-ui/core/Collapse';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import PriorityHigh from '@material-ui/icons/PriorityHigh';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import red from '@material-ui/core/colors/red';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {makeStyles} from '@material-ui/styles';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useSettingsFormContext} from './SettingsFormContext';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  viewContainer: {
    padding: theme.spacing(3),
  },
  tabs: {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  tab: {
    minWidth: 100,
    padding: `${theme.spacing(0)}px ${theme.spacing(3)}px`,
  },
  testStatus: {
    height: 80,
    maxHeight: 80,
    overflowY: 'auto',
    maxWidth: '100%',
  },
  statusPaper: {
    minHeight: 30,
    padding: theme.spacing(2),
  },
  testSuccess: {
    color: theme.palette.success.main,
    backgroundColor: theme.palette.success.light,
  },
  testError: {
    color: theme.palette.error.dark,
    backgroundColor: red[100],
  },
  testLoading: {
    backgroundColor: theme.palette.grey[100],
  },
}));

export default function SettingsTester({keys}: {keys: Array<string>}) {
  const classes = useStyles();
  const {
    message,
    setMessage,
    isLoading,
    isError,
    isSuccess,
    success,
    error,
    loading,
  } = useTaskState();
  const {formState} = useSettingsFormContext();
  const testSettings = React.useCallback(async () => {
    loading();
    setMessage(null);
    const testState = keys.reduce((map, key) => {
      map[key] = formState[key];
      return map;
    }, {});
    try {
      const data = await settingsApi.testSettings(testState);
      const results = objectEntriesTypesafe<
        string,
        {success: boolean, message?: string},
      >(data);
      const errorMessages = results
        .filter(([_, {success}]) => !success)
        .map(([_, {message}]) => message);
      if (errorMessages.length > 0) {
        setMessage(errorMessages.join(', '));
      } else {
        setMessage('Success!');
      }
      for (const [_, {success}] of results) {
        if (!success) {
          return error();
        }
      }
      success();
    } catch (err) {
      setMessage(err?.message || 'An unexpected error occurred');
      error();
    }
  }, [formState, keys, setMessage, success, error, loading]);
  return (
    <Grid container justifyContent="space-between" alignItems="center">
      <Grid item className={classes.testStatus} xs={8}>
        <TestStatus
          isVisible={isLoading}
          icon={<CircularProgress size={20} />}
          className={classes.testLoading}
        />
        <TestStatus
          isVisible={isError}
          message={message}
          icon={<PriorityHigh />}
          className={classes.testError}
        />
        <TestStatus
          isVisible={isSuccess}
          message={message}
          icon={<CheckIcon />}
          className={classes.testSuccess}
        />
      </Grid>
      <Grid item>
        <Button onClick={testSettings} variant="contained">
          Test
        </Button>
      </Grid>
    </Grid>
  );
}

function TestStatus({
  isVisible,
  className,
  icon,
  message,
}: {
  isVisible: boolean,
  className?: string,
  icon: React.Node,
  message?: ?string,
}) {
  const classes = useStyles();
  return (
    <Collapse in={isVisible}>
      <Paper
        classes={{root: classNames(className, classes.statusPaper)}}
        elevation={0}>
        <Grid
          item
          container
          alignItems="center"
          spacing={1}
          justifyContent="center"
          wrap="nowrap">
          <Grid item xs={1}>
            {icon}
          </Grid>
          {message && (
            <Grid item xs={11}>
              <Typography variant="body2">{message}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Collapse>
  );
}
