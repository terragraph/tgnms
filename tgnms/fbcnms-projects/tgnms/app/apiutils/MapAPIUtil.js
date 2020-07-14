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
|}): Promise<?MapAnnotationGroupIdent> {
  const response = await axios.get<void, MapAnnotationGroupIdent>(
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
