/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as mime from 'mime-types';
import {
  ANP_API_URL,
  ANP_CLIENT_ID,
  ANP_CLIENT_SECRET,
  ANP_PARTNER_ID,
  FACEBOOK_OAUTH_URL,
} from '../config';
import {createApi} from '../helpers/apiHelpers';
const router = createApi();

import ANPAPIClient from './ANPAPIClient';

const apiClient = new ANPAPIClient({
  anpBaseURL: ANP_API_URL,
  oAuthBaseURL: FACEBOOK_OAUTH_URL,
  partnerId: ANP_PARTNER_ID,
  oAuthCredentials: {
    client_id: ANP_CLIENT_ID,
    client_secret: ANP_CLIENT_SECRET,
  },
});

// create a new upload session with the facebook graph API
router.post('/file/uploads', (req, res) => {
  return apiClient
    .createUploadSession(req.body)
    .then(uploadSession => {
      res.json(uploadSession);
    })
    .catch(err => {
      return res.status(500).send(err.message);
    });
});
// upload the actual file data
router.post('/file/upload/:id', (req, res) => {
  const {chunkSize, sig} = req.query;
  if (!chunkSize || !sig) {
    return res.status(400).send('missing required params');
  }
  return apiClient
    .uploadChunk({
      file_id: req.params.id,
      /**
       * req is a ReadableStream. Passing a ReadableStream to the axios body
       * the bytes are copied without buffering the entire chunk into memory.
       */
      data: req,
      /**
       * The request to facebook needs a content-length header,
       * but this can't be known until the entire stream is read so
       * the client must also pass this length.
       */
      chunkSize: chunkSize,
      headers: req.headers,
      query: {sig},
    })
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      return res.status(500).send(err.message);
    });
});
// update a file's metadata
router.put('/file', (req, res) => {
  return apiClient
    .updateFileMetadata(req.body)
    .then(result => res.json(result))
    .catch(err => {
      console.dir(err);
      res.status(500).send(err.message);
    });
});
router.get('/plan/:id', (req, res) => {
  return apiClient
    .getPlan(req.params.id)
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});
router.get('/plan/:id/inputs', (req, res) => {
  return apiClient
    .getPlanInputFiles(req.params.id)
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});
router.get('/plan/:id/outputs', (req, res) => {
  return apiClient
    .getPlanOutputFiles(req.params.id)
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});
router.get('/plan/:id/errors', (req, res) => {
  return apiClient
    .getPlanErrors(req.params.id)
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});
router.get('/folder', (req, res) => {
  return apiClient
    .getFolders()
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});
router.get('/folder/:id', (req, res) => {
  return apiClient
    .getFolderById({id: req.params.id})
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});
router.post('/folder', (req, res) => {
  return apiClient
    .createFolder(req.body)
    .then(x => res.json(x))
    .catch(err => res.status(500).send(err.message));
});

router.get('/plan', async (req, res) => {
  try {
    const {folderId} = req.query;
    if (!folderId) {
      return res
        .status(400)
        .send({error: `folderId query parameter is required`});
    }
    const folder = await apiClient.getFolderById({id: folderId});
    if (!folder) {
      return res
        .status(404)
        .send({error: `No folder found with id: ${folderId}`});
    }
    const plansInFolder = await apiClient.getPlansInFolder({
      folder_id: folder.id,
    });
    return res.json(plansInFolder);
  } catch (err) {
    console.dir(err);
    return res.status(500).send({error: err.message});
  }
});

// create plan object
router.post('/plan', async (req, res) => {
  try {
    const {plan_name, boundary_polygon, folder_id, dsm, site_list} = req.body;
    const plan = await apiClient.createPlan({
      folder_id: folder_id,
      plan_name: plan_name,
      boundary_polygon: boundary_polygon,
      dsm: dsm,
      site_list: site_list,
    });
    return res.json(plan);
  } catch (err) {
    console.dir(err);
    console.dir(err.data);
    return res.status(500).json(err.message);
  }
});

router.post('/plan/launch/:id', (req, res) => {
  return apiClient
    .launchPlan({
      id: req.params.id,
    })
    .then(result => res.json(result))
    .catch(err => res.status(500).json(err.message));
});
router.post('/plan/cancel/:id', (req, res) => {
  return apiClient
    .cancelPlan({
      id: req.params.id,
    })
    .then(result => res.json(result))
    .catch(err => res.status(500).json(err.message));
});

router.get('/file', (req, res) => {
  const {role} = req.query;
  return apiClient
    .getPartnerFilesByRole({role})
    .then(files => res.json(files))
    .catch(err => {
      res.status(500).send(err.message);
    });
});

router.get('/file/:id', async (req, res) => {
  try {
    const {id} = req.params;
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
    // downloadFile returns a responseType of stream to enable piping to output
    return response.data.pipe(res);
  } catch (err) {
    return res.status(500).send({error: err.message});
  }
});

// get a plan file's metadata
router.get('/file/:id/metadata', (req, res) => {
  const {id} = req.params;
  return apiClient
    .getFileMetadata({id})
    .then(data => res.json(data))
    .catch(err => {
      res.status(500).send(err.message);
    });
});

module.exports = router;
