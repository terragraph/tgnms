/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import websocketService from '../websockets/service';
import {Api} from '../Api';
import {
  DownloadStatus,
  getWebSocketGroupName,
} from '../../shared/dto/SoftwarePortalDownload';
import {createErrorHandler, createRequest} from '../helpers/apiHelpers';
import {otpMiddleware} from '../middleware/otp';
import type {SoftwarePortalDownloadMessage} from '../../shared/dto/SoftwarePortalDownload';

const {
  SOFTWARE_PORTAL_URL,
  SOFTWARE_PORTAL_API_TOKEN,
  SOFTWARE_PORTAL_API_ID,
} = require('../config');
const request = require('request');

export default class MyRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    router.post('/list', (req, res) => {
      if (req.body == null || req.body.suite == null || req.body.suite === '') {
        return res
          .status(400)
          .send({message: 'error: required parameter suite missing'});
      }

      const uri = `${SOFTWARE_PORTAL_URL}/list`;
      const data = {
        ...req.body,
        api_token: SOFTWARE_PORTAL_API_TOKEN,
        api_id: SOFTWARE_PORTAL_API_ID,
      };
      return createRequest({
        json: data,
        method: 'POST',
        uri,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    /*
     * /controller/softwarePortalImage instructs controller to download from
     * this route. We validate the controller auth token and then pipe from
     * software portal.
     */
    router.get(
      '/downloadimage/:networkName/:release/:image',
      otpMiddleware(),
      (req, res) => {
        const {image, networkName, release} = req.params;
        if (!image || !networkName || !release) {
          return res
            .status(400)
            .send({message: 'missing release or image parameter'});
        }
        this.logger.info(`download requested for ${image} ${release}`);
        // /download/tg_node_image/M69/tg-update-armada39x.bin
        const baseurl = `${SOFTWARE_PORTAL_URL}/download/tg_firmware_rev5`;
        const url = `${baseurl}/${escapeUrlParam(release)}/${escapeUrlParam(
          image,
        )}`;
        const data = {
          ...req.body,
          api_token: SOFTWARE_PORTAL_API_TOKEN,
          api_id: SOFTWARE_PORTAL_API_ID,
        };

        const webSocketGroupName = getWebSocketGroupName({
          name: image,
          networkName,
          release,
        });
        return request({
          url: url,
          json: data,
          method: 'POST',
        })
          .on(
            'data',
            // create a closure to store the counters
            (() => {
              let contentLengthBytes: number;
              let bytesProcessed: number = 0;
              let lastPct = 0;

              // use function so we can bind to the _this_ of the request
              return function (chunk) {
                // the in-progress http response from the server
                const {response} = this;
                if (response.statusCode !== 200) {
                  const body = chunk.toString();
                  // eslint-disable-next-line max-len
                  const errorMessage = `received error from upstream: ${response.statusCode} ${body}`;
                  res.status(response.statusCode).send(errorMessage);
                  return this.emit('error', errorMessage);
                }
                if (typeof contentLengthBytes !== 'number') {
                  contentLengthBytes = parseInt(
                    response.headers['content-length'],
                  );
                }
                bytesProcessed += chunk.length;
                const pct = bytesProcessed / contentLengthBytes;
                /*
                 * to avoid spamming the client, only notify when
                 * progress increases by at least 1%
                 */
                if (pct - lastPct >= 0.01) {
                  this.logger.debug(
                    'e2e image download progress: ' + (pct * 100).toFixed(1),
                  );
                  lastPct = pct;
                  //signal the progress to the UI
                  const message: SoftwarePortalDownloadMessage = {
                    progressPct: pct,
                    status: DownloadStatus.DOWNLOADING,
                  };
                  websocketService.messageGroup(webSocketGroupName, message);
                }
              };
            })(),
          )
          .on('error', errMsg => {
            const message: SoftwarePortalDownloadMessage = {
              progressPct: 0,
              status: DownloadStatus.ERROR,
              message: errMsg,
            };
            websocketService.messageGroup(webSocketGroupName, message);
          })
          .pipe(res)
          .on('finish', () => {
            const message: SoftwarePortalDownloadMessage = {
              progressPct: 1,
              status: DownloadStatus.FINISHED,
            };
            websocketService.messageGroup(webSocketGroupName, message);
          });
      },
    );
    return router;
  }
}

// whitelist characters for software portal url params
function escapeUrlParam(str: string) {
  // only allow letters, numbers, . and -
  return str.replace(/[^a-zA-Z0-9.-]/, '');
}
