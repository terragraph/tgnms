/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
