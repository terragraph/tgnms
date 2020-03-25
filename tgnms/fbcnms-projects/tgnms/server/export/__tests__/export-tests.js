/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import express from 'express';
import request from 'supertest';
const {getNetworkState} = require('../../topology/model');
const xml2js = require('xml2js');
jest.mock('../../models');
jest.mock('../../topology/model');

describe('test kml exports', () => {
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
    parseString(cleanedString, function (err, result) {
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
  app.use('/export', require('../routes'));
  return app;
}
