import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';

class NetworkStoreI {
  topologyJson: {}
  topologyName: null
}

const NetworkStore = new NetworkStoreI();

Dispatcher.register(function(payload) {
  switch (payload.actionType) {
    case Actions.TOPOLOGY_SELECTED:
      NetworkStore.topologyName = payload.topologyName;
      // wipe topology
      NetworkStore.topologyJson = {};
      break;
    case Actions.TOPOLOGY_REFRESHED:
      NetworkStore.topologyJson = payload.topologyJson;
      break;
  }
});

module.exports = NetworkStore;
