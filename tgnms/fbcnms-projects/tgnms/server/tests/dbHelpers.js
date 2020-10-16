/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {controller, topology} = require('../models');
import type {ControllerAttributes} from '../models/controller';
import type {TopologyAttributes} from '../models/topology';

export async function seedTopology(overrides?: $Shape<TopologyAttributes>) {
  const ctrl = await controller.create(
    ({
      api_ip: '127.0.0.1',
      e2e_port: 17077,
      api_port: 8080,
    }: $Shape<ControllerAttributes>),
  );
  return await topology.create(
    ({
      id: 1,
      name: 'test-network',
      primary_controller: ctrl.id,
      ...(overrides || {}),
    }: $Shape<TopologyAttributes>),
  );
}
