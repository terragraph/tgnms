/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @jest-environment jsdom
 * @format
 * @flow strict-local
 */

import React from 'react';
import {makeStyles} from '@material-ui/styles';
import {render} from '../ssr';

test('renders component passed to it as html', () => {
  const {app} = render(TestComponent);
  if (document.body) {
    document.body.innerHTML = app;
  }
  const el = document.getElementById('test-component');
  expect(el?.textContent).toBe('test text');
});

test('renders styles as a css string', () => {
  const {styleSheets} = render(TestComponent);
  expect(styleSheets).toEqual(expect.stringContaining('<<testcolor>>'));
});

const useStyles = makeStyles(() => ({
  test: {
    backgroundColor: '<<testcolor>>',
  },
}));

function TestComponent() {
  const {test} = useStyles();
  return (
    <span className={test} id="test-component">
      test text
    </span>
  );
}
