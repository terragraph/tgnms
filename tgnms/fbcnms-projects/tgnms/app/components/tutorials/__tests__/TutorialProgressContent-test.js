/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
