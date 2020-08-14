/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import axios from 'axios';
import type {NodeSysdumpType} from '../views/sysdumps/NodeSysdumps';

export async function getSysdumps(): Promise<Array<NodeSysdumpType>> {
  const response = await axios.get('/sysdump/');
  return response.data;
}
