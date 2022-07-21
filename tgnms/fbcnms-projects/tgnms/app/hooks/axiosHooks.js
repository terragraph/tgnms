/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import axios from 'axios';

import type {CancelToken, CancelTokenSource} from 'axios';

const FLOW_PLACEHOLDER: CancelTokenSource = {
  cancel: () => {},
  token: ('': any),
};
export function useCancelToken(): {
  source: CancelTokenSource,
  cancelToken: CancelToken,
  reset: () => void,
} {
  const firstMount = React.useRef(true);
  const sourceRef = React.useRef<CancelTokenSource>(
    firstMount.current ? axios.CancelToken.source() : FLOW_PLACEHOLDER,
  );
  if (firstMount.current) {
    firstMount.current = false;
  }
  const reset = React.useCallback(() => {
    sourceRef.current = axios.CancelToken.source();
  }, [sourceRef]);
  React.useEffect(() => {
    sourceRef.current = axios.CancelToken.source();
    return () => {
      sourceRef.current && sourceRef.current.cancel();
    };
  }, [sourceRef]);
  return {
    source: sourceRef.current,
    cancelToken: sourceRef.current.token,
    reset,
  };
}
