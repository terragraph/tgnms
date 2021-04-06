/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import GrafanaLink from '../GrafanaLink';
import React from 'react';
import {assertType} from '@fbcnms/util/assert';
import {cleanup, render} from '@testing-library/react';
import {initWindowConfig} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConsole} from '@fbcnms/tg-nms/shared/tests/testHelpers';

const GRAFANA_URL = 'http://grafana:9009/grafana';

function getElementURL(element: HTMLElement): URL {
  const link = assertType(element, HTMLAnchorElement);
  return new URL(link.href);
}

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
  const link = assertType(getByText('link'), HTMLAnchorElement);
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
  const url = getElementURL(getByText('link'));
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

  const url = getElementURL(getByText('link'));
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

  const url = getElementURL(getByText('link'));
  expect(url.searchParams.get('var-link_name')).toBe('link-a-b-c');
  expect(url.searchParams.get('var-link_name_2')).toBe('&link--a&-b-c');
});
