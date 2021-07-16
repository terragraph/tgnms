/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AddTopologyPanel from '../AddTopologyPanel';
import {TestApp, mockPanelControl} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

test('add topology panel render empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Add Topology')).toBeInTheDocument();
});

test('site portion renders', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Site')).toBeInTheDocument();
});

test('expanding advanced on sites shows location detail', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Show Advanced Settings'));
  expect(
    getByText('The altitude of the site (in meters).'),
  ).toBeInTheDocument();
});

test('node portion renders', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Nodes')).toBeInTheDocument();
});

test('clicking nodes expands nodes details', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Nodes'));

  expect(getByText('+ Add Node')).toBeInTheDocument();
});

test('node portion renders', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Links')).toBeInTheDocument();
});

test('clicking links expands link details', () => {
  const {getByText} = render(
    <TestApp>
      <AddTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('Links'));

  expect(getByText('+ Add Link')).toBeInTheDocument();
});
