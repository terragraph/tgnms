/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */

jest.mock('request');
jest.mock('../../models');
import request from 'supertest';
import {seedTopology} from '../../tests/dbHelpers';
import {setupTestApp} from '../../tests/expressHelpers';
const {map_annotation_group} = require('../../models');
import type {MapAnnotationGroupAttributes} from '../../models/mapAnnotationGroup';

afterEach(() => {
  jest.clearAllMocks();
});

const setupApp = () => setupTestApp('/map', require('../routes'));

describe('GET /annotations/:network', () => {
  test('returns empty array if network has no groups', async () => {
    const app = setupApp();
    const response = await request(app)
      .get('/map/annotations/test')
      .expect(200);
    expect(response.body).toMatchObject([]);
  });
  test('returns all annotation groups for a network without geojson', async () => {
    const topology = await seedTopology();
    await map_annotation_group.bulkCreate(
      ([
        {
          name: 'test_group',
          geojson: '{}',
          topology_id: topology.id,
        },
        {
          name: 'test_group_2',
          geojson: '{}',
          topology_id: topology.id,
        },
      ]: Array<$Shape<MapAnnotationGroupAttributes>>),
    );
    const app = setupApp();
    const response = await request(app)
      .get('/map/annotations/test-network')
      .expect(200);
    expect(response.body).toMatchObject([
      {
        name: 'test_group',
        topologyName: 'test-network',
      },
      {
        name: 'test_group_2',
        topologyName: 'test-network',
      },
    ]);
  });
});
describe('GET /annotations/:network/:group', () => {
  test('returns group with geojson', async () => {
    const topology = await seedTopology();
    await map_annotation_group.bulkCreate(
      ([
        {
          name: 'test_group',
          geojson: '{}',
          topology_id: topology.id,
        },
      ]: Array<$Shape<MapAnnotationGroupAttributes>>),
    );
    const response = await request(setupApp())
      .get('/map/annotations/test-network/test_group')
      .expect(200);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'test_group',
      topologyName: 'test-network',
      geojson: {},
    });
  });

  test('if group does not exist, returns json null', async () => {
    await seedTopology();
    const response = await request(setupApp())
      .get('/map/annotations/test-network/test_group')
      .expect(200);
    expect(response.body).toBe(null);
  });
});

describe('PUT /annotations/:network/', () => {
  test('if group does not exist, it is created', async () => {
    await seedTopology();
    const shouldBeNull = await map_annotation_group.findOne({
      where: {name: 'test_group'},
    });
    expect(shouldBeNull).toBe(null);
    const response = await request(setupApp())
      .put('/map/annotations/test-network')
      .send({name: 'test_group', geojson: '{}'})
      .expect(200);

    const dbResults = await map_annotation_group.findOne({
      where: {name: 'test_group'},
    });
    expect(dbResults).toMatchObject({name: 'test_group', geojson: '{}'});

    expect(response.body).toMatchObject({
      id: dbResults?.id,
      name: 'test_group',
      topologyName: 'test-network',
      geojson: {},
    });
  });
  test('if group already exists, it is updated', async () => {
    const topology = await seedTopology();
    const group = await map_annotation_group.create(
      ({
        name: 'test_group',
        topology_id: topology.id,
        geojson: '{}',
      }: $Shape<MapAnnotationGroupAttributes>),
    );
    const response = await request(setupApp())
      .put('/map/annotations/test-network')
      .send({
        id: group.id,
        name: 'test_group_renamed',
        geojson: '{"val":"updated"}',
      })
      .expect(200);

    const dbResults = await map_annotation_group.findOne({
      where: {name: 'test_group_renamed'},
    });
    expect(dbResults).toMatchObject({
      id: group.id,
      name: 'test_group_renamed',
      geojson: '{"val":"updated"}',
    });

    const count = await map_annotation_group.count();
    expect(count).toBe(1);

    expect(response.body).toMatchObject({
      id: dbResults?.id,
      name: 'test_group_renamed',
      topologyName: 'test-network',
      geojson: {val: 'updated'},
    });
  });
});

describe('DELETE /annotations/:network/:group', () => {
  test('Deletes annotation group for network', async () => {
    const topology = await seedTopology();
    const group = await map_annotation_group.create(
      ({
        name: 'test_group',
        topology_id: topology.id,
        geojson: '{}',
      }: $Shape<MapAnnotationGroupAttributes>),
    );
    const shouldExist = await map_annotation_group.findByPk(group.id);
    expect(shouldExist).toMatchObject({
      name: 'test_group',
      geojson: '{}',
      topology_id: topology.id,
      id: group.id,
    });

    await request(setupApp())
      .delete('/map/annotations/test-network/test_group')
      .expect(200);

    const shouldNotExist = await map_annotation_group.findByPk(group.id);
    expect(shouldNotExist).toBe(null);
  });
  test('Only deletes groups which belong to the specified network', async () => {
    const topology1 = await seedTopology();
    const topology2 = await seedTopology({id: undefined, name: 'test2'});
    const group1 = await map_annotation_group.create(
      ({
        topology_id: topology1.id,
        name: 'test_group',
        geojson: '{}',
      }: $Shape<MapAnnotationGroupAttributes>),
    );
    const group2 = await map_annotation_group.create(
      ({
        topology_id: topology2.id,
        name: 'test_group',
        geojson: '{}',
      }: $Shape<MapAnnotationGroupAttributes>),
    );

    const countBefore = await map_annotation_group.count();
    expect(countBefore).toBe(2);
    await request(setupApp())
      .delete('/map/annotations/test-network/test_group')
      .expect(200);

    const shouldNotExist = await map_annotation_group.findByPk(group1.id);
    expect(shouldNotExist).toBe(null);
    const shouldExist = await map_annotation_group.findByPk(group2.id);
    expect(shouldExist).toMatchObject({
      topology_id: topology2.id,
      name: 'test_group',
      geojson: '{}',
    });

    const countAfter = await map_annotation_group.count();
    expect(countAfter).toBe(1);
  });
});
