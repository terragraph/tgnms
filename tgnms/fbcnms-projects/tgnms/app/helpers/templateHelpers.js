/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import {LinkTypeValueMap, NodeTypeValueMap} from '../../shared/types/Topology';
import {apiServiceRequest} from '../apiutils/ServiceAPIUtil';

import type {AnpLink, AnpNode, AnpSite} from '../constants/TemplateConstants';
import type {LinkType, NodeType, SiteType} from '../../shared/types/Topology';

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

type LinkTemplate = {
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

function createLinkData(overrides?: LinkTemplate): $Shape<LinkType> {
  return {
    a_node_name: overrides?.a_node_name || '',
    z_node_name: overrides?.z_node_name || '',
    link_type: LinkTypeValueMap.WIRELESS,
    is_alive: false,
    linkup_attempts: 0,
    is_backup_cn_link: false,
  };
}

function createNodeData(overrides?: $Shape<NodeType>): $Shape<NodeType> {
  return {
    name: overrides?.name || '',
    node_type: overrides?.node_type || NodeTypeValueMap.DN,
    is_primary: overrides?.is_primary || true,
    pop_node: overrides?.pop_node || false,
    site_name: overrides?.site_name || '',
    ant_azimuth: overrides?.ant_azimuth || 0,
    ant_elevation: overrides?.ant_elevation || 0,
  };
}

export function templateTopologyBuilderRequest(input: ApiBuilerInput) {
  const {template, networkName, onClose} = input;
  const links = [];
  const nodes = template.nodes.map((nodeTemplate, index) => {
    const siteName = template.site.name;
    nodeTemplate.name = siteName + '_' + (index + 1);
    nodeTemplate.site_name = siteName;

    nodeTemplate.links?.forEach(linkTemplate => {
      if (linkTemplate.z_node_name !== 'none') {
        links.push(createLinkData(linkTemplate));
      }
    });

    return createNodeData(nodeTemplate);
  });

  const data = {
    sites: [template.site],
    nodes,
    links,
  };

  apiServiceRequest(networkName, 'bulkAdd', data)
    .then(_result => {
      onClose('success');
    })
    .catch(error => onClose(error.message));
}

export function uploadTopologyBuilderRequest(
  data: UploadTopologyType,
  networkName: string,
  onClose: (message?: string) => void,
) {
  apiServiceRequest(networkName, 'bulkAdd', data)
    .then(_result => {
      onClose('success');
    })
    .catch(error => onClose(error.message));
}
