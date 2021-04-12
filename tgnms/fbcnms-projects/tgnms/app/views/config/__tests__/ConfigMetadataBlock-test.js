/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigMetadataBlock from '../ConfigMetadataBlock';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  metadata: {action: 'actionTest', desc: 'tesc', type: 'BOOLEAN'},
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
          strVal: {allowedValues: ['s']},
        }}
      />
    </TestApp>,
  );
  expect(getByText('descTest.')).toBeInTheDocument();
  expect(getByText('Actiontest')).toBeInTheDocument();
  expect(getByText('"s"')).toBeInTheDocument();
});
