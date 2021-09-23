/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {
  ANP_NODE_TYPE,
  ANP_STATUS_TYPE,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {mockUploadANPJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';
import {parseANPJson} from '../TopologyTemplateHelpers';

import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

describe('parseANPJson', () => {
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

  it('should filter for acceptable statuses', () => {
    const input = convertType<ANPUploadTopologyType>(
      JSON.parse(mockUploadANPJson()),
    );
    const response = parseANPJson(
      input,
      new Set<number>([ANP_STATUS_TYPE.CANDIDATE]),
    );
    expect(response.sites.length).toEqual(1);
    expect(response.links.length).toEqual(0);
    expect(response.nodes.length).toEqual(0);
  });

  it('should ignore elements on the block list', () => {
    const input = convertType<ANPUploadTopologyType>(
      JSON.parse(mockUploadANPJson()),
    );

    // Sanity Check
    let response = parseANPJson(input);
    let sites = response.sites.map(site => site.name);
    expect(sites.includes('site1')).toBeTruthy();
    expect(sites.includes('site2')).toBeTruthy();
    let nodes = response.nodes.map(node => node.name);
    expect(nodes.includes('site1_2')).toBeTruthy();
    expect(nodes.includes('site2_0')).toBeTruthy();
    let links = response.links.map(link => link.name);
    expect(links.includes('link-site1_2-site2_0')).toBeTruthy();

    // Block certain sites.
    response = parseANPJson(
      input,
      new Set<number>([ANP_STATUS_TYPE.PROPOSED, ANP_STATUS_TYPE.EXISTING]),
      {
        sites: new Set<string>(['site1']),
        nodes: new Set<string>(['site1_2']),
        links: new Set<string>(),
      },
    );
    sites = response.sites.map(site => site.name);
    expect(sites.includes('site1')).toBeFalsy(); // blocked
    expect(sites.includes('site2')).toBeTruthy();
    nodes = response.nodes.map(node => node.name);
    expect(nodes.includes('site1_2')).toBeFalsy(); // blocked
    expect(nodes.includes('site2_0')).toBeTruthy();
    links = response.links.map(link => link.name);
    expect(links.includes('link-site1_2-site2_0')).toBeTruthy();
  });
});
