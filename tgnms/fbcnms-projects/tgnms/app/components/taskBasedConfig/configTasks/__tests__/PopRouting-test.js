/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import PopRouting from '../PopRouting';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue({
    onUpdate: jest.fn(),
    selectedValues: {},
  });

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <PopRouting />
    </TestApp>,
  );
  expect(getByText('Upstream Routing')).toBeInTheDocument();
});
