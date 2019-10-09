/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const express = require('express');
import {CLIENT_ROOT_URL, KEYCLOAK_HOST, KEYCLOAK_REALM} from '../config';
import type {FBCMobileAppConfig} from '@fbcnms/mobileapp/FBCMobileAppConfig';
const logger = require('../log')(module);
const router = express.Router();

/*
 * Warning: This is an open route, only display public information here
 */
router.get('/clientconfig', (req, res) => {
  getFbcMobileConfig()
    .then(conf => res.json(conf))
    .catch(err => {
      logger.error(err);
      return res.status(500).send({error: err.message});
    });
});

async function getFbcMobileConfig(): Promise<FBCMobileAppConfig> {
  if (!KEYCLOAK_HOST || !KEYCLOAK_REALM || !CLIENT_ROOT_URL) {
    throw new Error('MISSING REQUIRED CONFIGURATION'); //todo fix flow
  }

  return {
    apiUrl: CLIENT_ROOT_URL,
    url: KEYCLOAK_HOST,
    realm: KEYCLOAK_REALM,
    clientId: 'installer-app',
  };
}

module.exports = router;
