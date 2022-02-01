/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as mime from 'mime-types';
const fs = require('fs');
import ANPAPIClient from './ANPAPIClient';
import PlanningService from './services/planningService';
import SitesFileService from './services/sitesFileService';
import {
  ANP_API_URL,
  ANP_CLIENT_ID,
  ANP_CLIENT_SECRET,
  ANP_PARTNER_ID,
  FACEBOOK_OAUTH_URL,
} from '../config';
import {Api} from '../Api';
import {ERROR_NETWORK_PLAN_STATES} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {createErrorHandler} from '../helpers/apiHelpers';
const multer = require('multer');

export default class NetworkPlanRoutes extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    const apiClient = new ANPAPIClient({
      anpBaseURL: ANP_API_URL,
      oAuthBaseURL: FACEBOOK_OAUTH_URL,
      partnerId: ANP_PARTNER_ID,
      oAuthCredentials: {
        client_id: ANP_CLIENT_ID,
        client_secret: ANP_CLIENT_SECRET,
      },
    });
    const planningService = new PlanningService({anpApi: apiClient});
    const sitesFileService = new SitesFileService();
    const handleFileUpload = this.makeFileUploadMiddleware(planningService);

    router.get('/folder', (req, res) => {
      return planningService
        .getFolders()
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.get('/folder/:id', (req, res) => {
      return planningService
        .getFolder({id: req.params.id})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.delete('/folder/:id', (req, res) => {
      return planningService
        .deleteFolder({id: req.params.id})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.post('/folder', (req, res) => {
      return planningService
        .createFolder(req.body)
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.put('/folder/:id', (req, res) => {
      return planningService
        .updateFolder({id: req.params.id, ...req.body})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.post('/plan', (req, res) => {
      return planningService
        .createNetworkPlan(req.body)
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.put('/plan/:id', (req, res) => {
      return planningService
        .updateNetworkPlan({id: req.params.id, ...req.body})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.get('/plan/:id', (req, res) => {
      return planningService
        .getNetworkPlan({id: req.params.id})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.get('/plan/:id/metrics', (req, res) => {
      return planningService
        .getNetworkPlanMetrics({id: req.params.id})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.delete('/plan/:id', (req, res) => {
      return planningService
        .deleteNetworkPlan({id: parseInt(req.params.id)})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.post('/plan/:id/launch', (req, res) => {
      return planningService
        .startLaunchPlan({id: parseInt(req.params.id)})
        .then(result => {
          if (ERROR_NETWORK_PLAN_STATES.has(result.state)) {
            return res.status(500).json(result);
          }
          return res.json(result);
        })
        .catch(createErrorHandler(res));
    });

    router.post('/plan/:id/cancel', (req, res) => {
      return planningService
        .cancelNetworkPlan(req.params.id)
        .then(result => res.json(result))
        .catch(err => res.status(500).json(err.message));
    });

    router.get('/plan', (req, res) => {
      return planningService
        .getPlansInFolder({folderId: req.query.folderId})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.post('/file', (req, res) => {
      return planningService
        .createInputFile(req.body)
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.put('/file/:id', (req, res) => {
      return planningService
        .updateInputFile({id: parseInt(req.params.id), ...req.body})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.post('/file/:id', handleFileUpload.single('file'), (req, res) => {
      return planningService
        .handleDraftFileUploaded({
          id: parseInt(req.params.id),
          fileData: req.file,
        })
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.delete('/file/:id', (req, res) => {
      return planningService
        .deleteInputFile({id: parseInt(req.params.id)})
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.get('/file/:id/download', async (req, res) => {
      try {
        const {id} = req.params;
        const fileMetadata = await planningService.getInputFile({
          id,
        });
        if (fileMetadata == null) {
          return res.status(404).send({error: 'File not found'});
        }
        const stream = await planningService.downloadFileStream(id);
        res.set(
          'Content-Disposition',
          stream.headers
            ? stream?.headers['content-disposition'] ?? 'inline'
            : 'inline',
        );
        res.set(
          'Content-Type',
          mime.contentType(fileMetadata.name.split('.').slice(-1)[0]),
        );
        return stream.data.pipe(res);
      } catch (err) {
        return res.status(500).send({error: err.message});
      }
    });

    // DEPRECATED
    router.get('/file/:fbid/anp-download', async (req, res) => {
      try {
        const {fbid: id} = req.params;
        const metadata = await apiClient.getFileMetadata({id});
        if (!metadata) {
          return res.status(404).send({error: 'File not found'});
        }

        const response = await apiClient.downloadFile({id});
        res.set(
          'Content-Disposition',
          response.headers
            ? response?.headers['content-disposition'] ?? 'inline'
            : 'inline',
        );
        res.set('Content-Type', mime.contentType(metadata.file_extension));
        /**
         * downloadFile returns a responseType of stream to enable
         * piping to output
         */
        return response.data.pipe(res);
      } catch (err) {
        return res.status(500).send({error: err.message});
      }
    });

    router.get('/plan/:id/outputs', (req, res) => {
      return planningService
        .getPlanOutputFiles(req.params.id)
        .then(x => res.json(x))
        .catch(err => res.status(500).send(err.message));
    });

    router.get('/plan/:id/inputs', (req, res) => {
      return planningService
        .getPlanInputFiles(req.params.id)
        .then(x => res.json(x))
        .catch(err => res.status(500).send(err.message));
    });

    router.get('/plan/:id/errors', (req, res) => {
      return planningService
        .getPlanErrors(parseInt(req.params.id))
        .then(x => res.json(x))
        .catch(err => res.status(500).send(err.message));
    });

    router.get('/inputs', (req, res) => {
      const {role} = req.query;
      if (typeof role !== 'string' || role.trim() === '') {
        return res.status(400).send({error: 'Missing role query'});
      }
      return planningService
        .getInputFilesByRole({role})
        .then(x => res.json(x))
        .catch(err => res.status(500).send(err.message));
    });

    /**
     * Fetch a sites-file as JSON
     */
    router.get('/sites/:id', (req, res) => {
      const {id} = req.params;
      return sitesFileService
        .getFile({id: parseInt(id)})
        .then(file => res.json(file))
        .catch(err => res.status(500).send(err.message));
    });
    /**
     * Create a new sites-file
     */
    router.post('/sites', (req, res) => {
      const {name} = req.body;
      if (typeof name !== 'string') {
        return res.status(400).json({error: 'name field is required'});
      }
      return sitesFileService
        .createFile({name: req.body.name})
        .then(file => res.json(file))
        .catch(err => res.status(500).send(err.message));
    });
    /**
     * Update a sites-file
     */
    router.put('/sites/:id', (req, res) => {
      const {id} = req.params;
      const {sites} = req.body;
      return sitesFileService
        .updateFile({id, sites})
        .then(file => res.json(file))
        .catch(err => res.status(500).send(err.message));
    });
    return router;
  }

  makeFileUploadMiddleware(p: PlanningService) {
    const uploadTempStorage = '/tmp/anp-uploads';
    const storage = multer.diskStorage({
      destination: (req, file, done) => {
        if (!fs.existsSync(uploadTempStorage)) {
          fs.mkdirSync(uploadTempStorage, {recursive: true});
        }
        done(null, uploadTempStorage);
      },
    });
    return multer({
      storage,
      fileFilter: async (req, file, cb) => {
        try {
          const fileId = req.params.id;
          const verified = await p.verifyFileUpload({id: fileId});
          if (!verified) {
            this.logger.error(`File not verified: ${file.originalname}`);
          }
          cb(null, verified);
        } catch (err) {
          cb(err);
        }
      },
    });
  }
}
