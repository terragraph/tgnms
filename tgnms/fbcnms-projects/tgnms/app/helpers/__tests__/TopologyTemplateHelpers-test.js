/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {ANP_NODE_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';
import {parseANPJson} from '../TopologyTemplateHelpers';

import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

it('should parse ANP JSON file', () => {
  const input = convertType<ANPUploadTopologyType>(
    JSON.parse(mockUploadANPJson()),
  );
  const response = parseANPJson(input);
  expect(response.sites.length).toBe(2);
  expect(response.sites[0]).toMatchObject({
    name: 'site1',
    location: {
      latitude: 38.549853,
      longitude: -121.779472,
      altitude: 26.367722,
    },
  });

  // Should only use sector10 and sector 20 to create the nodes.
  expect(response.nodes.length).toBe(2);
  expect(response.nodes[0]).toMatchObject({
    name: 'site1_2',
    node_type: ANP_NODE_TYPE.DN,
    pop_node: false,
    site_name: 'site1',
    ant_azimuth: 279.0,
    ant_elevation: 0,
  });
  expect(response.nodes[1]).toMatchObject({
    name: 'site2_0',
    node_type: ANP_NODE_TYPE.CN,
    pop_node: false,
    site_name: 'site2',
    ant_azimuth: 115.84550667643184,
    ant_elevation: 0,
  });

  expect(response.links.length).toBe(1);
  expect(response.links[0]).toMatchObject({
    a_node_name: 'site1_2',
    z_node_name: 'site2_0',
  });
});
