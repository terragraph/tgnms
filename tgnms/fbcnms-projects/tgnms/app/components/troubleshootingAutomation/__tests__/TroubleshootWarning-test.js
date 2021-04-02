/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import TroubleshootWarning from '../TroubleshootWarning';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

const defaultProps = {
  isToolTip: false,
  title: 'testTitle',
  modalContent: 'testContent',
  onAttemptFix: jest.fn(),
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <TroubleshootWarning {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testTitle')).toBeInTheDocument();
});

test('renders modal when clicked', () => {
  const {getByText} = render(
    <TestApp>
      <TroubleshootWarning {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('testTitle'));
  expect(getByText('Confirm')).toBeInTheDocument();
  expect(getByText('Cancel')).toBeInTheDocument();
});

test('confirm calls troubleshoot automation hook', () => {
  const {getByText} = render(
    <TestApp>
      <TroubleshootWarning {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('testTitle'));
  fireEvent.click(getByText('Confirm'));

  expect(defaultProps.onAttemptFix).toHaveBeenCalled();
});
