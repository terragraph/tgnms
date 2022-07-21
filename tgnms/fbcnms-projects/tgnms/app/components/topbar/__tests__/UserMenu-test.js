/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import React from 'react';
import UserMenu from '../UserMenu';
import {
  TestApp,
  initWindowConfig,
  setTestUser,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

test('by default, only renders the toggle button', () => {
  const {getByTestId} = render(<UserMenu />, {wrapper: TestApp});
  expect(getByTestId('menu-toggle')).toBeInTheDocument();
  expect(document.getElementById('user-menu')).not.toBeInTheDocument();
});

test('clicking the toggle button opens the menu', () => {
  const {getByTestId} = render(<UserMenu />, {wrapper: TestApp});
  const menuToggle = getByTestId('menu-toggle');
  expect(menuToggle).toBeInTheDocument();
  expect(document.getElementById('user-menu')).not.toBeInTheDocument();
  fireEvent.click(menuToggle);
  expect(document.getElementById('user-menu')).toBeInTheDocument();
});

test('clicking the logout button redirects the user to the logout page', () => {
  const {getByTestId} = render(<UserMenu />, {wrapper: TestApp});
  fireEvent.click(getByTestId('menu-toggle'));
  const form = document.getElementById('logout-form');
  if (!form) {
    throw new Error('expected form to be in document');
  }
  const submitListener = jest.fn();
  form.addEventListener('submit', submitListener);
  fireEvent.click(getByTestId('logout-menuitem'));
  expect(submitListener).toHaveBeenCalled();
  const event: any = submitListener.mock.calls[0][0];
  expect(event.target.action).toBe('http://localhost/user/logout');
  expect(event.target.method).toBe('post');
});

test("Shows current user's name", () => {
  initWindowConfig({});
  setTestUser({
    name: '<test name>',
  });
  const {getByTestId, getByText} = render(<UserMenu />, {wrapper: TestApp});
  fireEvent.click(getByTestId('menu-toggle'));
  expect(getByText('<test name>')).toBeInTheDocument();
});
