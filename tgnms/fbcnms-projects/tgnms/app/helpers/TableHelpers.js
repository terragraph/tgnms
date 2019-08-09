/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
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
