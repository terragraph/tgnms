/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import Sequelize from 'sequelize';
const {link_metric} = require('../models');

export function getLinkMetrics() {
  return link_metric.findAll();
}

export function getLinkMetricsByName(searchTerm: string) {
  return link_metric.findAll({
    where: {
      name: {
        [(Sequelize.Op.like: any)]: `%${searchTerm}%`,
      },
    },
  });
}
