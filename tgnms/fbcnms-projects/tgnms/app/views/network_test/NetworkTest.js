/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import type {WithStyles} from '@material-ui/core/styles';
import type {ContextRouter} from 'react-router-dom';
import type {UINotification} from '../../components/common/CustomSnackbar';

import React from 'react';
import {Route} from 'react-router-dom';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import {withStyles} from '@material-ui/core/styles';
import CustomSnackbar, {Variant} from '../../components/common/CustomSnackbar';
import {StartNetworkTestModal} from './StartNetworkTest';
import NetworkTestExecutionsTable from './NetworkTestExecutionsTable';
import NetworkTestResults from './NetworkTestResults';
import Text from '@fbcnms/i18n/Text';

const styles = theme => ({
  root: {
    padding: theme.spacing.unit * 2,
  },
  recentTests: {
    padding: theme.spacing.unit * 2,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '80vh',
    height: '100%',
    maxHeight: '80vh',
  },
  header: {
    marginBottom: theme.spacing.unit * 4,
    flexGrow: 0,
    flexShrink: 0,
  },
  executionsTableWrapper: {
    overflow: 'auto',
    flexGrow: '1',
  },
  results: {
    display: 'flex',
    flex: '1 1 auto',
    minHeight: '80vh',
    height: '100%',
    maxHeight: '80vh',
  },
});

type Props = {||} & WithStyles & ContextRouter;

type State = {|
  notification: UINotification,
|};

class NetworkTest extends React.PureComponent<Props, State> {
  state = {
    notification: {
      open: false,
      message: '',
      onRetry: () => {},
      variant: Variant.info,
    },
  };

  resultsTableRef = React.createRef();

  componentDidUpdate(prevProps: Props) {
    /**
     * If we're on a nested route (such as a test execution) and the selected
     * network changes, the rest of the url parameters no longer apply.
     */
    if (
      prevProps.match.params.networkName !==
        this.props.match.params.networkName &&
      !this.props.match.isExact
    ) {
      this.props.history.replace(this.props.match.url);
    }
  }

  render() {
    const {classes} = this.props;
    return (
      <>
        <div className={classes.root}>
          <Route
            path={`${this.props.match.path}/:executionId?`}
            render={({match}) => {
              const {executionId, networkName} = match.params;
              return (
                <Grid container spacing={16}>
                  <Grid xs={12} item>
                    <StartNetworkTestModal
                      className={classes.section}
                      loadTestExecutions={this.loadTestExecutions}
                      showNotification={this.showNotification}
                      networkName={networkName || ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Paper className={classes.recentTests}>
                      <Text
                        variant="h6"
                        component="h2"
                        className={classes.header}
                        i18nKey="recent_tests">
                        Recent Tests
                      </Text>
                      <Grid
                        className={classes.executionsTableWrapper}
                        container>
                        {
                          // $FlowFixMe - flow is not playing nice with HOCs
                          <NetworkTestExecutionsTable
                            innerRef={this.resultsTableRef}
                            selectedExecutionId={executionId}
                            showNotification={this.showNotification}
                            networkName={networkName}
                            createTestUrl={this.createTestUrl}
                          />
                        }
                      </Grid>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Route
                      path={`${this.props.match.path}/:executionId`}
                      render={routerProps => (
                        <Grid className={classes.results} item>
                          <NetworkTestResults
                            showNotification={this.showNotification}
                            createTestUrl={this.createTestUrl}
                            {...routerProps}
                          />
                        </Grid>
                      )}
                    />
                  </Grid>
                </Grid>
              );
            }}
          />
        </div>
        <CustomSnackbar
          open={this.state.notification.open}
          message={this.state.notification.message}
          onRetry={this.state.notification.onRetry}
          variant={this.state.notification.variant}
          onClose={this.hideNotification}
        />
      </>
    );
  }

  loadTestExecutions = () => {
    this.resultsTableRef.current &&
      this.resultsTableRef.current.loadTestExecutions();
  };

  showNotification = (notification: UINotification) => {
    this.setState({
      notification: Object.assign({}, {open: true}, notification),
    });
  };

  /**
   * since the notification animates closed, nulling it will cause
   * a flash of another variant's color so we just hide it instead
   */
  hideNotification = () => {
    this.setState({
      notification: Object.assign({}, this.state.notification || {}, {
        open: false,
      }),
    });
  };

  createTestUrl: CreateTestUrl = ({executionId, linkName}) => {
    let url = this.props.match.url;
    if (typeof executionId === 'undefined') {
      return url;
    }
    if (url.slice(-1) !== '/') {
      url += '/';
    }
    url += `${executionId}`;
    if (typeof linkName === 'string') {
      url += `/details/${linkName}`;
    }
    return url;
  };
}

export type CreateTestUrl = {
  ({executionId?: string, linkName?: string}): string,
};

export default withStyles(styles)(NetworkTest);
