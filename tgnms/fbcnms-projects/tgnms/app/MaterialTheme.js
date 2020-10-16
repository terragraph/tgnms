/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import MuiStylesThemeProvider from '@material-ui/styles/ThemeProvider';
import amber from '@material-ui/core/colors/amber';
import green from '@material-ui/core/colors/green';
import {StylesProvider} from '@material-ui/styles';
import {createMuiTheme} from '@material-ui/core/styles';

// default theme
const theme = createMuiTheme({
  palette: {
    success: {
      light: green[100],
      main: green[500],
      dark: green[800],
    },
    warning: {
      light: amber[100],
      main: amber[500],
      dark: amber[800],
    },
    // symphony theming
    secondary: {
      main: '#303846',
    },
    grey: {
      '50': '#e4f0f6',
    },
  },
});

function MaterialTheme({children}: {children: React.Node}) {
  return (
    <StylesProvider>
      <MuiStylesThemeProvider theme={theme}>{children}</MuiStylesThemeProvider>
    </StylesProvider>
  );
}

export default MaterialTheme;
