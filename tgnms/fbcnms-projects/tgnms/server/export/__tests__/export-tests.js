/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import express from 'express';
import request from 'supertest';
const {
  getNetworkState,
  getApiActiveControllerAddress,
} = require('../../topology/model');
const xml2js = require('xml2js');
import type {TopologyType} from '../../../shared/types/Topology';
jest.mock('../../models');
jest.mock('../../topology/model');
jest.mock('axios');

const backgroundRequestMock = jest.spyOn(
  require('../../apiservice/apiServiceClient').default,
  'backgroundRequest',
);
getApiActiveControllerAddress.mockReturnValue({api_ip: '', api_port: ''});
describe('KML export', () => {
  test('assert api endpoint /export/:networkName/sites returns correct results', async () => {
    const app = setupApp();
    const networkName = 'test_network';
    getNetworkState.mockReturnValue(mockGetNetworkState());

    const expectedCoordinates = getMockSiteLocation();
    const response = await request(app)
      .get(`/export/${networkName}/sites`)
      .expect(200);
    const parseString = xml2js.parseString;
    // the \ufeff character messes parsing up, we just replace
    // it with an empty char
    const cleanedString = response.res.text.replace('\ufeff', '');
    parseString(cleanedString, function(err, result) {
      if (err !== null) {
        throw 'resulting xml is invalid';
      }
      const coordinatesStr =
        result.kml.Document[0].Placemark[0].Point[0].coordinates[0];
      expect(coordinatesStr).toBe(
        `${expectedCoordinates.longitude}, ${expectedCoordinates.latitude}`,
      );
    });
  });
});

describe('CSV node export', () => {
  const mockTopology: $Shape<TopologyType> = {
    nodes: [
      {
        name: 'RF1.p1',
        node_type: 2,
        is_primary: true,
        mac_addr: '2c:dc:ad:28:e7:6a',
        pop_node: true,
        status: 1,
        wlan_mac_addrs: ['2c:dc:ad:28:e7:6a'],
        site_name: 'RF1',
        ant_azimuth: 0,
        ant_elevation: 0,
      },
      {
        name: 'RF2.p1',
        node_type: 2,
        is_primary: true,
        mac_addr: '2c:dc:ad:28:e6:c5',
        pop_node: false,
        status: 1,
        wlan_mac_addrs: ['2c:dc:ad:28:e6:c5'],
        site_name: 'RF2',
        ant_azimuth: 0,
        ant_elevation: 0,
      },
    ],
    sites: [
      {
        name: 'RF1',
        location: {
          accuracy: 40000000,
          altitude: 0,
          latitude: 37.48485456501841,
          longitude: -122.14746577665213,
        },
      },
      {
        name: 'RF2',
        location: {
          accuracy: 40000000,
          altitude: 0,
          latitude: 37.485156726581216,
          longitude: -122.147664364893,
        },
      },
    ],
  };

  // only designed to work with test data
  function parseCSV(csv: string): Array<Object> {
    const [header, ...lines]: Array<Array<string>> = csv
      .split('\n')
      .map(line => line.split(','));
    const data = lines
      .filter(vals => vals.length === header.length)
      .reduce((list, line) => {
        const obj = header.reduce((map, column, idx) => {
          map[column] = line[idx];
          return map;
        }, {});
        return list.concat(obj);
      }, []);
    return data;
  }
  test('returns nodes with locations as CSV text', async () => {
    backgroundRequestMock.mockReturnValueOnce({data: mockTopology});
    const app = setupApp();
    const response = await request(app)
      .get(`/export/test_network/nodes/csv`)
      .expect('Content-Type', /text\/plain/)
      .expect(200);
    expect(typeof response.text).toBe('string');
    const parsed = parseCSV(response.text);

    /**
     * Everything is converted to strings and enums are converted to their key
     * instead of value
     */
    expect(parsed).toMatchObject([
      {
        name: 'RF1.p1',
        node_type: 'DN',
        is_primary: 'true',
        mac_addr: '2c:dc:ad:28:e7:6a',
        pop_node: 'true',
        status: 'OFFLINE',
        wlan_mac_addrs: expect.any(String),
        site_name: 'RF1',
        latitude: '37.48485456501841',
        longitude: '-122.14746577665213',
      },
      {
        name: 'RF2.p1',
        node_type: 'DN',
        is_primary: 'true',
        mac_addr: '2c:dc:ad:28:e6:c5',
        pop_node: 'false',
        status: 'OFFLINE',
        wlan_mac_addrs: expect.any(String),
        site_name: 'RF2',
        latitude: '37.485156726581216',
        longitude: '-122.147664364893',
      },
    ]);
  });
});

function getMockSiteLocation() {
  return {
    longitude: -121.8888134,
    latitude: 37.33436622,
  };
}

function mockGetNetworkState() {
  const networkState = {
    topology: {
      sites: [
        {
          name: 'testSite',
          location: getMockSiteLocation(),
        },
      ],
    },
  };
  return networkState;
}

function setupApp() {
  const app = express();
  // $FlowFixMe found while upgrading to 0.125.1
  app.use('/export', require('../routes'));
  return app;
}
