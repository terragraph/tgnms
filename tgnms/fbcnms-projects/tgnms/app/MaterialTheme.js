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
import {merge} from 'lodash';

const TEXT_FIELD_OVERRIDES = {
  overrides: {
    MuiOutlinedInput: {
      root: {
        '&:hover $notchedOutline,&$focused $notchedOutline': {
          borderColor: '#73839E',
        },
        '&$disabled': {
          background: '#EDF0F9',
          color: '#303846',
        },
      },
      notchedOutline: {
        borderColor: '#D2DAE7',
      },
    },
  },
  props: {
    MuiTextField: {
      variant: 'outlined',
    },
  },
};

// default theme
const theme = createMuiTheme(
  merge(
    {
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
        primary: {
          main: '#3984FF',
        },
        // symphony theming
        secondary: {
          main: '#303846',
        },
        grey: {
          '50': '#e4f0f6',
        },
        text: {
          primary: '#303846',
        },
      },
      typography: {
        button: {
          textTransform: 'capitalize',
        },
      },
    },
    TEXT_FIELD_OVERRIDES,
  ),
);

function MaterialTheme({children}: {children: React.Node}) {
  return (
    <StylesProvider>
      <MuiStylesThemeProvider theme={theme}>{children}</MuiStylesThemeProvider>
    </StylesProvider>
  );
}

export default MaterialTheme;
