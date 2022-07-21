/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
