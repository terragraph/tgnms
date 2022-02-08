/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {Api} from './Api';
import {isFeatureEnabled} from './settings/settings';
import type {$Application} from 'express';
import type {Request, Response} from './types/express';
const logger = require('./log')({filename: __filename});

export async function setupRoutes(app: $Application<Request, Response>) {
  const r = routeManager(app);
  r.route('/api/v1', require('./api/v1/routes').default);
  r.route('/apiservice', require('./apiservice/routes').default);
  r.route('/controller', require('./controller/routes').default);
  r.route('/events', require('./events/routes').default);
  r.route('/import', require('./import/routes').default);
  r.route('/map', require('./map/routes').default);
  r.route('/metrics', require('./metrics/routes').default);
  r.route('/nodeimage', require('./nodeimage/routes').default);
  r.route('/topology', require('./topology/routes').default);
  r.route('/user', require('./user/routes').default);
  r.route('/network_test', require('./network_test/routes').default);
  r.route('/scan_service', require('./scan_service/routes').default);
  r.route('/topology_history', require('./topology_history/routes').default);
  r.route('/websockets', require('./websockets/routes').default);
  r.route('/api/alarms', require('./alarms/routes').default);
  r.route('/healthcheck', require('./healthcheck/routes').default);
  r.route('/settings', require('./settings/routes').default);
  r.route('/export', require('./export/routes').default);
  if (isFeatureEnabled('NETWORK_PLANNING_ENABLED')) {
    r.route('/network_plan', require('./network_plan/routes').default);
  }
  r.route(
    '/default_route_history',
    require('./default_route_history/routes').default,
  );
  r.route('/sysdump', require('./sysdump/routes').default);
  r.route('/openapi', require('./openapi/routes').default);
  r.route('/hwprofile', require('./hwprofile/routes').default);

  await r.init();
}

export function routeManager(app: $Application<Request, Response>) {
  const queue: Array<[string, Class<Api>]> = [];
  return {
    route: (path: string, c: Class<Api>) => {
      queue.push([path, c]);
    },
    init: async () => {
      const initQueue = [];
      for (const [path, _class] of queue) {
        const api = new _class();
        initQueue.push([path, api]);
      }
      for (const [path, api] of initQueue) {
        logger.debug(`initializing api: ${path}`);
        try {
          await api.init();
        } catch (err) {
          console.error(err);
          logger.error(`Error initializing api: ${err.message}`);
        }
      }
      for (const [path, api] of initQueue) {
        try {
          const router = api.makeRoutes();
          app.use(path, router);
          logger.debug(`registered api: ${path}`);
        } catch (err) {
          console.error(err);
          logger.error(`Error registering api: ${err.message}`);
        }
      }
    },
  };
}
