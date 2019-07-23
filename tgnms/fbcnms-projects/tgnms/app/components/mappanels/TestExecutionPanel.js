/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import CustomExpansionPanel from '../common/CustomExpansionPanel';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LinkTestResultDetails from '../../views/network_test/LinkTestResultDetails';
import LoadingBox from '../common/LoadingBox';
import Paper from '@material-ui/core/Paper';
import React, {useMemo} from 'react';
import Typography from '@material-ui/core/Typography';
import {TEST_TYPE} from '../../../shared/dto/TestExecution';
import {TopologyElementType} from '../../constants/NetworkConstants.js';
import {makeStyles} from '@material-ui/styles';
import {useLoadTestExecution} from '../../views/network_test/hooks';
import type {Element} from '../../NetworkContext';
import type {LinkTestResult as LinkTestResultType} from '../../views/network_test/LinkTestResultDetails';
import type {TestExecution} from '../../../shared/dto/TestExecution';

type Props = {
  testId: ?string,
  selectedElement: Element,
};

type ExpansionPanelProps = {
  expanded: boolean,
  onClose: () => any,
};

export default function TestExecutionPanel(props: Props & ExpansionPanelProps) {
  const {expanded, testId, selectedElement, onClose} = props;
  if (!testId) {
    return null;
  }

  return (
    <CustomExpansionPanel
      title="Test Results"
      expanded={expanded}
      onClose={onClose}
      details={
        <TestExecutionSummary
          testId={testId}
          selectedElement={selectedElement}
        />
      }
    />
  );
}

const useSummaryStyles = makeStyles(theme => ({
  header: {
    textTransform: 'capitalize',
  },
  resultDivider: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2),
  },
}));

function TestExecutionSummary(props: Props) {
  const {testId, selectedElement} = props;
  const classes = useSummaryStyles();
  const {loading, execution} = useLoadTestExecution({executionId: testId});

  if (loading || !execution) {
    return <LoadingBox fullScreen={false} />;
  }

  return (
    <Grid container direction="column">
      <Typography className={classes.header} variant="h6" gutterBottom>
        {TEST_TYPE[execution.test_code] || execution.test_code}
      </Typography>
      <Typography variant="body1">
        {new Date(execution.start_date_utc).toLocaleString()}
      </Typography>
      <Divider className={classes.resultDivider} />
      {isLinkSelected(selectedElement) ? (
        <LinkTestResult linkName={selectedElement.name} execution={execution} />
      ) : (
        <Typography variant="subtitle2">
          Select a link on the map to show its test results.
        </Typography>
      )}
    </Grid>
  );
}

function isLinkSelected(element: Element) {
  return element && element.type === TopologyElementType.LINK;
}

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

function LinkTestResult({
  linkName,
  execution,
}: {
  linkName: string,
  execution: TestExecution,
}) {
  const classes = useResultStyles();
  const testResult: ?LinkTestResultType = useMemo(() => {
    const linkResults =
      execution.test_results &&
      execution.test_results.filter(res => res.link_name === linkName);
    // we expect a test result for each side of the link
    if (!linkResults || linkResults.length < 2) {
      return null;
    }
    return {
      linkName: linkName,
      results: linkResults,
    };
  }, [execution, linkName]);

  if (!testResult) {
    return (
      <Paper className={classes.linkMissingAlert} elevation={0}>
        <Typography variant="body1">
          Could not find test results for{' '}
          <span className={classes.linkName}>{linkName}</span>. The link may
          have been unavailable during this test execution.
        </Typography>
      </Paper>
    );
  }
  const testResultIds = testResult.results.map(result => result.id.toString());
  return (
    <>
      <Typography variant="body1" align="center">
        {linkName}
      </Typography>
      <LinkTestResultDetails testResultIds={testResultIds} />
    </>
  );
}
