/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import axios from 'axios';
import type {
  NetworkHealth,
  NetworkInstanceConfig,
  NetworkState,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';

export async function getTopology(name: string): Promise<NetworkState> {
  const response = await axios.get<void, NetworkState>('/topology/get/' + name);
  return response.data;
}

export async function listTopology(): Promise<{|
  [string]: NetworkInstanceConfig,
|}> {
  const response = await axios.get<void, {|[string]: NetworkInstanceConfig|}>(
    '/topology/list',
  );
  return response.data;
}

export async function getHealth({
  networkName,
  timeWindowHours,
}: {
  networkName: string,
  timeWindowHours: number,
}): Promise<?NetworkHealth> {
  const response = await axios.get(
    `/topology/link_health/${networkName}/${timeWindowHours}`,
  );
  return response.data;
}

export async function startTopologyScan({
  networkName,
  txNode,
}: {
  networkName: string,
  txNode: string,
}) {
  const response = await axios.post(`/topology/scan/${networkName}`, {txNode});
  return response.data;
}
