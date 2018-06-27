const express = require('express');
const fs = require('fs');
const querystring = require('querystring');

const app = express();

// set up the upgrade images path
const NETWORK_UPGRADE_IMAGES_REL_PATH = '/static/tg-binaries';
const NETWORK_UPGRADE_IMAGES_FULL_PATH =
  process.cwd() + NETWORK_UPGRADE_IMAGES_REL_PATH;
if (!fs.existsSync(NETWORK_UPGRADE_IMAGES_FULL_PATH)) {
  fs.mkdirSync(NETWORK_UPGRADE_IMAGES_FULL_PATH);
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

app.post(
  /\/uploadUpgradeBinary$/i,
  upload.single('binary'),
  (req, res, next) => {
    const urlPrefix = process.env.E2E_DL_URL ? process.env.E2E_DL_URL : (req.protocol + '://' + req.get('host'));
    const uriPath = querystring.escape(req.file.filename);
    const imageUrl = `${urlPrefix}${NETWORK_UPGRADE_IMAGES_REL_PATH}/${uriPath}`;

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      imageUrl,
    }));
  }
);

module.exports = app;
