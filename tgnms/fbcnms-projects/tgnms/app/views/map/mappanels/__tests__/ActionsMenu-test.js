/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ActionsMenu from '../ActionsMenu';
import React from 'react';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  options: {
    actionItems: [
      {
        heading: 'Test Heading',
        actions: [{label: 'testLabel', func: jest.fn()}],
      },
    ],
  },
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('View Actions')).toBeInTheDocument();
});

test('clicking button Opens menu', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('View Actions')).toBeInTheDocument();
  fireEvent.click(getByText('View Actions'));
  expect(getByText('Test Heading')).toBeInTheDocument();
  expect(getByText('testLabel')).toBeInTheDocument();
});

test('clicking button in menu calls function', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('View Actions')).toBeInTheDocument();
  fireEvent.click(getByText('View Actions'));
  expect(getByText('testLabel')).toBeInTheDocument();
  fireEvent.click(getByText('testLabel'));
  expect(
    defaultProps.options.actionItems[0].actions[0].func,
  ).toHaveBeenCalled();
});
