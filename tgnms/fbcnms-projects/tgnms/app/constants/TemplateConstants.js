/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {
  LinkTypeValueMap,
  NodeTypeValueMap,
} from '@fbcnms/tg-nms/shared/types/Topology';

import type {
  LinkType,
  LocationType,
  NodeType,
  PolarityTypeType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';

export type ANPSite = {
  name: string,
  site_id: string,
  loc: LocationType,
  desc: string,
  polarity: PolarityTypeType,
  site_type: $Values<typeof ANP_SITE_TYPE>,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
  device_sku: string,
  site_capex: number,
  breakdowns: number,
  active_sectors: number,
  times_on_mcs_route: number,
  hops: number,
  active_links: number,
};

export type ANPNode = {
  node_id: string,
  site_id: string,
  ant_azimuth: number,
  ant_elevation: number,
  node_type: $Values<typeof ANP_NODE_TYPE>,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
  name?: string,
  active_links?: number,
};

/**
 * ANP Sectors contain information about the node they belong to.
 *    - A unique node is denoted by a site_id and node_id pair.
 *    - The sector status_type applies to the node as well.
 *    - Azimuth of node is the same as sector w/ position_in_node=0.
 */
export type ANPSector = {
  sector_id: string,
  site_id: string,
  ant_azimuth: number,
  node_type: $Values<typeof ANP_NODE_TYPE>,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
  position_in_node: number, // Index of sector on the node.
  node_id: number, // Index of node on site (-1 nodes are imaginary).
  node_capex?: number,
  node_opex?: number,
  node_lifetime?: number,
  active_links?: number,
};

export type ANPLink = {
  link_id: string,
  link_hash: string,
  rx_sector_id: string,
  tx_sector_id: string,
  link_type: $Values<typeof LinkTypeValueMap>,
  tx_beam_azimuth: number,
  rx_beam_azimuth: number,
  distance: number,
  proposed_flow: number,
  tx_site_id: string,
  rx_site_id: string,
  status_type: $Values<typeof ANP_STATUS_TYPE>,
  capacity: number,
  altitudes: Array<number>,
  MCS: number,
  SNR: number,
  RSL: number,
  SINR: number,
  breakdowns: number,
  times_on_mcs_route: number,
  RSL_interference: number,
};

export type ANPKmlFeature = {
  name: string,
};

type HardwareType = {
  name: string,
  txGain: number,
  rxGain: number,
  horizontalRange: number,
  verticalRange: number,
  gps: boolean,
  sectors: number,
  bandwidth: number,
  powerConsumption: number,
};

export type NodeTemplate = $Shape<NodeType> & {
  links?: Array<LinkTemplate>,
  hardware?: HardwareType,
};

export type LinkTemplate = $Shape<LinkType> & {
  a_node_name: string,
  z_node_name: string,
};

export type SiteTemplate = {
  name: string,
  bandwidth?: number,
  site: $Shape<SiteType>,
  nodes: Array<NodeTemplate>,
};

export type ApiBuilerInput = {
  onClose: (?string) => void,
  networkName: string,
  template: SiteTemplate & {name: string},
};

export type UploadTopologyType = {
  sites: Array<$Shape<SiteType>>,
  nodes: Array<$Shape<NodeTemplate>>,
  links: Array<$Shape<LinkType>>,
};

export type ANPUploadTopologyType = {
  sites: {[string]: ANPSite},
  // TODO: T86280178 - convert from nodes to sectors
  nodes: {[string]: ANPNode},
  sectors: {[string]: ANPSector},
  links: {[string]: ANPLink},
};

export type ANPSiteUploadKmlType = {
  type: string,
  geometry: {
    type: $Values<typeof kmlFeatureType>,
    coordinates: Array<number>,
  },
  properties: {
    name: string,
    Status?: $Keys<typeof ANP_STATUS_TYPE>,
    'Site Type'?: $Values<typeof kmlSiteType>,
    site_type?: $Values<typeof kmlSiteType>,
  },
};

export type ANPLinkUploadKmlType = {
  type: string,
  geometry: {
    type: $Values<typeof kmlFeatureType>,
    coordinates: Array<Array<number>>,
  },
  properties: {
    name: string,
    styleURL: $Values<typeof kmlANPStatus>,
  },
};

export type ANPUploadKmlType = ANPSiteUploadKmlType | ANPLinkUploadKmlType;

export const defaultTemplate: SiteTemplate = {
  name: 'None',
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
        pop_node: false,
      },
      {
        node_type: NodeTypeValueMap.DN,
        pop_node: false,
      },
      {
        node_type: NodeTypeValueMap.DN,
        pop_node: false,
      },
      {
        node_type: NodeTypeValueMap.DN,
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
        pop_node: true,
      },
      {
        node_type: NodeTypeValueMap.DN,
        pop_node: true,
      },
      {
        node_type: NodeTypeValueMap.DN,
        pop_node: true,
      },
      {
        node_type: NodeTypeValueMap.DN,
        pop_node: true,
      },
    ],
  },
  defaultTemplate,
];

export const uploadFileTypes = {
  KML: 'ANP KML',
  ANP: 'ANP JSON',
  TG: 'TG JSON',
};

export const ANP_STATUS_TYPE = {
  UNAVAILABLE: 1,
  CANDIDATE: 2,
  PROPOSED: 3,
  EXISTING: 4,
};

export const ANP_STATUS_TYPE_PRETTY = {
  [ANP_STATUS_TYPE.UNAVAILABLE]: 'Unavailable',
  [ANP_STATUS_TYPE.CANDIDATE]: 'Candidate',
  [ANP_STATUS_TYPE.PROPOSED]: 'Proposed',
  [ANP_STATUS_TYPE.EXISTING]: 'Existing',
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

export const ANP_SITE_TYPE_PRETTY = {
  [ANP_SITE_TYPE.CN]: 'CN',
  [ANP_SITE_TYPE.DN]: 'DN',
  [ANP_SITE_TYPE.POP]: 'POP',
  [ANP_SITE_TYPE.DEMAND]: 'DEMAND',
};

export const kmlFeatureType = {site: 'Point', link: 'LineString'};
export const kmlSiteType = {CN: 'CN', DN: 'DN', POP: 'POP'};

export const kmlANPStatus = {
  UNAVAILABLE: 'UNAVAILABLE',
  CANDIDATE: 'CANDIDATE',
  PROPOSED: 'PROPOSED',
  EXISTING: 'EXISTING',
  DEMAND: 'DEMAND',
};

export const SECTOR_DEFAULT = '1';

export const sectorCountOptions = ['1', '2', '3', '4'];
