/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ModalDelete from '../ModalDelete';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {
  cleanup,
  fireEvent,
  render,
  wait,
  waitForElement,
} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  selected: ['testSysdump'],
  networkName: 'Tower C',
  onDelete: () => {},
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalDelete {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Delete')).toBeInTheDocument();
});

test('opens without crashing', async () => {
  const {getByText} = render(
    <TestApp>
      <ModalDelete {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Delete')).toBeInTheDocument();
  fireEvent.click(getByText('Delete'));
  await waitForElement(() => getByText('Delete Sysdumps'));
  expect(getByText('Delete Sysdumps')).toBeInTheDocument();
});

test('closes', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ModalDelete {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Delete')).toBeInTheDocument();
  fireEvent.click(getByText('Delete'));
  await waitForElement(() => getByText('Delete Sysdumps'));
  fireEvent.click(getByText('Cancel'));
  await wait(() => {
    expect(queryByText('Delete Sysdumps')).not.toBeInTheDocument();
  });
  expect(getByText('Delete')).toBeInTheDocument();
});
