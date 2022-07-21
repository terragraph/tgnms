/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {apiServiceRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';

import type {LinkType, NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

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
export async function sendTopologyBuilderRequest(
  networkName: string,
  endpoint: string,
  data: {},
  onClose: (?string) => void,
) {
  try {
    const result = await apiServiceRequest(networkName, endpoint, data);
    onClose('success');
    return result;
  } catch (err) {
    onClose(err.message);
  }
}
