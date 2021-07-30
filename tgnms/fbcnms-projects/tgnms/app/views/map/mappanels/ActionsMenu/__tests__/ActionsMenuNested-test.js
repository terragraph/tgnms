/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ActionsMenuNested from '../ActionsMenuNested';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  label: 'MySubMenu',
  children: (
    <>
      <MenuItem>Item 1</MenuItem>
      <MenuItem>Item 2</MenuItem>
      <MenuItem>Item 3</MenuItem>
    </>
  ),
};

test('renders empty without crashing', () => {
  render(
    <TestApp>
      <ActionsMenuNested {...defaultProps} />
    </TestApp>,
  );
});

test('items appear and disappear on mouse events', async () => {
  const {getByText, queryByText} = await renderAsync(
    <TestApp>
      <ActionsMenuNested {...defaultProps} />
    </TestApp>,
  );
  const menu = getByText('MySubMenu');

  expect(menu).toBeInTheDocument();
  expect(queryByText('Item 1')).not.toBeInTheDocument();

  fireEvent.mouseEnter(menu);
  expect(getByText('Item 1')).toBeInTheDocument();

  fireEvent.mouseLeave(menu);
  expect(getByText('Item 1')).not.toBeVisible();
});
