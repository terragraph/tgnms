/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as mapService from './service';
import {createApi, createErrorHandler} from '../helpers/apiHelpers';
const {reloadInstanceConfig} = require('../topology/model');
const logger = require('../log')(module);

const router = createApi();

router.get('/annotations/:network', (req, res) => {
  const {network} = req.params;
  return mapService
    .getNetworkGroups({network})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

/**
 *  @swagger
 *  paths:
 *   "/map/annotations/{network}/{group}":
 *     get:
 *       description: "Gets an annotation group, along with all
 *        GeoJSON features."
 *       tags:
 *         - Annotations
 *       produces:
 *         - application/json
 *       parameters:
 *         - $ref: "#/components/parameters/network"
 *         - $ref: "#/components/parameters/group"
 *       responses:
 *         200:
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: "#/components/schemas/AnnotationGroup"
 */
router.get('/annotations/:network/:group', (req, res) => {
  const {network, group} = req.params;
  return mapService
    .getAnnotationGroup({network, group})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.put('/annotations/:network', (req, res) => {
  const {network} = req.params;
  if (!req.body?.geojson) {
    return res.status(400).send();
  }
  const {id, name, geojson} = req.body;
  return mapService
    .saveAnnotationGroup({network, id, name, geojson})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.put('/annotations/group/:groupId', (req, res) => {
  const {groupId} = req.params;
  if (groupId == null) {
    return res.status(400).send();
  }
  const {name} = req.body;
  if (name == null) {
    return res.status(400).send();
  }
  return mapService
    .setAnnotationGroupProperties({id: groupId, name})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.delete('/annotations/:network/:group', (req, res) => {
  const {network, group} = req.params;
  return mapService
    .deleteAnnotationGroup({network, group})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.post('/annotations/:network/:groupName/duplicate', (req, res) => {
  const {network, groupName} = req.params;
  const {newName} = req.body;
  if (!(network && groupName && newName)) {
    return res.status(400).send();
  }
  return mapService
    .duplicateAnnotationGroup({network, groupName, newName})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.put('/annotations/:network/:group/:annotationId', (req, res) => {
  const {network, group, annotationId} = req.params;
  return mapService
    .saveAnnotation({
      network,
      group,
      annotationId,
      annotation: req.body,
    })
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});
router.delete('/annotations/:network/:group/:annotationId', (req, res) => {
  const {network, group, annotationId} = req.params;
  return mapService
    .deleteAnnotation({
      network,
      group,
      annotationId,
    })
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.get('/profile', (req, res) => {
  return mapService
    .getAllProfiles()
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.post('/profile', (req, res) => {
  const {name, data} = req.body;
  return mapService
    .createProfile({name, data})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.put('/profile', (req, res) => {
  const {id, name, data, networks} = req.body;
  return mapService
    .saveProfile({id, name, data, networks})
    .then(x => {
      try {
        reloadInstanceConfig();
      } catch (err) {
        logger.error(err?.message);
      }
      return res.json(x);
    })
    .catch(createErrorHandler(res));
});

router.delete('/profile/:id', (req, res) => {
  const {id} = req.params;
  return mapService
    .deleteProfile(id)
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

module.exports = router;
