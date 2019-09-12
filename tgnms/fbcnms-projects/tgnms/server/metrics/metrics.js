/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Sequelize from 'sequelize';

import {link_metric} from '../models';
import type {LinkMetric} from '../models/linkMetric';

export function getLinkMetrics(): Promise<Array<LinkMetric>> {
  return link_metric.findAll();
}

export function getLinkMetricsByName(
  searchTerm: string,
): Promise<Array<LinkMetric>> {
  return link_metric.findAll({
    where: {
      name: {
        // $FlowFixMe flow doesn't like sequelize
        [Sequelize.Op.like]: `%${searchTerm}%`,
      },
    },
  });
}
