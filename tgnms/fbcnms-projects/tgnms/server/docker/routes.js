/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {DockerHosts} = require('../models');
const {DOCKER_API_VERSION, PROXY_ENABLED} = require('../config');

const axios = require('axios');
const express = require('express');
const fs = require('fs');
const isIp = require('is-ip');
const logger = require('../log')(module);
const multer = require('multer');
const router = express.Router();

// set up the docker images path
const DOCKER_IMAGES_REL_PATH = '/static/docker';
const DOCKER_IMAGES_FULL_PATH = process.cwd() + DOCKER_IMAGES_REL_PATH;
if (!fs.existsSync(DOCKER_IMAGES_FULL_PATH)) {
  fs.mkdirSync(DOCKER_IMAGES_FULL_PATH);
}

// multer + configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, DOCKER_IMAGES_FULL_PATH);
  },
  // where to save the file on disk
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({storage});

function formatDockerUrl(host, port) {
  if (PROXY_ENABLED && isIp.v6(host)) {
    // special case, proxy doesn't handle ipv6 addresses correctly
    return `http://[[${host}]]:${port}/v${DOCKER_API_VERSION}`;
  }
  return isIp.v6(host)
    ? `http://[${host}]:${port}/v${DOCKER_API_VERSION}`
    : `http://${host}:${port}/v${DOCKER_API_VERSION}`;
}

export const dockerApiReq = async (httpMethod, hostId, apiMethod, res) => {
  DockerHosts.findById(hostId).then(hostEntry => {
    const dockerUrl = formatDockerUrl(
      hostEntry.dataValues.host,
      hostEntry.dataValues.port,
    );
    axios
      .request({
        method: httpMethod,
        url: `${dockerUrl}/${apiMethod}`,
      })
      .then(response => {
        if (response.status == 200) {
          res.status(200).send(response.data);
        } else {
          res.status(500).send(response.data);
        }
      })
      .catch(error => {
        res.status(500).send({
          message: error.response.data.message,
          status: error.response.status,
        });
      });
  });
};

router.get('/hosts', async (req, res) => {
  DockerHosts.findAll().then(hosts => res.status(200).send(hosts));
});

router.get('/:id/containers', async (req, res) => {
  dockerApiReq('get', req.params.id, 'containers/json', res);
});

router.get('/:id/images', async (req, res) => {
  dockerApiReq('get', req.params.id, 'images/json', res);
});

router.get('/:id/images/delete/:imageId', async (req, res) => {
  dockerApiReq('delete', req.params.id, `images/${req.params.imageId}`, res);
});

router.post(
  '/:id/images/upload',
  upload.single('binary'),
  (req, res, _next) => {
    const localPath = `${DOCKER_IMAGES_FULL_PATH}/${req.file.filename}`;
    // upload image
    const data = fs.createReadStream(localPath);
    const config = {
      headers: {
        'Content-Type': 'text/plain',
      },
      maxContentLength: 1024 * 1024 * 1024 /* 1 GB */,
    };
    try {
      DockerHosts.findById(req.params.id).then(hostEntry => {
        const dockerUrl = formatDockerUrl(
          hostEntry.dataValues.host,
          hostEntry.dataValues.port,
        );
        // Upload local binary to remote docker instance
        // TODO - figure out what to do with the naming
        const repo = 'tg-local-repo';
        const tag = 'e2e-image';
        const url =
          `${dockerUrl}/images/create` +
          `?fromSrc=-&message=&repo=${repo}&tag=${tag}`;
        axios
          .post(url, data, config)
          .then(resp => {
            if (resp.data.status) {
              res.status(200).send(resp.data);
            }
          })
          .catch(_err => {
            res.status(500).send();
          });
        // TODO - delete localPath file once upload completed
      });
    } catch (ex) {
      logger.error('Error in docker image upload', ex);
    }
  },
);

module.exports = router;
