/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {generatePath} from 'react-router';
import {getUrlSearchParam} from './NetworkUrlHelpers';
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

export function makeTestExecutionLink(params: {
  networkName: string,
  executionId: string | number,
}) {
  return generatePath('/network_test/:networkName/:executionId', params);
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
