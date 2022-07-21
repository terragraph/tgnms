/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';

/**
 * Invoke a function only when a component is unmounting. The function will have
 * an up-to-date closure when the component is unmounted.
 */
export default function useUnmount(fn: () => void) {
  const fnRef = React.useRef();
  React.useEffect(() => {
    fnRef.current = fn;
  }, [fn, fnRef]);
  React.useEffect(() => {
    return () => fnRef.current && fnRef.current();
  }, [fnRef]);
}
