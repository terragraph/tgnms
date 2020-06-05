/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Customizes NetworkTestExecutionsTable to be used outside of NetworkTestView
 */

import NetworkTest from '../network_test/NetworkTest';
import React, {useCallback} from 'react';
import {MAPMODE, useMapContext} from '../../contexts/MapContext';
import {
  createTestMapLink,
  getTestOverlayId,
} from '../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import type {ContextRouter} from 'react-router-dom';

type Props = {
  ...ContextRouter,
};
const useStyles = makeStyles(_theme => ({
  root: {
    height: '100vh',
  },
}));
export default function NetworkTestTable({match, location}: Props) {
  const {networkName} = match.params;
  const {setMapMode} = useMapContext();
  const classes = useStyles();

  const createTestUrl = useCallback(
    ({executionId}) => {
      const url = new URL(
        createTestMapLink({
          executionId,
          networkName,
        }),
        window.location.origin,
      );
      url.search = location.search;
      if (executionId) {
        url.searchParams.set('test', executionId);
        url.searchParams.set('mapMode', MAPMODE.NETWORK_TEST);
      }
      setMapMode(MAPMODE.NETWORK_TEST);
      // can't use an absolute url in react-router
      return `${url.pathname}${url.search}`;
    },
    [location.search, networkName, setMapMode],
  );
  return (
    <div className={classes.root}>
      <NetworkTest
        createTestUrl={createTestUrl}
        networkName={networkName}
        selectedExecutionId={getTestOverlayId(location)}
      />
    </div>
  );
}
