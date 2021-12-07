/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTaskForm from '../ConfigTaskForm';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

const defaultProps = {
  title: 'testTitle',
  description: 'test description',
  editMode: FORM_CONFIG_MODES.NETWORK,
  onClose: jest.fn(),
};

beforeEach(() => {
  jest
    .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
    .mockReturnValue({
      loading: false,
      configData: [{field: ['test', 'param']}],
      configParams: {nodeOverridesConfig: {}, networkOverridesConfig: {}},
      reloadConfig: jest.fn(),
    });
});

test('renders loading initially', () => {
  jest
    .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
    // using mockReturnValue. this can render multiple times before we query it
    .mockReturnValue({
      loading: true,
      configData: [{field: ['test', 'param']}],
      configParams: {},
    });
  const {getByTestId} = render(
    <TestApp>
      <ConfigTaskForm {...defaultProps}>test</ConfigTaskForm>
    </TestApp>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders after loading without crashing', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskForm {...defaultProps}>test</ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders with network props', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskForm showSubmitButton={true} {...defaultProps}>
        test
      </ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders with node props', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskForm
        {...defaultProps}
        mode={FORM_CONFIG_MODES.NODE}
        nodeName="testNodeName">
        test
      </ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('cancel calls onClose if its a modal', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ConfigTaskForm {...defaultProps} showSubmitButton={true}>
        test
      </ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('Cancel')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByText('Cancel'));
  });
  expect(defaultProps.onClose).toHaveBeenCalled();
});
