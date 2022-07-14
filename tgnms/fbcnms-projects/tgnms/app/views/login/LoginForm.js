/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 *
 * NOTE: This is serverside rendered
 */

import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import red from '@material-ui/core/colors/red';
import withStyles from '@material-ui/core/styles/withStyles';

/**
 * NOTE: if you see an error like:
 *  "Prop `className` did not match. Server: "______" Client: "_____" "
 * restart your nms
 */
const styles = theme => ({
  layout: {
    width: 'auto',
    display: 'block', // Fix IE 11 issue.
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
    [theme.breakpoints.up(400 + theme.spacing(6))]: {
      width: 400,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    marginTop: theme.spacing(4),
  },
  paper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${theme.spacing(2)}px ${theme.spacing(3)}px ${theme.spacing(
      3,
    )}px`,
  },
  avatar: {
    margin: theme.spacing(),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(),
    textAlign: 'center',
  },
  submit: {
    marginTop: theme.spacing(3),
  },
  textField: {
    marginLeft: theme.spacing(),
    marginRight: theme.spacing(),
  },
  logo: {
    width: '75%',
    marginBottom: theme.spacing(-2),
  },
  errorAlert: {
    marginTop: theme.spacing(),
    padding: theme.spacing(),
    backgroundColor: red[100],
  },
  errorMessage: {
    color: theme.palette.error.dark,
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  altSigninText: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
          <Paper className={classes.paper} elevation={2}>
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
