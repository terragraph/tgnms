/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import GrafanaLink from '../GrafanaLink';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

import {initWindowConfig} from '../../../tests/testHelpers';
import {mockConsole} from '../../../../shared/tests/testHelpers';

const GRAFANA_URL = 'http://grafana:9009/grafana';

beforeEach(() => {
  initWindowConfig({
    env: {
      GRAFANA_URL,
    },
  });
});
afterEach(cleanup);

test('missing config does not crash', () => {
  initWindowConfig({
    env: {},
  });
  mockConsole();
  expect(() =>
    render(<GrafanaLink dashboard="">link</GrafanaLink>),
  ).not.toThrow();
});

test('invalid url does not crash', () => {
  initWindowConfig({
    env: {GRAFANA_URL: '/grafana'},
  });
  mockConsole();
  expect(() =>
    render(<GrafanaLink dashboard="">link</GrafanaLink>),
  ).not.toThrow();
});

test('gets baseurl from config', () => {
  const {getByText} = render(<GrafanaLink dashboard="">link</GrafanaLink>);
  const link = getByText('link');
  expect(link).toBeInTheDocument();
  const url = new URL(link.href);
  expect(url.href).toBe(GRAFANA_URL);
});

test('accepts a custom component', () => {
  const MockComponent = () => <span data-testid="mock-link">mock link</span>;
  const {getByTestId} = render(
    <GrafanaLink component={MockComponent} dashboard="link_prom">
      link
    </GrafanaLink>,
  );
  expect(getByTestId('mock-link')).toBeInTheDocument();
});

test('dashboard prop sets the uuid url parameter', () => {
  const {getByText} = render(<GrafanaLink dashboard="test">link</GrafanaLink>);
  const url = new URL(getByText('link').href);
  expect(url.pathname).toBe('/grafana/d/test');
});

test('vars parameter adds vars as querystring params', () => {
  const {getByText} = render(
    <GrafanaLink
      dashboard="test"
      vars={{
        'var-nodeA': '38:3a:21:b0:01:ec',
        'var-nodeZ': '38:3a:21:b0:08:b3',
      }}>
      link
    </GrafanaLink>,
  );

  const url = new URL(getByText('link').href);
  expect(url.searchParams.get('var-nodeA')).toBe('38:3a:21:b0:01:ec');
  expect(url.searchParams.get('var-nodeZ')).toBe('38:3a:21:b0:08:b3');
});

test('illegal characters in prometheus values are replaced with underscores', () => {
  const {getByText} = render(
    <GrafanaLink
      dashboard="test"
      prometheusVars={{
        'var-link_name': 'link-a-b-c',
        'var-link_name_2': '&link--a&-b-c',
      }}>
      link
    </GrafanaLink>,
  );

  const url = new URL(getByText('link').href);
  expect(url.searchParams.get('var-link_name')).toBe('link_a_b_c');
  expect(url.searchParams.get('var-link_name_2')).toBe('_link__a__b_c');
});
