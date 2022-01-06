/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as topologyApi from '@fbcnms/tg-nms/app/apiutils/TopologyAPIUtil';
import AuthorizedRoute from './components/common/AuthorizedRoute';
import MaterialTopBar from './components/topbar/MaterialTopBar.js';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import NetworkUI from './NetworkUI';
import NmsSettings from './views/nms_config/NmsSettings';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import {CONFIG_PATH} from '@fbcnms/tg-nms/app/constants/paths';
import {NmsOptionsContextProvider} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import {Redirect, Route, Switch} from 'react-router-dom';
import {SnackbarProvider} from 'notistack';
import {TutorialContextProvider} from '@fbcnms/tg-nms/app/contexts/TutorialContext';
import {generatePath, matchPath} from 'react-router';
import {getUIConfig} from './common/uiConfig';
import {isEqual} from 'lodash';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useLocation} from 'react-router-dom';

import type {NetworkInstanceConfig} from '@fbcnms/tg-nms/shared/dto/NetworkState';

const useStyles = makeStyles(theme => ({
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
}));

const REFRESH_INTERVAL = 5000;

export default function NetworkListBase() {
  const classes = useStyles();
  const [networkList, setNetworkList] = React.useState(null);
  const location = useLocation();
  const {networks} = getUIConfig();

  // Pick a network if no network is requested in URL
  // This will choose any alive controller, otherwise redirect to /config
  const defaultNetworkName = React.useMemo(() => {
    if (!networks || !Object.keys(networks).length) {
      return null;
    }
    const network = objectValuesTypesafe<NetworkInstanceConfig>(networks).find(
      cfg => cfg.controller_online,
    );
    return network ? network.name : null;
  }, [networks]);

  const refreshTopologyList = React.useCallback(() => {
    // Fetch list of network/topology configurations
    topologyApi.listTopology().then(newNetworkList => {
      setNetworkList(curr =>
        isEqual(curr, newNetworkList) ? curr : newNetworkList,
      );
    });
  }, []);

  useInterval(refreshTopologyList, REFRESH_INTERVAL);

  React.useEffect(() => {
    // fetch initial network list
    refreshTopologyList();
  }, [refreshTopologyList]);

  const waitForNetworkListRefresh = () => {
    setNetworkList(null);
    refreshTopologyList();
  };

  const getNetworkName = React.useCallback(() => {
    const match = matchPath(location.pathname, {
      path: '/:viewName/:networkName',
      strict: false,
      exact: false,
    });
    if (networkList && match?.params?.networkName != null) {
      const network = networkList[match.params.networkName];
      if (network != null) {
        return match.params.networkName;
      } else {
        return null;
      }
    }
    return null;
  }, [location, networkList]);

  const changeNetworkName = React.useCallback(
    networkName => {
      const curr = matchPath(location.pathname, {
        path: '/:viewName/:networkName?/:rest?',
      });
      const newPath = generatePath('/:viewName/:networkName/:rest?', {
        viewName: curr?.params?.viewName ?? 'map',
        networkName,
        rest: curr?.params?.rest,
      });
      return newPath;
    },
    [location],
  );

  return (
    <NetworkListContext.Provider
      value={{
        networkList: networkList || {},
        // Wait until topology is refreshed before rendering routes
        waitForNetworkListRefresh,
        // Get/set network name
        getNetworkName,
        changeNetworkName,
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
          <TutorialContextProvider>
            <div className={classes.root}>
              <MaterialTopBar />
              <main className={classes.main}>
                <div className={classes.appBarSpacer} />
                <Switch>
                  <AuthorizedRoute
                    path={CONFIG_PATH}
                    component={NmsSettings}
                    permissions={['NMS_CONFIG_READ', 'NMS_CONFIG_WRITE']}
                  />
                  <Route path="/:viewName/:networkName" component={NetworkUI} />
                  <NetworkRedirect defaultNetworkName={defaultNetworkName} />
                </Switch>
              </main>
            </div>
          </TutorialContextProvider>
        </NmsOptionsContextProvider>
      </SnackbarProvider>
    </NetworkListContext.Provider>
  );
}

function NetworkRedirect({defaultNetworkName}: {defaultNetworkName: ?string}) {
  const location = useLocation();
  const match = matchPath(location.pathname, {
    path: '/:viewName',
  });
  const viewName = match?.params?.viewName || 'map';
  return (
    <Redirect
      to={
        defaultNetworkName ? `/${viewName}/${defaultNetworkName}` : CONFIG_PATH
      }
    />
  );
}
