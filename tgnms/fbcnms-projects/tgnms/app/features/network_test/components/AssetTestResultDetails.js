/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AssetDirectionDetails from './AssetDirectionDetails';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import Loading from '@material-ui/core/CircularProgress';
import {makeStyles} from '@material-ui/styles';

import type {ExecutionResultDataType} from '@fbcnms/tg-nms/shared/dto/NetworkTestTypes';

//tests are run twice for each link, one for each direction

const useLinkStyles = makeStyles(theme => ({
  linkResultsContainer: {
    paddingTop: theme.spacing(2),
  },
  resultDivider: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
}));

export default function AssetTestResultDetails({
  results,
  targetThroughput,
}: {
  results: Array<ExecutionResultDataType>,
  targetThroughput: ?number,
}) {
  const classes = useLinkStyles();
  const [resultA, resultZ] = results;

  if (!results) {
    return <Loading />;
  }

  return (
    <Grid className={classes.linkResultsContainer} container spacing={1}>
      {resultA && (
        <Grid
          container
          item
          direction="column"
          justifyContent="flex-start"
          xs={12}>
          <AssetDirectionDetails
            result={resultA}
            targetThroughput={targetThroughput}
          />
        </Grid>
      )}
      <Divider className={classes.resultDivider} />
      {resultZ && (
        <Grid
          container
          item
          direction="column"
          justifyContent="flex-start"
          xs={12}>
          <AssetDirectionDetails
            result={resultZ}
            targetThroughput={targetThroughput}
          />
        </Grid>
      )}
    </Grid>
  );
}
