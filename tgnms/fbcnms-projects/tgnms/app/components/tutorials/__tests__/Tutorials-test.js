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
import * as tutorialContext from '@fbcnms/tg-nms/app/contexts/TutorialContext';
import Tutorials from '../Tutorials';
import {MODULES} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const mockTutorailContext = {
  showError: false,
  setShowError: jest.fn(),
  stepIndex: 0,
  prevStep: jest.fn(),
  resetStep: jest.fn(),
  selectedTutorial: MODULES.INTRO,
  setSelectedTutorial: jest.fn(),
};

const editScanScheduleMock = jest
  .spyOn(tutorialContext, 'useTutorialContext')
  .mockImplementation(() => mockTutorailContext);

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <Tutorials />
    </TestApp>,
  );
  expect(getByText('Welcome to Terragraph')).toBeInTheDocument();
});

test('renders nothing if selected tutorial is null', () => {
  editScanScheduleMock.mockImplementation(() => ({
    ...mockTutorailContext,
    selectedTutorial: null,
  }));

  const {queryByText} = render(
    <TestApp>
      <Tutorials />
    </TestApp>,
  );
  expect(queryByText('Welcome to Terragraph')).not.toBeInTheDocument();
});
