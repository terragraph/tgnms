/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigContent from '../ConfigContent';
import {EDITOR_OPTIONS} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const defaultProps = {
  contentDisplayMode: EDITOR_OPTIONS.FORM,
  hideDeprecatedFields: false,
};

const mockUseConfigTaskContext = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(
    mockConfigTaskContextValue({
      configParams: {baseConfigs: null},
    }),
  );

test('renders error', async () => {
  const {getByTestId} = render(
    <TestApp>
      <ConfigContent {...defaultProps} />
    </TestApp>,
  );
  expect(getByTestId('error')).toBeInTheDocument();
});

test('renders specific mode based on contentDisplayMode', async () => {
  mockUseConfigTaskContext.mockReturnValue(mockConfigTaskContextValue());

  const {getByText} = render(
    <TestApp>
      <ConfigContent {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Network')).toBeInTheDocument();
});
