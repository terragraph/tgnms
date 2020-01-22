/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {LinkTypeValueMap} from '../../shared/types/Topology';
import {apiServiceRequestWithConfirmation} from '../apiutils/ServiceAPIUtil';

import type {LinkType, NodeType} from '../../shared/types/Topology';

export function getNodeLinks(
  node: NodeType,
  links: Array<LinkType>,
  linkType: $Values<typeof LinkTypeValueMap>,
): Array<LinkType> {
  // Find all wireless links associated with this node
  return links.filter(
    link =>
      link.link_type === linkType &&
      (link.a_node_name === node.name || link.z_node_name === node.name),
  );
}

/** Make a topology builder request (with confirmation and response alerts). */
export function sendTopologyBuilderRequest(
  networkName: string,
  endpoint: string,
  data: {},
  typeStr: string,
  options: {},
) {
  apiServiceRequestWithConfirmation(networkName, endpoint, data, {
    ...options,
    desc: 'You are adding a ' + typeStr + ' to this topology.',
    getSuccessStr: _msg => 'The ' + typeStr + ' was added sucessfully.',
    successType: 'text',
    getFailureStr: msg =>
      `The ${typeStr} could not be added.<p><tt>${msg}</tt></p>`,
    failureType: 'html',
  });
}

/** Make a topology edit request (with confirmation and response alerts). */
export function sendTopologyEditRequest(
  networkName: string,
  endpoint: string,
  data: {},
  typeStr: string,
  options: {},
) {
  apiServiceRequestWithConfirmation(networkName, endpoint, data, {
    ...options,
    desc: 'You are making changes to a ' + typeStr + ' in this topology.',
    getSuccessStr: _msg =>
      'The changes to this ' + typeStr + ' were saved sucessfully.',
    successType: 'text',
    getFailureStr: msg =>
      `The ${typeStr} could not be saved.<p><tt>${msg}</tt></p>`,
    failureType: 'html',
  });
}
