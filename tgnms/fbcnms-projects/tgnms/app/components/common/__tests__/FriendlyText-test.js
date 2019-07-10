/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import React from 'react';
import FriendlyText from '../FriendlyText';
import {render, cleanup} from '@testing-library/react';
import 'jest-dom/extend-expect';

afterEach(cleanup);

test('splits text based on separator', () => {
  const {getByText} = render(
    <FriendlyText text="HIGH_AVAILABILITY_STATE_CHANGE" separator="_" />,
  );
  expect(getByText('high availability state change')).toBeInTheDocument();
});

test('does nothing if no separator is passed', () => {
  const {getByText} = render(<FriendlyText text="SHOULD_NOT_CHANGE" />);
  expect(getByText('SHOULD_NOT_CHANGE')).toBeInTheDocument();
});

test('renders empty if text is undefined', () => {
  const {getByTestId} = render(
    <FriendlyText data-testid="empty-text" text={undefined} />,
  );
  expect(getByTestId('empty-text')).toBeEmpty();
});

test('optionally strips string prefixes', () => {
  const {getByText} = render(
    <>
      <FriendlyText text="cron_day_of_week" separator="_" stripPrefix="cron" />
      <FriendlyText text="_hours" separator="_" stripPrefix="cron" />
      <FriendlyText text="MINION_RESTART" separator="_" stripPrefix="minion" />
    </>,
  );
  expect(getByText('day of week')).toBeInTheDocument();
  expect(getByText('hours')).toBeInTheDocument();
  expect(getByText('restart')).toBeInTheDocument();
});

test('setting disableTypography renders only the string instead of wrapping in a typography component', () => {
  const {container, getByText} = render(
    <FriendlyText
      disableTypography
      text="HIGH_AVAILABILITY_STATE_CHANGE"
      separator="_"
    />,
  );
  expect(getByText('high availability state change')).toBeInTheDocument();
  expect(container.querySelector('p')).not.toBeInTheDocument();
});
