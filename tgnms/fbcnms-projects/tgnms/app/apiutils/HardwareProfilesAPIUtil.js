/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import axios from 'axios';

import type {HardwareProfiles} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';

export async function getSchema(): Promise<Object> {
  const response = await axios.get('/hwprofile/schema');
  return response.data;
}

export async function getAllProfiles(): Promise<HardwareProfiles> {
  const response = await axios.get('/hwprofile');
  return response.data;
}
