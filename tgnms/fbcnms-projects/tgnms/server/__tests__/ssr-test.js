/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
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
