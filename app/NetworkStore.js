import Dispatcher from './NetworkDispatcher.js';

class NetworkStoreI {
  topologyJson: {}
  topologyName: null
}

const NetworkStore = new NetworkStoreI();

Dispatcher.register(function(payload) {
  switch (payload.actionType) {
    case 'topologySelected':
      NetworkStore.topologyName = payload.topologyName;
      // wipe topology
      NetworkStore.topologyJson = {};
      break;
    case 'topologyUpdated':
      NetworkStore.topologyJson = payload.topologyJson;
      break;
  }
});

module.exports = NetworkStore;
