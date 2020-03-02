/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ConfigSidebar from '../ConfigSidebar';
import React from 'react';
import {TestApp, initWindowConfig} from '../../../tests/testHelpers';
import {cleanup, fireEvent} from '@testing-library/react';
import {mockNetworkConfig, renderWithRouter} from '../../../tests/testHelpers';

beforeEach(() => {
  initWindowConfig({
    env: {
      JSON_CONFIG_ENABLED: 'true',
    },
  });
});

afterEach(cleanup);

const defaultProps = {
  editMode: '',
  useRawJsonEditor: false,
  networkName: 'test',
  networkConfig: mockNetworkConfig(),
  onChangeEditorType: jest.fn(() => {}),
  selectedNodeInfo: {},
  onSelectNode: jest.fn(() => {}),
  baseConfigs: {},
  selectedImage: 'test',
  onSelectImage: jest.fn(() => {}),
  hardwareBaseConfigs: {},
  selectedHardwareType: '',
  onSelectHardwareType: jest.fn(() => {}),
  topologyNodeList: [],
  useMetadataBase: false,
  onSetConfigBase: jest.fn(() => {}),
  onConfigRefresh: jest.fn(() => {}),
  onUpdateSnackbar: jest.fn(() => {}),
  selectedFirmwareVersion: '',
  onSelectFirmwareVersion: jest.fn(() => {}),
  firmwareBaseConfigs: {},
};

test('renders network sidebar without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="NETWORK" />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('Table')).toBeInTheDocument();
  expect(getByText('Change Base Version')).toBeInTheDocument();
});

test('renders node sidebar without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="NODE" />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('Table')).toBeInTheDocument();
  expect(getByText('Filter')).toBeInTheDocument();
  expect(getByText('Show Full Configuration')).toBeInTheDocument();
});

test('renders e2e sidebar without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="E2E" />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('Table')).toBeInTheDocument();
  expect(getByText('Base Fields')).toBeInTheDocument();
});

test('change editor calls onChangeEditorType', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="E2E" />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('Table')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('Table'));
  fireEvent.click(getByText('JSON'));
  expect(defaultProps.onChangeEditorType).toHaveBeenCalled();
});

test('renders network actions button', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="NETWORK" />
    </TestApp>,
  );
  expect(getByText(/network optimization/i)).toBeInTheDocument();
});

test('renders network actions when button is clicked', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="NETWORK" />
    </TestApp>,
  );
  expect(getByText(/network optimization/i)).toBeInTheDocument();
  fireEvent.click(getByText(/network optimization/i));
  expect(getByText('Actions')).toBeInTheDocument();
});

test('renders network baseConfigs', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar
        {...defaultProps}
        baseConfigs={{default: {}, test: {}}}
        editMode="NETWORK"
      />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('test'));
  expect(getByText('default')).toBeInTheDocument();
});

test('renders node config change', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar
        {...defaultProps}
        baseConfigs={{default: {}, test: {}}}
        editMode="NETWORK"
      />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('test')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('test'));
  expect(getByText('default')).toBeInTheDocument();
  fireEvent.click(getByText('default'));
  expect(getByText('default')).toBeInTheDocument();
  expect(defaultProps.onSelectImage).toHaveBeenCalled();
});

test('renders node filter change', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="NODE" />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('All nodes')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('All nodes'));
  expect(getByText('CNs only')).toBeInTheDocument();
  expect(getByText('Nodes with overrides')).toBeInTheDocument();
  fireEvent.click(getByText('CNs only'));
  expect(defaultProps.onSelectNode).toHaveBeenCalled();
});

test('change E2E base fields', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar {...defaultProps} editMode="E2E" />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('Hidden')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('Hidden'));
  expect(getByText('Show all')).toBeInTheDocument();
  fireEvent.click(getByText('Show all'));
  expect(defaultProps.onSetConfigBase).toHaveBeenCalled();
});

test('renders network firmware', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar
        {...defaultProps}
        firmwareBaseConfigs={{none: {}, test: {}}}
        selectedFirmwareVersion="none"
        editMode="NETWORK"
      />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('Change Firmware Version')).toBeInTheDocument();
  expect(getByText('none')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('none'));
  expect(getByText('test')).toBeInTheDocument();
});

test('renders node config change', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigSidebar
        {...defaultProps}
        firmwareBaseConfigs={{none: {}, test: {}}}
        selectedFirmwareVersion="none"
        editMode="NETWORK"
      />
    </TestApp>,
  );
  expect(getByText('Configuration Options')).toBeInTheDocument();
  expect(getByText('none')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('none'));
  expect(getByText('test')).toBeInTheDocument();
  fireEvent.click(getByText('test'));
  expect(getByText('test')).toBeInTheDocument();
  expect(defaultProps.onSelectFirmwareVersion).toHaveBeenCalled();
});
