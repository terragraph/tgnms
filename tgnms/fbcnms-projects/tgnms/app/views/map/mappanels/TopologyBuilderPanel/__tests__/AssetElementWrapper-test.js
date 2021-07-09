/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
