/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Handles serverside rendering
 * @format
 * @flow
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
