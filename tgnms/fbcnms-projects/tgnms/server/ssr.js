/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Handles serverside rendering
 * @format
 * @flow
 */
'use strict';

import * as React from 'react';
import {JssProvider, SheetsRegistry} from 'react-jss';
import {
  MuiThemeProvider,
  createGenerateClassName,
  createMuiTheme,
} from '@material-ui/core/styles';
import {renderToString} from 'react-dom/server';

export function render(
  RootComponent: React.ComponentType<any>,
  serverProps: Object,
): {app: string, styleSheets: string} {
  const sheets = new SheetsRegistry();
  const generateClassName = createGenerateClassName();
  const sheetsManager = new Map();
  //TODO: use the same theme as the app
  const theme = createMuiTheme({});
  const app: string = renderToString(
    <JssProvider registry={sheets} generateClassName={generateClassName}>
      <MuiThemeProvider theme={theme} sheetsManager={sheetsManager}>
        <RootComponent serverProps={serverProps} />
      </MuiThemeProvider>
    </JssProvider>,
  );
  return {
    app: app,
    styleSheets: sheets.toString(),
  };
}
