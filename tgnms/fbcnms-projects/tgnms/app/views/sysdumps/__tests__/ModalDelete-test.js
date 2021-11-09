/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ModalDelete from '../ModalDelete';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render, waitFor} from '@testing-library/react';

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
  await waitFor(() => getByText('Delete Sysdumps'));
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
  await waitFor(() => getByText('Delete Sysdumps'));
  fireEvent.click(getByText('Cancel'));
  await waitFor(() => {
    expect(queryByText('Delete Sysdumps')).not.toBeInTheDocument();
  });
  expect(getByText('Delete')).toBeInTheDocument();
});
