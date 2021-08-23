/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('../sequelize-config')[env];
const logger = require('../log')(module);

import {Model as _Model} from 'sequelize';
import type SequelizeClass from 'sequelize';
import type {ControllerAttributes} from './controller';
import type {LinkEventAttributes} from './linkEvents';
import type {LinkMetricAttributes} from './linkMetric';
import type {MapAnnotationGroupAttributes} from './mapAnnotationGroup';
import type {MapProfileAttributes} from './mapProfile';
import type {NetworkPlanAttributes} from './networkPlan';
import type {NetworkPlanFileAttributes} from './networkPlanFile';
import type {NetworkPlanFolderAttributes} from './networkPlanFolder';
import type {TopologyAttributes} from './topology';
import type {WirelessControllerAttributes} from './wirelessController';

declare class Topology extends _Model<TopologyAttributes> {}
declare class LinkEvent extends _Model<LinkEventAttributes> {}
declare class LinkMetric extends _Model<LinkMetricAttributes> {}
declare class Controller extends _Model<ControllerAttributes> {}
declare class WirelessController extends _Model<WirelessControllerAttributes> {}
declare class MapAnnotationGroup extends _Model<MapAnnotationGroupAttributes> {}
declare class MapProfile extends _Model<MapProfileAttributes> {}
declare class NetworkPlanFolder extends _Model<NetworkPlanFolderAttributes> {}
declare class NetworkPlan extends _Model<NetworkPlanAttributes> {}
declare class NetworkPlanFile extends _Model<NetworkPlanFileAttributes> {}

export type TopologyModel = Topology;

export type Models = {|
  topology: typeof Topology,
  wireless_controller: typeof WirelessController,
  controller: typeof Controller,
  link_event: typeof LinkEvent,
  link_metric: typeof LinkMetric,
  map_annotation_group: typeof MapAnnotationGroup,
  map_profile: typeof MapProfile,
  network_plan_folder: typeof NetworkPlanFolder,
  network_plan: typeof NetworkPlan,
  network_plan_file: typeof NetworkPlanFile,
  sequelize: SequelizeClass,
  Sequelize: typeof Sequelize,
|};
declare module.exports: Models;

const db: Models = ({}: $Shape<Models>);
const sequelize = new (Sequelize: any)(
  config.database,
  config.username,
  config.password,
  config,
);

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    try {
      const model = sequelize['import'](path.join(__dirname, file));
      db[model.name] = model;
    } catch (err) {
      logger.error(`invalid Sequelize model file: ${file}`);
      logger.error(err);
    }
  });

// foreign key associations
Object.keys(db).forEach((modelName: string) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
