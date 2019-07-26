/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import 'jest-dom/extend-expect';
import MaterialTopBar from '../MaterialTopBar';
import React from 'react';
import {
  TestApp,
  initWindowConfig,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig({env: {}});
});

afterEach(cleanup);

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <MaterialTopBar />
    </TestApp>,
    {wrapper: TestApp},
  );
  expect(getByText('Terragraph NMS')).toBeInTheDocument();
});

describe('Drawer feature flags', () => {
  test('GRAFANA_URL shows/hides Dashboards', () => {
    let result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByText('Dashboards')).not.toBeInTheDocument();
    initWindowConfig({
      env: {
        GRAFANA_URL: 'example.com',
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByText('Dashboards')).toBeInTheDocument();
  });

  test('NOTIFICATION_MENU_ENABLED shows/hides NotificationMenu', () => {
    let result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByTestId('menu-toggle')).not.toBeInTheDocument();
    initWindowConfig({
      env: {
        NOTIFICATION_MENU_ENABLED: 'true',
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByTestId('menu-toggle')).toBeInTheDocument();
  });

  test('NETWORKTEST_HOST shows/hides Network Tests', () => {
    let result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByText('Network Tests')).not.toBeInTheDocument();
    initWindowConfig({
      env: {
        NETWORKTEST_HOST: 'example.com',
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.getByText('Network Tests')).toBeInTheDocument();
  });
});
