/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AuthorizedRoute from './components/common/AuthorizedRoute';
import MaterialTopBar from './components/topbar/MaterialTopBar.js';
import NetworkListContext from './NetworkListContext';
import NetworkUI from './NetworkUI';
import NmsConfig from './views/nms_config/NmsConfig';
import React from 'react';
import axios from 'axios';
import {History} from 'history';
import {Redirect, Route, Switch} from 'react-router-dom';
import {objectValuesTypesafe} from './helpers/ObjectHelpers';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';
import {withTranslation} from 'react-i18next';

import type {NetworkConfig} from './NetworkContext';
import type {NetworkList} from './NetworkListContext';

type NetworkListType = NetworkConfig & {name: string};

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
const defaultNetworkName = getDefaultNetworkName(window.CONFIG.networks);

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
});

const CONFIG_URL = '/config';

const REFRESH_INTERVAL = window.CONFIG.refresh_interval
  ? window.CONFIG.refresh_interval
  : 5000;

type Props = {
  classes: {[string]: string},
  history: History,
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
      this.updateNetworkName(networkList);
    });
  };

  waitForNetworkListRefresh = () => {
    this.setState({networkList: null});
    this.refreshTopologyList();
  };

  updateNetworkName = networkList => {
    // Update network name if needed based on new network list
    const currentNetworkName = this.getNetworkName();

    // If current network doesn't exist, redirect to /config
    if (currentNetworkName && !networkList.hasOwnProperty(currentNetworkName)) {
      this.props.history.push(CONFIG_URL);
    }
  };

  getNetworkName = () => {
    // Return the current network name
    const splitPath = this.props.location.pathname.split('/');
    if (splitPath.length >= 3 && splitPath[2].length) {
      return splitPath[2];
    }
    return null;
  };

  //TODO: use this.props.match instead of manually parsing the url
  //TODO: give this a better name
  changeNetworkName = networkName => {
    // Change the current network name
    const splitPath = this.props.location.pathname.split('/');
    if (splitPath.length >= 3) {
      // replace network name (first parameter)
      splitPath[2] = networkName;
    } else {
      // push network name
      splitPath.push(networkName);
    }
    return splitPath.join('/');
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
        <div className={classes.root}>
          <MaterialTopBar />
          <main className={classes.main}>
            <div className={classes.appBarSpacer} />
            <Switch>
              <AuthorizedRoute
                path={CONFIG_URL}
                component={NmsConfig}
                permissions={['NMS_CONFIG_READ', 'NMS_CONFIG_WRITE']}
              />
              <Route path="/:viewName/:networkName" component={NetworkUI} />
              <Redirect
                to={
                  defaultNetworkName ? `/map/${defaultNetworkName}` : CONFIG_URL
                }
              />
            </Switch>
          </main>
        </div>
      </NetworkListContext.Provider>
    );
  }
}

export default withStyles(styles, {withTheme: true})(
  withRouter(withTranslation()(NetworkListBase)),
);
