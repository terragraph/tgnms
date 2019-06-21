/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import type {Location, RouterHistory} from 'react-router-dom';
import {generatePath} from 'react-router';

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

export function getUrlSearchParam(
  key: string,
  {pathname, search}: Location,
): ?string {
  // Parse the current url with respect to the react-router location.
  const parsed = new URL(`${pathname}${search}`, window.location.origin);
  if (!parsed.searchParams.has(key)) {
    return null;
  }
  const param = parsed.searchParams.get(key);
  return param;
}

export function setUrlSearchParam(
  history: RouterHistory,
  key: string,
  value: string,
) {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  url.searchParams.set(key, value);
  history.replace({
    search: url.searchParams.toString(),
  });
}

export function deleteUrlSearchParam(history: RouterHistory, key: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  history.replace({
    search: url.searchParams.toString(),
  });
}
