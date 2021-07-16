/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import TutorialProgressContent from '../TutorialProgressContent';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  progress: 2,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialProgressContent {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('1. Introduction')).toBeInTheDocument();
});

test('subtitle renders', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialProgressContent {...defaultProps} subTitle="test subtitle" />
    </TestApp>,
  );
  expect(getByText('test subtitle')).toBeInTheDocument();
});
