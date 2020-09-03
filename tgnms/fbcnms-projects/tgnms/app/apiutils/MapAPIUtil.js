/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import axios from 'axios';
import type {
  MapAnnotationGroup,
  MapAnnotationGroupIdent,
  SaveAnnotationGroupRequest,
} from '../../shared/dto/MapAnnotations';
import type {MapProfile} from '../../shared/dto/MapProfile';

export async function getAnnotationGroups({
  networkName,
}: {|
  networkName: string,
|}): Promise<Array<MapAnnotationGroupIdent>> {
  const response = await axios.get<void, Array<MapAnnotationGroupIdent>>(
    `/map/annotations/${networkName}`,
  );
  return response.data;
}

export async function getAnnotationGroup({
  networkName,
  groupName,
}: {|
  networkName: string,
  groupName: string,
|}): Promise<?MapAnnotationGroup> {
  const response = await axios.get<void, MapAnnotationGroup>(
    `/map/annotations/${networkName}/${groupName}`,
  );
  return response.data;
}

export async function saveAnnotationGroup({
  networkName,
  group,
}: {|
  networkName: string,
  group: SaveAnnotationGroupRequest,
|}) {
  const response = await axios.post<
    SaveAnnotationGroupRequest,
    MapAnnotationGroup,
  >(`/map/annotations/${networkName}`, group);
  return response.data;
}

export async function deleteAnnotationGroup({
  networkName,
  group,
}: {|
  networkName: string,
  group: $Shape<MapAnnotationGroupIdent>,
|}): Promise<void> {
  await axios.delete<MapAnnotationGroupIdent, void>(
    `/map/annotations/${networkName}/${group?.name ?? ''}`,
  );
}
export async function duplicateAnnotationGroup({
  networkName,
  groupName,
  newName,
}: {|
  networkName: string,
  groupName: string,
  newName: string,
|}) {
  const newGroup = await axios.post<MapAnnotationGroupIdent, void>(
    `/map/annotations/${networkName}/${groupName}/duplicate`,
    {
      newName,
    },
  );
  return newGroup;
}

export async function getProfiles() {
  const response = await axios.get<void, Array<MapProfile>>('/map/profile');
  return response.data;
}

export async function createProfile(body: $Shape<MapProfile>) {
  const response = await axios.post<$Shape<MapProfile>, MapProfile>(
    '/map/profile',
    body,
  );
  return response.data;
}

export async function saveProfile(body: $Shape<MapProfile>) {
  const response = await axios.put<$Shape<MapProfile>, MapProfile>(
    '/map/profile',
    body,
  );
  return response.data;
}

export async function deleteProfile(id: number): Promise<void> {
  await axios.delete<void, void>(`/map/profile/${id}`);
}
