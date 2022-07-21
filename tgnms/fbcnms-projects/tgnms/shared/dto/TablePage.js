/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

/*
 * Represents a paginated view into a database table
 */

export type TablePage<T> = {
  rows: Array<T>,

  // 0-indexed page number
  offset?: number,

  // size of each page
  limit?: number,

  // total number of rows matching specified query
  totalCount?: number,
};
