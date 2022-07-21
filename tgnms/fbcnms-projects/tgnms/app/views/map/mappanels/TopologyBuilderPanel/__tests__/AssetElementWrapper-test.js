/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AssetElementWrapper from '../AssetElementWrapper';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  children: 'testChildren',
  onClose: jest.fn(),
};

test('render without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <AssetElementWrapper {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testChildren')).toBeInTheDocument();
});
