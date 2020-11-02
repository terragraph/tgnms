/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import MapProfileForm from '../MapProfileForm';
import {DEFAULT_MCS_TABLE} from '../../../../constants/MapProfileConstants';
import {TestApp, coerceClass} from '../../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';

beforeEach(() => {
  jest.clearAllMocks();
  cleanup();
});

const commonProps = {
  isDefault: false,
  isDisabled: false,
  onUpdate: jest.fn(),
  profile: {
    id: 1,
    name: 'testprofile',
    data: {
      mcsTable: DEFAULT_MCS_TABLE,
      remoteOverlays: [],
    },
    networks: ['test_network'],
  },
};

test('renders', () => {
  const {getByLabelText, getByText} = render(
    <TestApp>
      <MapProfileForm {...commonProps} />
    </TestApp>,
  );
  expect(getByText(/mcs estimate/i)).toBeInTheDocument();
  expect(coerceClass(getByLabelText(/name/i), HTMLInputElement).value).toBe(
    'testprofile',
  );
});

test('if non-default profile is selected, inputs change', () => {
  const {getByLabelText} = render(
    <TestApp>
      <MapProfileForm {...commonProps} isDefault />
    </TestApp>,
  );
  const nameInput = getByLabelText(/name/i);
  expect(coerceClass(nameInput, HTMLInputElement).value).toBe('testprofile');
  act(() => {
    fireEvent.change(nameInput, {target: {value: 'testprofile_changed'}});
  });
  //expect it to be the same because the input is disabled
  expect(coerceClass(nameInput, HTMLInputElement).value).toBe(
    'testprofile_changed',
  );
});

xtest('if isDisabled is passed, inputs are disabled', () => {
  const {getByLabelText} = render(
    <TestApp>
      <MapProfileForm {...commonProps} isDisabled />
    </TestApp>,
  );
  const nameInput = getByLabelText(/name/i);
  expect(coerceClass(nameInput, HTMLInputElement).value).toBe('testprofile');
  act(() => {
    fireEvent.change(nameInput, {target: {value: 'testprofile_changed'}});
  });
  //expect it to be the same because the input is disabled
  expect(coerceClass(nameInput, HTMLInputElement).value).toBe('testprofile');
});
