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
