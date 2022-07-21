/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {Location, RouterHistory} from 'react-router-dom';

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
