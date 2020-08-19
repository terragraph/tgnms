/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import KafkaParams from '../KafkaParams';
import {TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

jest
  .spyOn(
    require('../../../../contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue({
    onUpdate: jest.fn(),
  });

test('renders', async () => {
  const {getByText} = render(
    <TestApp>
      <KafkaParams />
    </TestApp>,
  );
  expect(getByText('Kafka Parameters')).toBeInTheDocument();
});