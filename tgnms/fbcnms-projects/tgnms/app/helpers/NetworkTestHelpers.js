/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {
  EXECUTION_STATUS,
  EXECUTION_STATUS_SIGNIFICANCE,
} from '../constants/ScheduleConstants';
import {HEALTH_CODES} from '../constants/HealthConstants';
import {generatePath} from 'react-router';
import {getUrlSearchParam} from './NetworkUrlHelpers';

import type {LinkTestResultType} from '../views/network_test/NetworkTestTypes';
import type {Location} from 'react-router-dom';

/**
 * Gets the currently selected test execution from the query string.
 * Use this if test results are being included in a screen outside of the
 * network_test view.
 **/
export function getTestOverlayId(location: Location): ?string {
  return getUrlSearchParam('test', location);
}

export function getSpeedTestId(location: Location): ?string {
  return getUrlSearchParam('speedTest', location);
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
  execution: LinkTestResultType,
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
  execution: LinkTestResultType,
): $Values<typeof EXECUTION_STATUS> {
  const status = execution.results.reduce(
    (finalStatus, result) =>
      EXECUTION_STATUS_SIGNIFICANCE[result.status] <
      EXECUTION_STATUS_SIGNIFICANCE[finalStatus]
        ? result.status
        : finalStatus,
    'FAILED',
  );
  return EXECUTION_STATUS[status];
}
