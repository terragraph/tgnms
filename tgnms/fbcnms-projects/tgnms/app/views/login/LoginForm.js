/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 *
 * NOTE: This is serverside rendered
 */
'use strict';

import React from 'react';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import CssBaseline from '@material-ui/core/CssBaseline';
import FormControl from '@material-ui/core/FormControl';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import withStyles from '@material-ui/core/styles/withStyles';
import red from '@material-ui/core/colors/red';

/**
 * NOTE: if you see an error like:
 *  "Prop `className` did not match. Server: "______" Client: "_____" "
 * restart your nms
 */
const styles = theme => ({
  layout: {
    width: 'auto',
    display: 'block', // Fix IE 11 issue.
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
    [theme.breakpoints.up(400 + theme.spacing.unit * 3 * 2)]: {
      width: 400,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    marginTop: theme.spacing.unit * 4,
  },
  paper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 3}px ${theme
      .spacing.unit * 3}px`,
  },
  avatar: {
    margin: theme.spacing.unit,
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing.unit,
    textAlign: 'center',
  },
  submit: {
    marginTop: theme.spacing.unit * 3,
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  logo: {
    width: '75%',
    marginTop: theme.spacing.unit * 4,
    marginBottom: theme.spacing.unit,
  },
  errorAlert: {
    marginTop: theme.spacing.unit,
    padding: theme.spacing.unit,
    backgroundColor: red[100],
  },
  errorMessage: {
    color: theme.palette.error.dark,
  },
  divider: {
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
  },
  altSigninText: {
    marginTop: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
    color: theme.palette.text.secondary,
  },
});

type Props = {
  classes: {[string]: string},
  serverProps?: Object,
};

class LoginForm extends React.Component<Props> {
  url: ?URL = null;
  constructor() {
    super();
    if (typeof window !== 'undefined' && window.location) {
      this.url = new URL(window.location.href);
    }
  }
  render() {
    const {classes} = this.props;
    const errorMessage = this.getErrorMessage();
    return (
      <div>
        <CssBaseline />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <img
              className={classes.logo}
              src={'/static/images/terragraph_logo.svg'}
            />
            <form action="/user/login" className={classes.form} method="POST">
              <input
                type="hidden"
                name="returnUrl"
                value={this.getReturnUrl() || ''}
              />
              <FormControl margin="normal" required fullWidth>
                <TextField
                  autoFocus
                  id="email"
                  className={classes.textField}
                  label="Login"
                  margin="none"
                  name="username"
                  type="text"
                  variant="outlined"
                />
              </FormControl>
              <FormControl margin="normal" required fullWidth>
                <TextField
                  className={classes.textField}
                  id="password"
                  label="Password"
                  margin="none"
                  name="password"
                  type="password"
                  variant="outlined"
                />
              </FormControl>
              {errorMessage && (
                <Paper className={classes.errorAlert} elevation={0}>
                  <Typography className={classes.errorMessage} variant="body1">
                    {errorMessage}
                  </Typography>
                </Paper>
              )}
              <Button
                className={classes.submit}
                color="primary"
                name="login"
                size="large"
                type="submit"
                variant="contained">
                Sign in
              </Button>
              <Divider className={classes.divider} />
              <Typography
                align="center"
                className={classes.altSigninText}
                variant="body2">
                or sign in with
              </Typography>
              <Button
                name="login"
                size="large"
                variant="outlined"
                href="/user/login/openid"
                component="a">
                Single sign-on
              </Button>
            </form>
          </Paper>
        </main>
      </div>
    );
  }

  /**
   * Handles rendering the error message both from
   * the serverside rendering props and from the querystring
   */
  getErrorMessage = () => {
    if (
      this.props.serverProps &&
      typeof this.props.serverProps.errorMessage === 'string'
    ) {
      return this.props.serverProps.errorMessage;
    } else if (
      /**
       * since we're possibly in a server environment
       * we must check for existence of window before accessing it
       */
      this.url &&
      this.url.searchParams.has('errorMessage')
    ) {
      return this.url.searchParams.get('errorMessage');
    }
  };

  getReturnUrl = () => this.url && this.url.searchParams.get('returnUrl');
}

export default withStyles(styles)(LoginForm);
