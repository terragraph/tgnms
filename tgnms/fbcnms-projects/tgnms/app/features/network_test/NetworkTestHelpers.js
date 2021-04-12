/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as testApi from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import {
  EXECUTION_DEFS,
  NETWORK_TEST_TYPES,
  TEST_EXECUTION_STATUS,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {HEALTH_CODES} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {MAPMODE} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {generatePath} from 'react-router';
import {getUrlSearchParam} from '@fbcnms/tg-nms/app/helpers/NetworkUrlHelpers';

import type {AssetTestResultType} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestTypes';
import type {Location} from 'react-router-dom';
import type {RouterHistory} from 'react-router-dom';

/**
 * Gets the currently selected test execution from the query string.
 * Use this if test results are being included in a screen outside of the
 * network_test view.
 **/
export function getTestOverlayId(location: Location): ?string {
  return getUrlSearchParam('test', location);
}

export function createTestMapLink({
  networkName,
  executionId,
}: {
  networkName: ?string,
  executionId: ?string | ?number,
}) {
  if (
    !networkName ||
    executionId === null ||
    typeof executionId === 'undefined'
  ) {
    return '';
  }
  return `/map/${networkName || ''}/tests?test=${executionId || ''}`;
}

export function makeTestResultLink(params: {
  networkName: string,
  executionId: string | number,
  linkName: string,
}) {
  return generatePath(
    '/network_test/:networkName/:executionId/details/:linkName',
    params,
  );
}

export function getExecutionHealth(
  execution: AssetTestResultType,
): $Values<typeof HEALTH_CODES> {
  const health = execution.results.reduce((finalHealth, result) => {
    const healthNumber = HEALTH_CODES[result.health];
    if (healthNumber > finalHealth) {
      return healthNumber;
    }
    return finalHealth;
  }, -1);

  return health === -1 ? 4 : health;
}

export function getExecutionStatus(
  execution: AssetTestResultType,
): $Values<typeof TEST_EXECUTION_STATUS> {
  const status = execution.results.reduce(
    (finalStatus, result) =>
      EXECUTION_DEFS[result.status].order < EXECUTION_DEFS[finalStatus].order
        ? result.status
        : finalStatus,
    'FAILED',
  );
  return TEST_EXECUTION_STATUS[status];
}

export function isTestRunning(status: $Keys<typeof TEST_EXECUTION_STATUS>) {
  return (
    TEST_EXECUTION_STATUS[status] === TEST_EXECUTION_STATUS.RUNNING ||
    TEST_EXECUTION_STATUS[status] === TEST_EXECUTION_STATUS.PROCESSING
  );
}

export function startPartialTest({
  networkName,
  allowlist,
  testType,
  history,
}: {
  networkName: string,
  allowlist: Array<string>,
  testType: $Keys<typeof NETWORK_TEST_TYPES>,
  history: RouterHistory,
}) {
  testApi
    .startPartialExecution({
      networkName,
      allowlist,
      testType,
    })
    .then(response => {
      if (!response) {
        throw new Error(response.data.msg);
      }
      const id = response.data.execution_id;
      const url = new URL(
        createTestMapLink({
          executionId: id,
          networkName,
        }),
        window.location.origin,
      );
      url.search = location.search;
      if (id) {
        url.searchParams.set('test', id);
        url.searchParams.set('mapMode', MAPMODE.NETWORK_TEST);
      }
      // can't use an absolute url in react-router
      history.push(`${url.pathname}${url.search}`);
    });
}
