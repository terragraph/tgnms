/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {map_annotation_group, map_profile, topology} = require('../models');
import Sequelize from 'sequelize';
const logger = require('../log')(module);
import {ExpectedError} from '../helpers/apiHelpers';
import type {GeoFeature, GeoFeatureCollection} from '@turf/turf';
import type {
  MapAnnotationGroup,
  MapAnnotationGroupIdent,
} from '../../shared/dto/MapAnnotations';
import type {MapAnnotationGroupAttributes} from '../models/mapAnnotationGroup';
import type {MapProfile, MapProfileData} from '../../shared/dto/MapProfile';
import type {MapProfileAttributes} from '../models/mapProfile';
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
  return attrToAnnotationGroup(groupResult);
}

export async function saveAnnotationGroup(
  {
    network,
    geojson,
    id,
    name,
  }: {
    network: string,
    id?: number,
    name: string,
    geojson: string,
  },
  transaction?: Transaction,
): Promise<?MapAnnotationGroup> {
  const t = await getNetworkByName(network);

  await map_annotation_group.upsert(
    {
      id: id ?? 0,
      topology_id: t.id,
      geojson,
      name,
    },
    {transaction, returning: true},
  );

  const group = await getAnnotationGroup({network, group: name}, transaction);
  if (!group) {
    logger.error(
      `created/updated group id:${
        id ?? 'null'
      } - ${name} but could not reload group`,
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

export async function duplicateAnnotationGroup({
  network,
  groupName,
  newName,
}: {
  network: string,
  groupName: string,
  newName: string,
}) {
  const t = await getNetworkByName(network);
  const groupRow = await map_annotation_group.findOne({
    where: {
      topology_id: t.id,
      name: groupName,
    },
  });
  if (!groupRow) {
    return Promise.reject();
  }
  await saveAnnotationGroup({
    geojson: groupRow.geojson,
    name: newName,
    network,
  });
}

export async function saveAnnotation({
  network,
  group,
  annotationId,
  annotation,
}: {
  network: string,
  group: string,
  annotationId: ?string,
  annotation: GeoFeature,
}): Promise<GeoFeature> {
  const _group = await getAnnotationGroup({network, group});
  if (_group == null || _group.geojson == null) {
    throw new ExpectedError('Group not found');
  }
  if (annotationId == null) {
    throw new ExpectedError('Missing annotation id');
  }

  const featIdx = _group.geojson.features.findIndex(
    feat => feat.id === annotationId,
  );
  if (featIdx < 0) {
    _group.geojson.features.push(annotation);
    //create the feature if it doesn't exist
  } else {
    _group.geojson.features.splice(featIdx, 1, annotation);
  }
  const updatedGroup = await saveAnnotationGroup({
    id: _group.id,
    name: _group.name,
    geojson: JSON.stringify(_group.geojson),
    network: network,
  });
  if (updatedGroup == null) {
    throw new ExpectedError('Failed to save annotation');
  }
  const feature = updatedGroup.geojson.features.find(
    feat => feat.id === annotationId,
  );
  if (!feature) {
    throw new ExpectedError('Could not find updated feature');
  }
  return feature;
}

export async function deleteAnnotation({
  network,
  group,
  annotationId,
}: {
  network: string,
  group: string,
  annotationId: string,
}): Promise<void> {
  const _group = await getAnnotationGroup({network, group});
  if (_group == null || _group.geojson == null || annotationId == null) {
    throw new ExpectedError('Group not found');
  }

  const features = _group.geojson?.features?.filter(feature => {
    if (feature.id != null && feature.id === annotationId) {
      return false;
    }
    return true;
  });
  _group.geojson.features = features;
  await saveAnnotationGroup({
    id: _group.id,
    name: _group.name,
    geojson: JSON.stringify(_group.geojson),
    network: network,
  });
}

async function getNetworkByName(name: string) {
  const t = await topology.findOne({
    where: {
      name: name,
    },
  });
  if (!t) {
    throw new ExpectedError(`network not found`);
  }
  return t;
}

export async function getProfileById(id: number): Promise<?MapProfile> {
  const row = await map_profile.findByPk(id);
  if (row == null) {
    return null;
  }
  return attrToMapProfile(row.toJSON());
}

export async function getAllProfiles(): Promise<Array<MapProfile>> {
  const rows = await map_profile.findAll({
    include: [
      {
        model: topology,
        as: 'networks',
        attributes: ['name'],
      },
    ],
  });
  if (!rows) {
    return [];
  }

  return rows.map<MapProfile>(row => attrToMapProfile(row.toJSON()));
}

export async function createProfile(req: $Shape<MapProfile>) {
  const create = sanitizeProfile(req);
  if (create == null) {
    throw new Error('invalid profile');
  }
  const {name, data} = create;
  if (name == null || data == null) {
    throw new Error('missing required parameters');
  }
  const created = await map_profile.create(
    ({name, json: JSON.stringify(data)}: $Shape<MapProfileAttributes>),
  );
  return created;
}

export async function saveProfile(
  req: $Shape<MapProfile>,
): Promise<MapProfile> {
  const update = sanitizeProfile(req);
  if (update == null) {
    throw new Error('invalid profile');
  }
  const {id, name, data, networks} = update;
  if (name == null || data == null || id == null) {
    throw new Error('missing required parameters');
  }
  const row = await map_profile.findByPk(id);
  if (row == null) {
    throw new Error('Profile not found');
  }
  row.name = name;
  row.json = JSON.stringify(data);
  await row.save();
  const profileData = row.toJSON();

  const [numUpdated, updatedRows] = await topology.update(
    {map_profile_id: row.id},
    {
      where: {
        name: {
          [(Sequelize.Op.in: any)]: networks,
        },
      },
    },
  );
  /**
   * set map_profile_id=null on all of this map_profile's networks
   * which are not in the selected list
   */
  const [numRemoved] = await topology.update(
    {map_profile_id: null},
    {
      where: {
        map_profile_id: {
          [(Sequelize.Op.eq: any)]: row.id,
        },
        name: {
          [(Sequelize.Op.notIn: any)]: networks,
        },
      },
    },
  );

  logger.info(
    `Map Profile Saved: ${name} - ${numUpdated} networks added ${numRemoved} removed `,
  );

  const updatedNetworks = (updatedRows || []).map(row => row.toJSON());

  return attrToMapProfile({...profileData, networks: updatedNetworks});
}

export async function deleteProfile(id: number): Promise<void> {
  const row = await map_profile.findByPk(id);
  await row?.destroy();
}

function sanitizeProfile(profile: $Shape<MapProfile>): ?MapProfile {
  if (!profile || profile.name == null) {
    return null;
  }
  profile.name = profile.name.replace(/[^A-Za-z-0-9_ ]/g, '');
  if (profile.name === '') {
    return null;
  }
  profile.data = {
    ...(profile.data || {}),
  };
  profile.data.mcsTable = profile?.data?.mcsTable ?? [];
  return profile;
}

function attrToAnnotationGroup({
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

export function attrToMapProfile({
  id,
  name,
  json,
  networks,
}: $Shape<MapProfileAttributes>): MapProfile {
  return {
    id,
    name,
    data: safeJsonParse<MapProfileData>(json) ?? {mcsTable: null},
    networks: networks ? networks.map(network => network.name) : [],
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
