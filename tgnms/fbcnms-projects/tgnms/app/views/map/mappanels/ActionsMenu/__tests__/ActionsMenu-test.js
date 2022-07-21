/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import ActionsMenu from '../ActionsMenu';
import React from 'react';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  options: {
    actionItems: [
      {
        heading: 'Test Heading',
        actions: [
          {label: 'testLabel', func: jest.fn()},
          {
            label: 'testSubMenu1',
            subMenu: [
              {
                heading: 'subMenuHeading1',
                actions: [
                  {label: 'subLabel1', func: jest.fn()},
                  {
                    label: 'testSubMenu2',
                    subMenu: [
                      {
                        heading: 'subMenuHeading2',
                        actions: [{label: 'subLabel2', func: jest.fn()}],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('View Actions')).toBeInTheDocument();
});

test('clicking button Opens menu', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('View Actions')).toBeInTheDocument();
  fireEvent.click(getByText('View Actions'));
  expect(getByText('Test Heading')).toBeInTheDocument();
  expect(getByText('testLabel')).toBeInTheDocument();
});

test('sub-menus appear when hovered', async () => {
  const {getByText, queryByText} = await renderAsync(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('View Actions'));
  expect(queryByText('subMenuHeading1')).not.toBeInTheDocument();

  fireEvent.mouseEnter(getByText('testSubMenu1'));
  expect(getByText('subMenuHeading1')).toBeInTheDocument();
  expect(getByText('subLabel1')).toBeInTheDocument();
  // The 2-level sub menu should not appear yet.
  expect(queryByText('subMenuHeading2')).not.toBeInTheDocument();

  fireEvent.mouseEnter(getByText('testSubMenu2'));
  expect(getByText('subMenuHeading2')).toBeInTheDocument();
  expect(getByText('subLabel2')).toBeInTheDocument();
});

test('clicking button in menu calls function', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <ActionsMenu {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('View Actions')).toBeInTheDocument();
  fireEvent.click(getByText('View Actions'));
  expect(getByText('testLabel')).toBeInTheDocument();
  fireEvent.click(getByText('testLabel'));
  expect(
    defaultProps.options.actionItems[0].actions[0].func,
  ).toHaveBeenCalled();
});
