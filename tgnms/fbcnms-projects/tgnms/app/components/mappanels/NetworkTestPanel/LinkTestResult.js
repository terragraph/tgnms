/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import IconButton from '@material-ui/core/IconButton';
import LinkTestResultDetails from '../../../views/network_test/LinkTestResultDetails';
import NetworkContext from '../../../contexts/NetworkContext';
import Paper from '@material-ui/core/Paper';
import React, {useMemo} from 'react';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

import type {LinkTestResultType} from '../../../views/network_test/NetworkTestTypes';

const useResultStyles = makeStyles(theme => ({
  linkMissingAlert: {
    marginTop: theme.spacing(),
    padding: theme.spacing(),
    backgroundColor: theme.palette.grey[200],
  },
  linkName: {
    fontWeight: 'bold',
  },
}));

export default function LinkTestResult({
  linkName,
  executionResults,
}: {
  linkName: string,
  executionResults: Array<LinkTestResultType>,
}) {
  const classes = useResultStyles();
  const {removeElement, selectedElement} = React.useContext(NetworkContext);

  const testResult: ?LinkTestResultType = useMemo(() => {
    const linkResults =
      executionResults &&
      executionResults.find(result => result.linkName === linkName)?.results;
    // we expect a test result for each side of the link
    if (!linkResults || linkResults.length < 2) {
      return null;
    }
    return {
      linkName: linkName,
      results: linkResults,
    };
  }, [executionResults, linkName]);

  const handleBack = React.useCallback(() => {
    if (selectedElement) {
      removeElement(selectedElement?.type, selectedElement?.name);
    }
  }, [removeElement, selectedElement]);

  return (
    <>
      <Typography variant="body1">
        <IconButton
          size="small"
          data-testid="back-button"
          onClick={handleBack}
          color="secondary">
          <ChevronLeftIcon />
        </IconButton>
        {linkName}
      </Typography>
      {testResult ? (
        <LinkTestResultDetails results={testResult.results} />
      ) : (
        <Paper className={classes.linkMissingAlert} elevation={0}>
          <Typography variant="body1">
            Could not find test results for{' '}
            <span className={classes.linkName}>{linkName}</span>. The link may
            have been unavailable during this test execution.
          </Typography>
        </Paper>
      )}
    </>
  );
}
