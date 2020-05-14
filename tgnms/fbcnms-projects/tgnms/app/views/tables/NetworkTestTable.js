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
import {SnackbarProvider} from 'notistack';
import {
  createTestMapLink,
  getTestOverlayId,
} from '../../helpers/NetworkTestHelpers';
import type {ContextRouter} from 'react-router-dom';

type Props = {
  ...ContextRouter,
};

export default function NetworkTestTable({match, location}: Props) {
  const {networkName} = match.params;
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
      }
      // can't use an absolute url in react-router
      return `${url.pathname}${url.search}`;
    },
    [location.search, networkName],
  );
  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={10000}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}>
      <NetworkTest
        createTestUrl={createTestUrl}
        networkName={networkName}
        selectedExecutionId={getTestOverlayId(location)}
      />
    </SnackbarProvider>
  );
}
