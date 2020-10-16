/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {LinkTypeValueMap, NodeTypeValueMap} from '../../shared/types/Topology';

import type {
  LocationType,
  NodeType,
  PolarityTypeType,
  SiteType,
} from '../../shared/types/Topology';

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

export type AnpKmlFeature = {
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

export type LinkTemplate = {
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
  links: Array<LinkTemplate>,
};

export type AnpUploadTopologyType = {
  sites: {[string]: AnpSite},
  nodes: {[string]: AnpNode},
  links: {[string]: AnpLink},
};

export type AnpSiteUploadKmlType = {
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

export type AnpLinkUploadKmlType = {
  type: string,
  geometry: {
    type: $Values<typeof kmlFeatureType>,
    coordinates: Array<Array<number>>,
  },
  properties: {
    name: string,
    styleURL: $Values<typeof kmlAnpStatus>,
  },
};

export type AnpUploadKmlType = AnpSiteUploadKmlType | AnpLinkUploadKmlType;

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
  KML: 'KML File Format',
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

export const kmlFeatureType = {site: 'Point', link: 'LineString'};
export const kmlSiteType = {CN: 'CN', DN: 'DN', POP: 'POP'};

export const kmlAnpStatus = {
  UNAVAILABLE: 'UNAVAILABLE',
  CANDIDATE: 'CANDIDATE',
  PROPOSED: 'PROPOSED',
  EXISTING: 'EXISTING',
  DEMAND: 'DEMAND',
};

export const SECTOR_DEFAULT = '1';

export const sectorCountOptions = ['1', '2', '3', '4'];
