/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import LinkDirectionDetails from './LinkDirectionDetails';
import Loading from '@material-ui/core/CircularProgress';
import {makeStyles} from '@material-ui/styles';

import type {ExecutionResultDataType} from '../../../shared/dto/NetworkTestTypes';

//tests are run twice for each link, one for each direction

const useLinkStyles = makeStyles(theme => ({
  linkResultsContainer: {
    paddingTop: theme.spacing(2),
  },
  resultDivider: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2),
  },
}));

export default function LinkTestResultDetails({
  results,
}: {
  results: Array<ExecutionResultDataType>,
}) {
  const classes = useLinkStyles();
  const [resultA, resultZ] = results;

  if (!results) {
    return <Loading />;
  }

  return (
    <Grid
      className={classes.linkResultsContainer}
      container
      direction="column"
      spacing={1}>
      {resultA && (
        <Grid container item direction="column" justify="flex-start" xs={12}>
          <LinkDirectionDetails result={resultA} />
        </Grid>
      )}
      <Divider className={classes.resultDivider} />
      {resultZ && (
        <Grid container item direction="column" justify="flex-start" xs={12}>
          <LinkDirectionDetails result={resultZ} />
        </Grid>
      )}
    </Grid>
  );
}
