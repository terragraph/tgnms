/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ConfigTaskForm from '../ConfigTaskForm';
import {TestApp} from '../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {configModes} from '../../../constants/ConfigConstants';

afterEach(cleanup);

const defaultProps = {
  title: 'testTitle',
  description: 'test description',
  mode: configModes.Network,
  nodeName: null,
  onClose: jest.fn(),
};

jest
  .spyOn(require('../../../hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {nodeOverridesConfig: {}, networkOverridesConfig: {}},
  });

test('renders loading initially', () => {
  jest
    .spyOn(require('../../../hooks/useNodeConfig'), 'useNodeConfig')
    .mockReturnValueOnce({
      loading: true,
      configData: [{field: ['test', 'param']}],
      configParams: {},
    });
  const {getByTestId} = render(
    <TestApp>
      <ConfigTaskForm>test</ConfigTaskForm>
    </TestApp>,
  );
  expect(getByTestId('loading')).toBeInTheDocument();
});

test('renders without props without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskForm>test</ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders with network props', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskForm {...defaultProps}>test</ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('renders with node props', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskForm
        {...defaultProps}
        mode={configModes.Node}
        nodeName="testNodeName">
        test
      </ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
});

test('cancel calls onClose if its a modal', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTaskForm {...defaultProps}>test</ConfigTaskForm>
    </TestApp>,
  );
  expect(getByText('Cancel')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByText('Cancel'));
  });
  expect(defaultProps.onClose).toHaveBeenCalled();
});
