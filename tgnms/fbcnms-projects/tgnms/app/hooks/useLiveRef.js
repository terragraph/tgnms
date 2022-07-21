/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

/*
 * Create a ref whose value always reflects val. This helps to get around
 * issues of stale closures within hooks.
 */

import * as React from 'react';

export default function useLiveRef<T>(val: T): {|current: T|} {
  const ref = React.useRef<T>(val);
  ref.current = val;
  return ref;
}
