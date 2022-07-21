/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import BatchUpgradeTable from '../BatchUpgradeTable';
import React from 'react';
import UpgradeSection from '../UpgradeSection';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockBatchArrayData} from '@fbcnms/tg-nms/app/tests/data/Upgrade';
import {render} from '@testing-library/react';

const defaultProps = {
  data: mockBatchArrayData(),
  title: 'testTitle',
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <UpgradeSection>
        <BatchUpgradeTable {...defaultProps} data={[]} />
      </UpgradeSection>
    </TestApp>,
  );
  expect(getByText('testTitle (0)')).toBeInTheDocument();
  expect(getByText('There is no data to display')).toBeInTheDocument();
});
