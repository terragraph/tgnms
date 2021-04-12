/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import axios from 'axios';
import type {
  NodeSysdumpDeleteType,
  NodeSysdumpType,
} from '@fbcnms/tg-nms/app/views/sysdumps/NodeSysdumps';

export const SYSDUMP_PATH = '/sysdump';

export const SYSDUMP_RESULT = {
  PENDING: 0,
  SUCCESS: 1,
  ERROR: -1,
};

export async function getSysdumps(): Promise<Array<NodeSysdumpType>> {
  const response = await axios.get(`${SYSDUMP_PATH}/`);
  return response.data;
}

export async function deleteSysdump(
  selected: Array<string>,
): Promise<NodeSysdumpDeleteType> {
  const response = await axios.post(`${SYSDUMP_PATH}/delete`, {
    sysdumps: selected,
  });
  return response.data;
}

export async function sysdumpExists(filename: string): Promise<number> {
  const response = await axios.get(`${SYSDUMP_PATH}/p/${filename}`);
  switch (response.status) {
    case 200:
      return SYSDUMP_RESULT.SUCCESS;
    case 202:
      return SYSDUMP_RESULT.PENDING;
    default:
      return SYSDUMP_RESULT.ERROR;
  }
}
