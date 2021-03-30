/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {Issuer as OpenidIssuer} from 'openid-client';
import type {Client as OpenidClient} from 'openid-client';

const logger = require('../log')(module);

type ClientParameters = {
  issuerUrl: string,
  clientId: string,
  clientSecret: string,
};

export default function getOidcClient(
  params: ClientParameters,
): Promise<OpenidClient> {
  const {issuerUrl, clientId, clientSecret} = params;

  const tryDiscovery = async () => {
    logger.info('openid discovery: starting');
    logger.debug(`openid discovery: connecting to issuer: ${issuerUrl}`);
    const issuer = await OpenidIssuer.discover(issuerUrl);
    const openidClient: OpenidClient = new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
    });
    logger.info('openid discovery: success');
    return openidClient;
  };

  /**
   * Transparently retry discovery until it succeeds
   **/
  return new Promise(resolve => {
    const attempt = () => {
      tryDiscovery()
        .then(client => resolve(client))
        .catch(error => {
          logger.info('openid discovery: failed. retrying in 5s.');
          logger.error(error);
          setTimeout(attempt, 5000);
        });
    };
    attempt();
  });
}
