import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

class NetworkStoreI {
  networkName: null
  networkConfig: {}
  networkHealth: {}
  tabName: 'status'
}

const NetworkStore = new NetworkStoreI();

Dispatcher.register(function(payload) {
  switch (payload.actionType) {
    case Actions.TOPOLOGY_SELECTED:
      NetworkStore.networkName = payload.networkName;
      // Wipe network config / topology
      NetworkStore.networkConfig = {};
      break;
    case Actions.TOPOLOGY_REFRESHED:
      NetworkStore.networkConfig = payload.networkConfig;
      break;
    case Actions.HEALTH_REFRESHED:
      NetworkStore.networkHealth = payload.health;
      break;
    case Actions.TAB_SELECTED:
      NetworkStore.tabName = payload.tabName;
      break;
  }
});

module.exports = NetworkStore;
