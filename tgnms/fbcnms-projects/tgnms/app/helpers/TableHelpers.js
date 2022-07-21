/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import React from 'react';

export const TableOrder = Object.freeze({
  ASCENDING: 'asc',
  DESCENDING: 'desc',
});

export function renderStatusColor(cell: boolean) {
  return (
    <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
      {cell ? 'Yes' : 'No'}
    </span>
  );
}
