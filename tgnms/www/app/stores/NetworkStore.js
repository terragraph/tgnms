/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from '../NetworkDispatcher.js';
import {Actions} from '../constants/NetworkConstants.js';
// URL history
import createHistory from 'history/createBrowserHistory';

class NetworkStoreI {}
const NetworkStore = new NetworkStoreI();
// for all pages
NetworkStore.networkName = null;
NetworkStore.networkConfig = {};
NetworkStore.dockerHosts = [];
NetworkStore.viewName = 'map';
// for map
NetworkStore.tabName = 'status';
// used to select a site/sector/link
NetworkStore.selectedName = '';

// for stats view
NetworkStore.nodeRestrictor = [];

NetworkStore.linkHealth = {};
NetworkStore.nodeHealth = {};
NetworkStore.analyzerTable = {};
NetworkStore.scanResults = undefined;
NetworkStore.layers = [];

const SITE_ROOT = '/';

const BrowserHistory = createHistory();
const PushUrl = () => {
  // console.log('url stuff', NetworkStore);
  // layer 1
  if (NetworkStore.viewName) {
    if (NetworkStore.networkName) {
      // console.log('network store contents', NetworkStore);
      // determine the next data to push
      switch (NetworkStore.viewName) {
        case 'map':
          if (NetworkStore.tabName) {
            // selected node, link
            if (NetworkStore.selectedName) {
              BrowserHistory.push(
                SITE_ROOT +
                  NetworkStore.viewName +
                  '/' +
                  NetworkStore.networkName +
                  '/' +
                  NetworkStore.tabName +
                  '/' +
                  NetworkStore.selectedName,
              );
            } else {
              BrowserHistory.push(
                SITE_ROOT +
                  NetworkStore.viewName +
                  '/' +
                  NetworkStore.networkName +
                  '/' +
                  NetworkStore.tabName,
              );
            }
          } else {
            BrowserHistory.push(
              SITE_ROOT +
                NetworkStore.viewName +
                '/' +
                NetworkStore.networkName,
            );
          }
          break;
        case 'stats':
          if (NetworkStore.nodeRestrictor) {
            BrowserHistory.push(
              SITE_ROOT +
                NetworkStore.viewName +
                '/' +
                NetworkStore.networkName +
                '/' +
                NetworkStore.nodeRestrictor,
            );
          } else {
            BrowserHistory.push(
              SITE_ROOT +
                NetworkStore.viewName +
                '/' +
                NetworkStore.networkName,
            );
          }
          break;
        default:
          BrowserHistory.push(
            SITE_ROOT + NetworkStore.viewName + '/' + NetworkStore.networkName,
          );
      }
    } else {
      BrowserHistory.push(SITE_ROOT + NetworkStore.viewName);
    }
  } else {
    // nothing selected
    BrowserHistory.push(SITE_ROOT);
  }
};
// initial load, parse URL and set initial values
// console.log('parsing the url..', BrowserHistory.location);
const InitialUrl = BrowserHistory.location.pathname;
// replace in js only replaces the FIRST instance
const urlParts = InitialUrl.replace(SITE_ROOT, '').split('/');
for (let layer = 0; layer < urlParts.length; layer++) {
  if (!urlParts[layer].length) {
    break;
  }
  switch (layer) {
    case 0:
      // view
      NetworkStore.viewName = urlParts[layer];
      // console.log('updated initial view to', NetworkStore.viewName);
      break;
    case 1:
      NetworkStore.networkName = urlParts[layer];
      // console.log('updated initial network name to', NetworkStore.networkName);
      break;
    case 2:
      switch (NetworkStore.viewName) {
        case 'map':
          NetworkStore.tabName = urlParts[layer];
          break;
        case 'stats':
          NetworkStore.nodeRestrictor = urlParts[layer];
          break;
        default:
        //console.log('nothing to do with', urlParts, 'on layer', layer);
      }
      break;
    case 3:
      switch (NetworkStore.viewName) {
        case 'map':
          NetworkStore.selectedName = urlParts[layer];
          break;
        default:
        //console.log('nothing to do with', urlParts, 'on layer', layer);
      }
      break;
    default:
      console.error('unhandled layer', layer, urlParts[layer]);
  }
}

Dispatcher.register(payload => {
  // console.log('dispatched', payload);
  switch (payload.actionType) {
    case Actions.URL_CHANGED:
      NetworkStore.urlParts = payload.urlParts;
      break;
    case Actions.VIEW_SELECTED:
      NetworkStore.viewName = payload.viewName;
      NetworkStore.nodeRestrictor = payload.nodeRestrictor
        ? payload.nodeRestrictor
        : '';
      if (!NetworkStore.layers) {
        NetworkStore.layers = [];
      }
      if (NetworkStore.layers.length == 0) {
        NetworkStore.layers = [payload.viewName];
      } else {
        NetworkStore.layers[0] = payload.viewName;
      }
      // update the browser URL history
      PushUrl();
      break;
    case Actions.TOPOLOGY_SELECTED:
      NetworkStore.networkName = payload.networkName;
      // Wipe network config / topology
      NetworkStore.networkConfig = {};
      NetworkStore.selectedName = '';
      // update layer (URL) data
      if (!NetworkStore.layers) {
        NetworkStore.layers = [];
      }
      if (NetworkStore.layers.length <= 1) {
        NetworkStore.layers = [NetworkStore.viewName, payload.networkName];
      } else {
        NetworkStore.layers[1] = payload.networkName;
      }
      PushUrl();
      break;
    case Actions.TOPOLOGY_REFRESHED:
      NetworkStore.networkConfig = payload.networkConfig;
      break;
    case Actions.LINK_HEALTH_REFRESHED:
      NetworkStore.linkHealth = payload.linkHealth;
      break;
    case Actions.NODE_HEALTH_REFRESHED:
      NetworkStore.nodeHealth = payload.nodeHealth;
      break;
    case Actions.ANALYZER_REFRESHED:
      NetworkStore.analyzerTable = payload.analyzerTable;
      break;
    case Actions.SCAN_REFRESHED:
      NetworkStore.scanResults = payload.scanResults;
      break;
    case Actions.TAB_SELECTED:
      NetworkStore.tabName = payload.tabName;
      // clear selected
      NetworkStore.selectedName = '';
      PushUrl();
      break;
    case Actions.LINK_SELECTED:
      NetworkStore.selectedName = payload.link.name;
      PushUrl();
      break;
    case Actions.SITE_SELECTED:
      NetworkStore.selectedName = payload.siteSelected;
      PushUrl();
      break;
  }
});

const urlHistory = BrowserHistory.listen((location, action) => {
  switch (action) {
    case 'PUSH':
      // we changed the URL
      // console.log('url pushed', location.pathname, location.hash);
      break;
    case 'POP':
      // re-acting to a user changed URL
      // break up the URL
      const url = location.pathname + location.hash;
      // replace in js only replaces the FIRST instance
      const urlParts = url.replace(SITE_ROOT, '').split('/');
      // console.log('url popped', urlParts);
      Dispatcher.dispatch({
        actionType: Actions.LAYER_CHANGED,
        layers: urlParts,
      });
      // pass the changes down to sub-components
      // we'll take the first two parts, then pass the rest down somehow i have no
      // idea the components need a way to push a new url once they've made a
      // change
      if (urlParts.length >= 1) {
        // first is view
        if (
          urlParts.length >= 1 &&
          urlParts[0].length >= 0 &&
          NetworkStore.viewName != urlParts[0]
        ) {
          //console.log('setting view to', urlParts[0], 'from', NetworkStore.viewName);
          Dispatcher.dispatch({
            action: Actions.VIEW_SELECTED,
            viewName: urlParts[0],
          });
        }
        // second is topology name
        if (
          urlParts.length >= 2 &&
          urlParts[1].length >= 0 &&
          NetworkStore.networkName != urlParts[1]
        ) {
          //console.log('setting network name to', urlParts[1], 'from', NetworkStore.networkName);
          Dispatcher.dispatch({
            actions: Actions.TOPOLOGY_SELECTED,
            networkName: urlParts[1],
          });
        }
      }
      break;
    default:
      console.error('Unknown history action', action, location);
  }
  // console.log('action', action, 'location', location);
});

export default NetworkStore;
