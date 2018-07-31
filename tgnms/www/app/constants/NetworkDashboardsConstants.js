/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

export const DEFAULT_DASHBOARD_NAMES = {
  LINK: 'Link Dashboard',
  NODE: 'Node Dashboard',
  NETWORK: 'Network Dashboard',
};

export const DASHBOARD_TOOLTIP_LABELS = {
  NODE_A:
    "Choose a Node A to be used as a starting node in link graphs <br /> and as a node option in node graphs (doesn't apply to network graphs)",
  NODE_Z:
    "Choose a Node Z to be used as the ending node in link graphs <br /> and as a node option in node graphs (doesn't apply to network graphs)",
  APPLY_TO_ALL:
    'Apply above configuration to all graphs in dashboard (does not apply to custom graphs)',
  GRAPH_CONFIG_INFO:
    'Graph configuration refers to settings that specify nodes <br /> within link and node graphs and time windows for all non-custom graphs',
};

export const GRAPH_WIDTH_SIZES = [2, 3, 4, 6];
