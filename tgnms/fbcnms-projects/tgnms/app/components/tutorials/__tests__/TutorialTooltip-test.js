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
import TutorialTooltip from '../TutorialTooltip';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const mockTutorailContext = {
  showError: true,
  prevStep: jest.fn(),
  nextStep: jest.fn(),
};

jest.mock('@fbcnms/tg-nms/app/contexts/TutorialContext', () => ({
  useTutorialContext: () => mockTutorailContext,
}));

const defaultProps = {
  primaryProps: {},
  tooltipProps: {},
  index: 0,
  size: 4,
  isLastStep: false,
  step: {title: 'testTitle'},
  closeProps: jest.fn(),
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialTooltip {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testTitle')).toBeInTheDocument();
});

test('next button calls nextStep', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialTooltip {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Next')).toBeInTheDocument();
  fireEvent.click(getByText('Next'));
  expect(mockTutorailContext.nextStep).toHaveBeenCalled();
});

test('back button does not render on the first step', () => {
  const {queryByText} = render(
    <TestApp>
      <TutorialTooltip {...defaultProps} />
    </TestApp>,
  );
  expect(queryByText('back')).not.toBeInTheDocument();
});

test('back renders on steps after first', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialTooltip {...defaultProps} index={1} />
    </TestApp>,
  );
  expect(getByText('back')).toBeInTheDocument();
});

test('error message renders if there is an error', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialTooltip {...defaultProps} step={{error: 'error message'}} />
    </TestApp>,
  );
  expect(getByText('error message')).toBeInTheDocument();
});

test('step count correctly shows index and step size - 1', () => {
  const {getByText} = render(
    <TestApp>
      <TutorialTooltip {...defaultProps} index={1} />
    </TestApp>,
  );
  expect(getByText('1 of 3')).toBeInTheDocument();
});
