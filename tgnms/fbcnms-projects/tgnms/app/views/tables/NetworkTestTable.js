/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Customizes NetworkTestExecutionsTable to be used outside of NetworkTestView
 */
'use strict';
import React, {useCallback} from 'react';
import type {ContextRouter} from 'react-router-dom';
import NetworkTestExecutionsTable from '../network_test/NetworkTestExecutionsTable';
import {
  getTestOverlayId,
  createTestMapLink,
} from '../../helpers/NetworkTestHelpers';

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
    <NetworkTestExecutionsTable
      createTestUrl={createTestUrl}
      networkName={networkName}
      selectedExecutionId={getTestOverlayId(location)}
      showNotification={() => {}}
      hideMapLink={true}
    />
  );
}
