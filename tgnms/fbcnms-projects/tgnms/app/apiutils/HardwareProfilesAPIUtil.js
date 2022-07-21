/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
