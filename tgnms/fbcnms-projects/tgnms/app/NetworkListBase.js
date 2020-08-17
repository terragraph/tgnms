/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AuthorizedRoute from './components/common/AuthorizedRoute';
import MaterialTopBar from './components/topbar/MaterialTopBar.js';
import NetworkListContext from './contexts/NetworkListContext';
import NetworkUI from './NetworkUI';
import NmsSettings from './views/nms_config/NmsSettings';
import axios from 'axios';
import {NmsOptionsContextProvider} from './contexts/NmsOptionsContext';
import {Redirect, Route, Switch} from 'react-router-dom';
import {SnackbarProvider} from 'notistack';
import {generatePath, matchPath} from 'react-router';
import {getUIConfig} from './common/uiConfig';
import {objectValuesTypesafe} from './helpers/ObjectHelpers';
import {useLocation, withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {NetworkConfig} from './contexts/NetworkContext';
import type {NetworkList} from './contexts/NetworkListContext';
import type {RouterHistory} from 'react-router-dom';

export type NetworkListType = NetworkConfig & {name: string};

// Pick a network if no network is requested in URL
// This will choose any alive controller, otherwise redirect to /config
function getDefaultNetworkName(networkList: {[string]: NetworkListType}) {
  if (!networkList || !Object.keys(networkList).length) {
    return null;
  }
  const network = objectValuesTypesafe<NetworkListType>(networkList).find(
    cfg => cfg.controller_online,
  );
  return network ? network.name : null;
}
const defaultNetworkName = getDefaultNetworkName(getUIConfig().networks);

const styles = theme => ({
  appBarSpacer: {
    flex: '0 1 auto',
    ...theme.mixins.toolbar,
  },
  main: {
    flexGrow: 1,
    display: 'flex',
    flexFlow: 'column',
    height: '100vh',
    overflow: 'auto',
  },
  root: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
    height: '100%',
  },
  snackbar: {
    paddingRight: theme.spacing(8),
  },
});

const CONFIG_URL = '/config';

const REFRESH_INTERVAL = 5000;

type Props = {
  classes: {[string]: string},
  history: RouterHistory,
  location: Object,
};

type State = {networkList: ?NetworkList};

class NetworkListBase extends React.Component<Props, State> {
  _refreshNetworkListInterval;

  state = {
    networkList: null,
  };

  componentDidMount() {
    // fetch initial network list
    this.refreshTopologyList();

    // schedule period refresh
    this._refreshNetworkListInterval = setInterval(
      this.refreshTopologyList,
      REFRESH_INTERVAL,
    );
  }

  refreshTopologyList = () => {
    // Fetch list of network/topology configurations
    axios.get('/topology/list').then(response => {
      // update network list context
      const networkList = response.data;
      this.setState({networkList});
    });
  };

  waitForNetworkListRefresh = () => {
    this.setState({networkList: null});
    this.refreshTopologyList();
  };

  getNetworkName = () => {
    const match = matchPath(this.props.location.pathname, {
      path: '/:viewName/:networkName',
      strict: false,
      exact: false,
    });
    if (this.state.networkList && match?.params?.networkName != null) {
      const network = this.state.networkList[match.params.networkName];
      if (network != null) {
        return match.params.networkName;
      } else {
        return null;
      }
    }
    return null;
  };

  changeNetworkName = networkName => {
    const curr = matchPath(this.props.location.pathname, {
      path: '/:viewName/:networkName?/:rest?',
    });
    const newPath = generatePath('/:viewName/:networkName/:rest?', {
      viewName: curr?.params?.viewName ?? 'map',
      networkName,
      rest: curr?.params?.rest,
    });
    return newPath;
  };

  render() {
    const {classes} = this.props;
    return (
      <NetworkListContext.Provider
        value={{
          networkList: this.state.networkList || {},
          // Wait until topology is refreshed before rendering routes
          waitForNetworkListRefresh: this.waitForNetworkListRefresh,
          // Get/set network name
          getNetworkName: this.getNetworkName,
          changeNetworkName: this.changeNetworkName,
        }}>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={10000}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          classes={{root: classes.snackbar}}>
          <NmsOptionsContextProvider>
            <div className={classes.root}>
              <MaterialTopBar />
              <main className={classes.main}>
                <div className={classes.appBarSpacer} />
                <Switch>
                  <AuthorizedRoute
                    path={CONFIG_URL}
                    component={NmsSettings}
                    permissions={['NMS_CONFIG_READ', 'NMS_CONFIG_WRITE']}
                  />
                  <Route path="/:viewName/:networkName" component={NetworkUI} />
                  <NetworkRedirect defaultNetworkName={defaultNetworkName} />
                </Switch>
              </main>
            </div>
          </NmsOptionsContextProvider>
        </SnackbarProvider>
      </NetworkListContext.Provider>
    );
  }
}

export default withStyles(styles, {withTheme: true})(
  withRouter(NetworkListBase),
);

function NetworkRedirect({defaultNetworkName}: {defaultNetworkName: ?string}) {
  const location = useLocation();
  const match = matchPath(location.pathname, {
    path: '/:viewName',
  });
  const viewName = match?.params?.viewName || 'map';
  return (
    <Redirect
      to={
        defaultNetworkName ? `/${viewName}/${defaultNetworkName}` : CONFIG_URL
      }
    />
  );
}
