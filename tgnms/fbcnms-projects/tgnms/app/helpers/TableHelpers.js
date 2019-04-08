/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';

export const TableOrder = {
  ASCENDING: 'asc',
  DESCENDING: 'desc',
};

export function renderStatusColor(cell: boolean) {
  return (
    <span style={{color: cell ? 'forestgreen' : 'firebrick'}}>
      {cell ? 'Yes' : 'No'}
    </span>
  );
}
