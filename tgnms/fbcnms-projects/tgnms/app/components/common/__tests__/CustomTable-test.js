/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {render} from '@testing-library/react';

import CustomTable from '@fbcnms/tg-nms/app/components/common/CustomTable';

test('Renders columns and rows', () => {
  const {getByText} = render(
    <CustomTable
      headerHeight={40}
      overscanRowCount={5}
      rowHeight={40}
      columns={[{key: 'test', label: 'Test Label', width: 40}]}
      data={[{test: '123'}, {test: '456'}]}
      onRowSelect={() => {}}
    />,
  );
  expect(getByText('Test Label')).toBeInTheDocument();
  expect(getByText('123')).toBeInTheDocument();
  expect(getByText('456')).toBeInTheDocument();
});
