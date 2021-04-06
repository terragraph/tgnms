/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeSysdumpsTable from '../NodeSysdumpsTable';
import React from 'react';
import {TestApp, renderAsync} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {mockSysdumpData} from '../../../tests/data/Sysdumps';

afterEach(cleanup);

const defaultProps = {
  controllerVersion: 'testVersion',
  data: mockSysdumpData(),
  networkName: 'testNetwork',
  onDelete: () => {},
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} data={[]} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  expect(getByText('There is no data to display')).toBeInTheDocument();
});

test('renders nodes', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  expect(getByText('test1')).toBeInTheDocument();
  expect(getByText('test3')).toBeInTheDocument();
});

test('clicking node selects node', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  fireEvent.click(getByText('test1'));
  expect(getByText('1 selected')).toBeInTheDocument();
});

test('clicking multiple nodes selects all nodes', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  fireEvent.click(getByText('test1'));
  fireEvent.click(getByText('test2'));
  expect(getByText('2 selected')).toBeInTheDocument();
});

test('clicking select all selects all nodes', async () => {
  const {getByText, getByTestId} = await renderAsync(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  fireEvent.click(getByTestId('selectAllBox').children[0].children[0]);
  expect(getByText('3 selected')).toBeInTheDocument();
});

test('clicking select all while nodes are selected deselects all nodes', async () => {
  const {getByText, queryByText, getByTestId} = await renderAsync(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  fireEvent.click(getByText('test1'));
  fireEvent.click(getByText('test2'));
  expect(getByText('2 selected')).toBeInTheDocument();
  expect(queryByText('Node Sysdumps')).not.toBeInTheDocument();
  fireEvent.click(getByTestId('selectAllBox').children[0].children[0]);
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
});

test('clicking node brings up delete button', () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <NodeSysdumpsTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Sysdumps')).toBeInTheDocument();
  fireEvent.click(getByText('test1'));
  expect(getByTestId('actionButtonContainer')).toBeInTheDocument();
});
