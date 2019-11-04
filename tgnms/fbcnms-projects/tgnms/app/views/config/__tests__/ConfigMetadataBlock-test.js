/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import ConfigMetadataBlock from '../ConfigMetadataBlock';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  metadata: {},
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigMetadataBlock {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Description')).toBeInTheDocument();
  expect(getByText('Action')).toBeInTheDocument();
});

test('renders properties correctly', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigMetadataBlock
        metadata={{
          desc: 'descTest',
          action: 'actionTest',
          type: 'STRING',
          strVal: 's',
        }}
      />
    </TestApp>,
  );
  expect(getByText('descTest.')).toBeInTheDocument();
  expect(getByText('Actiontest')).toBeInTheDocument();
  expect(getByText('s')).toBeInTheDocument();
});
