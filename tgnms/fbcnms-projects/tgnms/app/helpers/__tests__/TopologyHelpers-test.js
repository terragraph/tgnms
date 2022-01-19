/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as TopologyHelpers from '../TopologyHelpers';
import * as serviceApiUtil from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {FIG0, mockFig0} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  buildTopologyMaps,
  getLinkType,
  makeLink,
  makeLinkName,
  makeNodeName,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import type {ANPLink} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

const apiRequestSuccessMock = jest.fn(() => Promise.resolve({}));

jest
  .spyOn(serviceApiUtil, 'apiRequest')
  .mockImplementation(apiRequestSuccessMock);

const {nodeMap, linkMap} = buildTopologyMaps(mockFig0());

const defaultProps = {
  nodeMap,
  link: linkMap[FIG0.LINK1],
  networkName: 'testNetwork',
  azimuthManager: {
    addLink: jest.fn(),
    deleteLink: jest.fn(),
    moveSite: jest.fn(),
    deleteSite: jest.fn(),
  },
};

test('calling useDelete returns initial loading', async () => {
  const result = await TopologyHelpers.deleteLinkRequest(defaultProps);
  expect(apiRequestSuccessMock).toHaveBeenCalled();
  expect(result.success).toBe(true);
});

test('makeLink produced correct format', () => {
  const anpLink: $Shape<ANPLink> = {
    tx_sector_id: 'bbbb',
    rx_sector_id: 'aaaa',
    link_type: 2,
  };
  expect(
    makeLink(anpLink, {bbbb: 'bbbb_name', aaaa: 'aaaa_name'}),
  ).toMatchObject({
    name: 'link-aaaa_name-bbbb_name',
    link_type: 2,
    a_node_mac: '',
    a_node_name: 'aaaa_name',
    z_node_mac: '',
    z_node_name: 'bbbb_name',
    is_alive: false,
    linkup_attempts: 0,
  });
});

test('makeLinkName produces the correct format', () => {
  expect(makeLinkName('nodeB', 'nodeA')).toEqual('link-nodeA-nodeB');
});

test('makeNodeName produces the correct format', () => {
  expect(makeNodeName('siteA', 1)).toEqual('siteA_1');
});

test('getLinkType groups link types correctly', () => {
  expect(getLinkType(LinkTypeValueMap['WIRELESS_BACKHAUL'])).toEqual(
    LinkTypeValueMap['WIRELESS'],
  );
  expect(getLinkType(LinkTypeValueMap['WIRELESS_ACCESS'])).toEqual(
    LinkTypeValueMap['WIRELESS'],
  );
  expect(getLinkType(LinkTypeValueMap['ETHERNET'])).toEqual(
    LinkTypeValueMap['ETHERNET'],
  );
});
