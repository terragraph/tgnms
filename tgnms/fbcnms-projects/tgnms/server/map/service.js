/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

const {map_annotation_group, topology} = require('../models');
const logger = require('../log')(module);
import type {GeoFeatureCollection} from '@turf/turf';
import type {
  MapAnnotationGroup,
  MapAnnotationGroupIdent,
} from '../../shared/dto/MapAnnotations';
import type {MapAnnotationGroupAttributes} from '../models/mapAnnotationGroup';
import type {Transaction} from 'sequelize';

type GroupIdent = {|
  network: string,
  group: string,
|};

export async function getNetworkGroups(
  {
    network,
  }: {
    network: string,
  },
  transaction?: Transaction,
): Promise<Array<MapAnnotationGroupIdent>> {
  const groups = await map_annotation_group.findAll({
    transaction,
    attributes: {exclude: ['geojson']},
    include: [
      {
        model: topology,
        as: 'topology',
        attributes: ['name'],
        where: {name: network},
      },
    ],
  });
  return groups.map(({id, name, topology}) => {
    return {id: id, name: name, topologyName: topology?.name ?? ''};
  });
}

//TODO allow querying by group primary key
export async function getAnnotationGroup(
  {network, group}: GroupIdent,
  transaction?: Transaction,
): Promise<?MapAnnotationGroup> {
  const groupResult = await map_annotation_group.findOne({
    transaction,
    where: {name: group},
    include: [
      {
        model: topology,
        as: 'topology',
        attributes: ['name'],
        where: {name: network},
      },
    ],
  });
  if (!groupResult) {
    return null;
  }
  return mapToAnnotationGroup(groupResult);
}

export async function saveAnnotationGroup(
  {
    network,
    geojson,
    id,
    name,
  }: {
    network: string,
    id: number,
    name: string,
    geojson: string,
  },
  transaction?: Transaction,
): Promise<?MapAnnotationGroup> {
  const t = await getNetworkByName(network);

  await map_annotation_group.upsert(
    {
      id,
      topology_id: t.id,
      geojson,
      name,
    },
    {transaction, returning: true},
  );

  const group = await getAnnotationGroup({network, group: name}, transaction);
  if (!group) {
    logger.error(
      `created/updated group id:${id} - ${name} but could not reload group`,
    );
  }
  return group;
}

export async function deleteAnnotationGroup({network, group}: GroupIdent) {
  const t = await getNetworkByName(network);
  const groupRow = await map_annotation_group.findOne({
    where: {
      topology_id: t.id,
      name: group,
    },
  });
  if (groupRow) {
    groupRow.destroy();
  }
}

async function getNetworkByName(name: string) {
  const t = await topology.findOne({
    where: {
      name: name,
    },
  });
  if (!t) {
    return Promise.reject(new Error(`network not found`));
  }
  return t;
}

function mapToAnnotationGroup({
  id,
  name,
  geojson,
  topology,
}: MapAnnotationGroupAttributes): MapAnnotationGroup {
  return {
    id,
    name,
    topologyName: topology?.name ?? 'unnamed',
    geojson: safeJsonParse<GeoFeatureCollection>(geojson) ?? {
      type: 'FeatureCollection',
      features: [],
      properties: {},
    },
  };
}

function safeJsonParse<T>(json: ?string): ?T {
  let parsed = null;
  try {
    if (typeof json === 'string') {
      parsed = JSON.parse(json);
    }

    return parsed;
  } catch (err) {
    logger.error(err);
    return null;
  }
}
