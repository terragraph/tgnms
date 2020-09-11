/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import TaskBasedConfig from '../TaskBasedConfig';
import {TestApp} from '../../../tests/testHelpers';
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitForElement,
} from '@testing-library/react';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

jest
  .spyOn(require('../../../hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {},
  });

jest
  .spyOn(require('../../../apiutils/ConfigAPIUtil'), 'getNodeOverridesConfig')
  .mockReturnValue({});

jest
  .spyOn(require('../../../helpers/ConfigHelpers'), 'getTopologyNodeList')
  .mockReturnValue([{name: 'testNode'}, {name: 'mock filter node'}]);

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <TaskBasedConfig />
    </TestApp>,
  );
  expect(getByText('Routing')).toBeInTheDocument();
});

test('clicking tab renders new config form for that tab', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <TaskBasedConfig />
    </TestApp>,
  );
  expect(getByText('Routing')).toBeInTheDocument();
  act(() => {
    fireEvent.click(getByText('POP'));
  });
  expect(queryByText('Routing')).not.toBeInTheDocument();
  await waitForElement(() => getByText('POP'));
  expect(getByText('POP')).toBeInTheDocument();
});
