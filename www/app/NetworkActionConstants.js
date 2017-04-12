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

  // network health
  HEALTH_REFRESHED: 400,
};

module.exports = Actions;
