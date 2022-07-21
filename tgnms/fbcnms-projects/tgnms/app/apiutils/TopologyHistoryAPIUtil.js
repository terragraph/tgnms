/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import axios, {CancelToken} from 'axios';
import type {
  TopologyHistoryInput,
  TopologyHistoryResultsType,
} from '@fbcnms/tg-nms/shared/dto/TopologyHistoryTypes';

export async function getTopologyHistory({
  inputData,
  cancelToken,
}: {
  inputData: TopologyHistoryInput,
  cancelToken: CancelToken,
}) {
  const result = await axios<
    TopologyHistoryInput,
    Promise<Array<TopologyHistoryResultsType>>,
  >({
    url: `/topology_history/topology`,
    method: 'GET',
    cancelToken: cancelToken,
    params: {
      network_name: inputData.networkName || null,
      start_dt: inputData.startTime || null,
      end_dt: inputData.endTime || null,
    },
  });
  return result.data;
}
