/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

/*
 * Handles serverside rendering
 */

import * as React from 'react';
import {MuiThemeProvider, createTheme} from '@material-ui/core/styles';
import {ServerStyleSheets, StylesProvider} from '@material-ui/styles';
import {renderToString} from 'react-dom/server';

export function render(
  RootComponent: React.ComponentType<any>,
  serverProps: Object = {},
): {app: string, styleSheets: string} {
  const sheets = new ServerStyleSheets();

  //TODO: use the same theme as the app
  const theme = createTheme({});
  const app: string = renderToString(
    sheets.collect(
      <StylesProvider>
        <MuiThemeProvider theme={theme}>
          <RootComponent serverProps={serverProps} />
        </MuiThemeProvider>
      </StylesProvider>,
    ),
  );
  const styleSheets = sheets.toString();
  return {
    app,
    styleSheets,
  };
}
