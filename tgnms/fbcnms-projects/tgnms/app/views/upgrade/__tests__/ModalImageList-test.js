/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ModalImageList from '../ModalImageList';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockUpgradeImageArrayData} from '../../../tests/data/Upgrade';

afterEach(cleanup);

const defaultProps = {
  upgradeImages: mockUpgradeImageArrayData(),
  menuItems: [],
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalImageList {...defaultProps} upgradeImages={[]} />
    </TestApp>,
  );
  expect(getByText('No Images Available')).toBeInTheDocument();
});

test('opens with upgrade images without crashing', () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ModalImageList {...defaultProps} />
    </TestApp>,
  );
  expect(queryByText('No Images Available')).not.toBeInTheDocument();
  expect(
    getByText('Uploaded: ' + new Date('11/11/11').toLocaleString()),
  ).toBeInTheDocument();
  expect(getByText('boardIdTest')).toBeInTheDocument();
});
