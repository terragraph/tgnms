/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {LinkTypeValueMap, NodeTypeValueMap} from '../../shared/types/Topology';
import type {LocationType, PolarityTypeType} from '../../shared/types/Topology';
import type {SiteTemplate} from '../helpers/templateHelpers';

export const defaultTemplate: SiteTemplate = {
  name: 'blank',
  site: {},
  nodes: [],
};

export const basicTemplates: Array<SiteTemplate> = [
  {
    name: 'CN',
    site: {},
    nodes: [
      {
        node_type: NodeTypeValueMap.CN,
        is_primary: true,
        pop_node: false,
      },
    ],
  },
  {
    name: 'DN',
    site: {},
    nodes: [
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: true,
        pop_node: false,
      },
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: false,
        pop_node: false,
      },
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: false,
        pop_node: false,
      },
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: false,
        pop_node: false,
      },
    ],
  },
  {
    name: 'POP',
    site: {},
    nodes: [
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: true,
        pop_node: true,
      },
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: false,
        pop_node: true,
      },
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: false,
        pop_node: true,
      },
      {
        node_type: NodeTypeValueMap.DN,
        is_primary: false,
        pop_node: true,
      },
    ],
  },
  defaultTemplate,
];

export const uploadFileTypes = {
  ANP: 'ANP File Format',
  TG: 'TG File Format',
};

export const ANP_STATUS_TYPE = {
  UNAVAILABLE: 1,
  CANDIDATE: 2,
  PROPOSED: 3,
  EXISTING: 4,
};

export const ANP_NODE_TYPE = {
  CN: 1,
  DN: 2,
  DN_POP_CONNECTION: 3,
  DN_WIRELESS_ROUTER: 4,
};

export const ANP_SITE_TYPE = {
  CN: 1,
  DN: 2,
  POP: 3,
  DEMAND: 4,
};

export type AnpSite = {
  site_id: string,
  loc: LocationType,
  desc: string,
  polarity: PolarityTypeType,
  site_type: $Values<typeof ANP_SITE_TYPE>,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
};

export type AnpNode = {
  node_id: string,
  site_id: string,
  ant_azimuth: number,
  ant_elevation: number,
  node_type: $Values<typeof ANP_NODE_TYPE>,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
  is_primary: boolean,
  name?: string,
  active_links?: number,
};

export type AnpLink = {
  link_id: string,
  tx_node_id: string,
  rx_node_id: string,
  link_type: $Values<typeof LinkTypeValueMap>,
  tx_beam_azimuth: number,
  rx_beam_azimuth: number,
  quality: number,
  distance: number,
  proposed_flow: number,
  tx_site_id: string,
  rx_site_id: string,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
  capacity: number,
  altitudes: Array<number>,
};
