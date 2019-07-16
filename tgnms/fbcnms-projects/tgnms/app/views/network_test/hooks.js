/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as api from '../../apiutils/NetworkTestAPIUtil';
import axios from 'axios';
import {useEffect, useState} from 'react';
import type {TestExecution} from '../../../shared/dto/TestExecution';

export function useLoadTestExecution({
  executionId,
}: {
  executionId: ?string,
}): {execution: ?TestExecution, loading: boolean} {
  const [loading, setLoading] = useState(true);
  const [execution, setExecution] = useState<?TestExecution>(null);

  useEffect(() => {
    if (!executionId) {
      return;
    }
    setLoading(true);
    const cancelSource = axios.CancelToken.source();
    api
      .getTestExecution({
        executionId: executionId,
        includeTestResults: true,
        cancelToken: cancelSource.token,
      })
      .then(execution => {
        setLoading(false);
        setExecution(execution);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => cancelSource.cancel();
  }, [executionId]);

  return {loading, execution};
}
