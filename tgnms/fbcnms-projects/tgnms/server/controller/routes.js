/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {Api} from '../Api';
const fs = require('fs');
const {generateAndStoreOtp} = require('../middleware/otp');
const querystring = require('querystring');

export default class ControllerRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();

    // set up the upgrade images path
    const NETWORK_UPGRADE_IMAGES_REL_PATH = '/static/tg-binaries';
    const NETWORK_UPGRADE_IMAGES_FULL_PATH =
      process.cwd() + NETWORK_UPGRADE_IMAGES_REL_PATH;
    if (!fs.existsSync(NETWORK_UPGRADE_IMAGES_FULL_PATH)) {
      fs.mkdirSync(NETWORK_UPGRADE_IMAGES_FULL_PATH, {recursive: true});
    }

    // multer + configuration
    const multer = require('multer');
    const storage = multer.diskStorage({
      destination(req, file, cb) {
        cb(null, NETWORK_UPGRADE_IMAGES_FULL_PATH);
      },
      // where to save the file on disk
      filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
      },
    });

    const upload = multer({storage});

    router.post(
      /\/uploadUpgradeBinary$/i,
      upload.single('binary'),
      (req, res, _next) => {
        const urlPrefix = getUrlPrefix(req);
        const uriPath = querystring.escape(req.file.filename);

        generateAndStoreOtp().then(token => {
          const imageUrl = `${urlPrefix}${NETWORK_UPGRADE_IMAGES_REL_PATH}/${uriPath}?token=${token}`;
          res.setHeader('Content-Type', 'application/json');
          res.send(
            JSON.stringify({
              imageUrl,
            }),
          );
        });
      },
    );

    router.post('/softwarePortalImage', (req, res) => {
      const {release, name, networkName} = req.body;
      if (!release || !name || !networkName) {
        return res.status(400).send();
      }
      const urlPrefix = getUrlPrefix(req);

      generateAndStoreOtp().then(token => {
        // /downloadimage/release/image
        const imageUrl = `${urlPrefix}/nodeimage/downloadimage/${querystring.escape(
          networkName,
        )}/${querystring.escape(release)}/${querystring.escape(
          name,
        )}?token=${token}`;

        return res.json({
          imageUrl: imageUrl,
        });
      });
    });
    return router;
  }
}

function getUrlPrefix(req) {
  const urlPrefix = process.env.E2E_DL_URL
    ? process.env.E2E_DL_URL
    : req.protocol + '://' + req.get('host');
  return urlPrefix;
}
