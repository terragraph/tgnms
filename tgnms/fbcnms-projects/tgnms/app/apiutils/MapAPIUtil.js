/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import axios from 'axios';
import type {GeoFeature} from '@turf/turf';
import type {
  MapAnnotationGroup,
  MapAnnotationGroupIdent,
  SaveAnnotationGroupRequest,
} from '../../shared/dto/MapAnnotations';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';
import type {
  OverlayRequest,
  OverlayResponse,
} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';

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
  const response = await axios.put<
    SaveAnnotationGroupRequest,
    MapAnnotationGroup,
  >(`/map/annotations/${networkName}`, group);
  return response.data;
}

export async function setAnnotationGroupProperties({
  groupId,
  name,
}: {|
  groupId: number,
  name: string,
|}) {
  const response = await axios.put<
    SaveAnnotationGroupRequest,
    MapAnnotationGroup,
  >(`/map/annotations/group/${groupId}`, {name});
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

export async function saveAnnotation({
  networkName,
  groupName,
  annotationId,
  annotation,
}: {|
  networkName: string,
  groupName: string,
  annotationId: string | number,
  annotation: GeoFeature,
|}): Promise<GeoFeature> {
  const response = await axios.put<GeoFeature, GeoFeature>(
    `/map/annotations/${networkName}/${groupName}/${annotationId}`,
    annotation,
  );
  return response.data;
}

export async function deleteAnnotation({
  networkName,
  groupName,
  annotationId,
}: {|
  networkName: string,
  groupName: string,
  annotationId: string | number,
|}): Promise<void> {
  await axios.delete<void, void>(
    `/map/annotations/${networkName}/${groupName}/${annotationId}`,
  );
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

export async function queryRemoteOverlay(
  req: OverlayRequest,
): Promise<OverlayResponse> {
  const response = await axios.post<OverlayRequest, OverlayResponse>(
    `/map/overlay`,
    req,
  );
  return response.data;
}
