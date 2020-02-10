/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ConfigRoot from '../ConfigRoot';
import React from 'react';
import {ConfigLayer, E2EConfigMode} from '../../../constants/ConfigConstants';
import {TestApp} from '../../../tests/testHelpers';
import {assertType} from '@fbcnms/util/assert';
import {cleanup, fireEvent, waitForElement} from '@testing-library/react';
import {getControllerConfig} from '../../../apiutils/ConfigAPIUtil';
import {mockNetworkConfig, renderWithRouter} from '../../../tests/testHelpers';

afterEach(cleanup);

const defaultProps = {
  networkName: 'test',
  networkConfig: mockNetworkConfig(),
  editModes: E2EConfigMode,
  initialEditMode: E2EConfigMode.CONTROLLER,
  setParentState: jest.fn(() => {}),
  getSidebarProps: () => {
    return {editMode: E2EConfigMode.CONTROLLER, useMetadataBase: true};
  },
  getRequests: () => [],
  getConfigLayers: jest.fn(() => [{id: ConfigLayer.BASE, value: {}}]),
  getConfigMetadata: jest.fn(() => {}),
  getConfigOverrides: jest.fn(() => {}),
  onSubmitDraft: jest.fn(() => {}),
  onEditModeChanged: jest.fn(() => {}),
  onSetConfigBase: jest.fn(() => {}),
};

test('renders spinner initially without crashing', () => {
  const {getByTestId} = renderWithRouter(
    <TestApp>
      <ConfigRoot
        {...defaultProps}
        getRequests={() => [
          {func: getControllerConfig, key: 'controllerConfig'},
        ]}
      />
    </TestApp>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders table after spinner', async () => {
  const {queryByTestId, getByText} = renderWithRouter(
    <TestApp>
      <ConfigRoot {...defaultProps} />
    </TestApp>,
  );
  await waitForElement(() => getByText('Cancel'));
  expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  expect(getByText('Field')).toBeInTheDocument();
  expect(getByText('Submit')).toBeInTheDocument();
});

test('renders multiple tabs based on edit mode', async () => {
  const {queryByTestId, getByText} = renderWithRouter(
    <TestApp>
      <ConfigRoot {...defaultProps} />
    </TestApp>,
  );
  await waitForElement(() => getByText('Cancel'));
  expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  expect(getByText('CONTROLLER')).toBeInTheDocument();
  expect(getByText('AGGREGATOR')).toBeInTheDocument();
});

test('change table without crashing', async () => {
  const {queryByTestId, getByText} = renderWithRouter(
    <TestApp>
      <ConfigRoot {...defaultProps} />
    </TestApp>,
  );
  await waitForElement(() => getByText('Cancel'));
  expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  const rootTabs = assertType(
    queryByTestId('config-root-tabs'),
    HTMLDivElement,
  );
  // $FlowFixMe: value is used on the div
  expect(rootTabs.value === 'CONTROLLER');
  fireEvent.click(getByText('AGGREGATOR'));
  expect(getByText('Field')).toBeInTheDocument();
  // $FlowFixMe: value is used on the div
  expect(rootTabs.value === 'AGGREGATOR');
});
