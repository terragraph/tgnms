/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import type {Location} from 'react-router-dom';

/**
 * Gets the currently selected test execution from the query string.
 * Use this if test results are being included in a screen outside of the
 * network_test view.
 **/
export function getTestOverlayId({pathname, search}: Location): ?string {
  // Parse the current url with respect to the react-router location.
  const parsed = new URL(`${pathname}${search}`, window.location.origin);
  const testParam = parsed.searchParams.get('test');
  if (typeof testParam === 'string' && testParam.trim() !== '') {
    return testParam;
  }
  return null;
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
