/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Sequelize from 'sequelize';
const logger = require('../log')(module);

import {link_metric} from '../models';
import type {LinkMetric} from '../models/linkMetric';

export async function testLinkMetrics() {
  try {
    logger.debug('Fetching link metrics');
    await getLinkMetricList().then(metricList => {
      metricList.forEach(metric => {
        logger.debug('Metric:', metric.key_name, metric.name);
      });
    });
  } catch (err) {
    logger.debug('Error:', err);
  }
}

export function getLinkMetricList(): Promise<Array<LinkMetric>> {
  return new Promise<Array<LinkMetric>>((resolve, _reject) => {
    return link_metric.findAll().then(metrics => resolve(metrics));
  });
}

export function getLinkMetricsByName(
  searchTerm: string,
): Promise<Array<LinkMetric>> {
  return new Promise<Array<LinkMetric>>((resolve, _reject) => {
    return link_metric
      .findAll({
        where: {
          name: {
            // $FlowFixMe
            [Sequelize.Op.like]: `%${searchTerm}%`,
          },
        },
      })
      .then(metrics => resolve(metrics));
  });
}

export function formatPrometheusLabel(metricName: string): string {
  return metricName.replace(/[\.\-\/\[\]]/g, '_');
}
