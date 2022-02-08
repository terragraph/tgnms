/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Create a ref whose value always reflects val. This helps to get around
 * issues of stale closures within hooks.
 */

import * as React from 'react';

export default function useLiveRef<T>(val: T): {|current: T|} {
  const ref = React.useRef<T>(val);
  ref.current = val;
  return ref;
}
