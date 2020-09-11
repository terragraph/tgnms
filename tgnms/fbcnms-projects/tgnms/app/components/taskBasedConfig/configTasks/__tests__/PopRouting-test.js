/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import PopRouting from '../PopRouting';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

jest
  .spyOn(
    require('../../../../contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue({
    onUpdate: jest.fn(),
  });

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <PopRouting />
    </TestApp>,
  );
  expect(getByText('Upstream Routing')).toBeInTheDocument();
});
