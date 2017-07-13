const Actions = {
  // topology actions
  TOPOLOGY_SELECTED: 100,
  TOPOLOGY_REFRESHED: 101,
  TOPOLOGY_LIST_REFRESHED: 102,
  // nms aggregator
  AGGREGATOR_DUMP_REFRESHED: 150,
  // map/table selections
  NODE_SELECTED: 200,
  LINK_SELECTED: 201,
  SITE_SELECTED: 202,
  DISPLAY_ROUTE: 203,
  CLEAR_ROUTE: 204,
  CLEAR_NODE_LINK_SELECTED: 290,
  // primary pane view
  VIEW_SELECTED: 300,
  TAB_SELECTED: 302,

  PLANNED_SITE_CREAT: 330,
  // url location
  URL_CHANGED: 350,
  CHANGE_URL: 351,
  // notify of a single layer change
  // Layer 1 - view (map, stats, events, alerts, )
  // layer 2 - tab (nodes, links, sites, )
  // layer 3 - selected node, link, etc
  LAYER_CHANGED: 352,
  // network health
  HEALTH_REFRESHED: 400,
  LINK_OVERLAY_REFRESHED: 401,
};

const SiteOverlayKeys = {
  Health: {
    Healthy: {color: 'green'},
    Unhealthy: {color: 'red'},
    Partial: {color: 'orange'},
		Empty: {color: 'gray'}
  },
  Polarity: {
    Unknown: {color: 'red'},
    Odd: {color: 'blue'},
    Even: {color: 'magenta'},
    Hybrid: {color: 'orange'}
  }
}

const linkOverlayKeys = {
  Health: {
    name: 'Health',
    metric: null
  },
  Uptime: {
    name: 'Uptime',
    metric: null,
    values: [99, 99.9, 99.99],
    colors: ["hsl(0,100%,40%)", "hsl(50,100%,40%)", "hsl(120,100%,40%)", "hsl(120,100%,20%)"]
  },
  SNR: {
    name: 'SNR',
    metric: 'snr',
    values: [5, 10, 15, 20],
    colors: ["hsl(0,100%,20%)", "hsl(0,100%,40%)", "hsl(50,100%,40%)", "hsl(120,100%,40%)", "hsl(120,100%,20%)"]
  },
  MCS: {
    name: 'MCS',
    metric: 'mcs',
    values: [6, 7, 8, 9],
    colors: ["hsl(0,100%,20%)", "hsl(0,100%,40%)", "hsl(50,100%,40%)", "hsl(120,100%,40%)", "hsl(120,100%,20%)"]
  },
  RSSI: {
    name: 'RSSI',
    metric: 'rssi',
    values: [-40, -35, -30, -25],
    colors: ["hsl(0,100%,20%)", "hsl(0,100%,40%)", "hsl(50,100%,40%)", "hsl(120,100%,40%)", "hsl(120,100%,20%)"]
  },
}

module.exports = {
  Actions,
  SiteOverlayKeys,
  linkOverlayKeys
}
