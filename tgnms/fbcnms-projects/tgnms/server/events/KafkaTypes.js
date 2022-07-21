/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type Message = {
  topic: string,
  value: string,
  offset: number,
  partition: number,
  key: string,
  timestamp: string,
};
