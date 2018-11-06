/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import FormControl from '@material-ui/core/FormControl';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import withStyles from '@material-ui/core/styles/withStyles';

import TerragraphLogo from '../static/images/terragraph_logo.svg';

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
});

class SignIn extends React.Component {
  state = {
    login: null,
    password: null,
  };

  render() {
    const {classes} = this.props;

    return (
      <div>
        <CssBaseline />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <img className={classes.logo} src={TerragraphLogo} />
            <form
              action="/user/process_login"
              className={classes.form}
              method="POST">
              <FormControl margin="normal" required fullWidth>
                <TextField
                  autoFocus
                  id="email"
                  className={classes.textField}
                  label="Login"
                  margin="none"
                  name="httpd_username"
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
                  name="httpd_password"
                  type="password"
                  variant="outlined"
                />
              </FormControl>
              <Button
                className={classes.submit}
                color="primary"
                name="login"
                size="large"
                type="submit"
                variant="contained">
                Sign in
              </Button>
            </form>
          </Paper>
        </main>
      </div>
    );
  }
}

SignIn.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(SignIn);
