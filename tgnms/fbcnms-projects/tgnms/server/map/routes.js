/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as mapService from './service';
import {Api} from '../Api';
import {createErrorHandler} from '../helpers/apiHelpers';
import {makeOverlayRequest} from './remoteOverlays';
const {reloadInstanceConfig} = require('../topology/model');

export default class Map extends Api {
  makeRoutes() {
    const router = this.createApi();
    /**
     * @swagger
     * paths:
     *   "/map/annotations/{network}":
     *     get:
     *       description: Gets a listing of annotation groups
     *       tags:
     *       - Annotations
     *       produces:
     *         - application/json
     *       parameters:
     *         - $ref: "#/components/parameters/network"
     *       responses:
     *         200:
     *           content:
     *             application/json:
     *               schema:
     *                 $ref: "#/components/schemas/AnnotationGroupIdArray"
     */
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

    /**
     *  @swagger
     *  paths:
     *   "/map/annotations/{network}":
     *     put:
     *       description: "Creates or replaces an annotation group and its
     *        features. This request is idempotent."
     *       tags:
     *         - Annotations
     *       produces:
     *         - application/json
     *       parameters:
     *         - $ref: "#/components/parameters/network"
     *       responses:
     *         200:
     *           content:
     *             application/json:
     *               schema:
     *                 $ref: "#/components/schemas/AnnotationGroup"
     */
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

    /**
     *  @swagger
     *  paths:
     *   "/map/annotations/group/{groupId}":
     *     put:
     *       description: "Update mutable properties of annotation group.
     *        Currently only name is mutable."
     *       requestBody:
     *         required: true
     *         content:
     *           application/json:
     *             schema:
     *              type: object
     *              description: "Mutable properties of annotation group"
     *              properties:
     *                name: name
     *                type: string
     *       tags:
     *         - Annotations
     *       produces:
     *         - application/json
     *       parameters:
     *         - $ref: "#/components/parameters/groupId"
     *       responses:
     *         200:
     *           content:
     *             application/json:
     *               schema:
     *                 $ref: "#/components/schemas/AnnotationGroup"
     */
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

    /**
     *  @swagger
     *  paths:
     *   "/annotations/{network}/{group}":
     *     delete:
     *       description: "Delete an annotation group that belongs to a network"
     *       tags:
     *         - Annotations
     *       produces:
     *         - application/json
     *       parameters:
     *         - $ref: "#/components/parameters/network"
     *         - $ref: "#/components/parameters/group"
     */
    router.delete('/annotations/:network/:group', (req, res) => {
      const {network, group} = req.params;
      return mapService
        .deleteAnnotationGroup({network, group})
        .then(x => res.json(x))
        .catch(createErrorHandler(res));
    });

    /**
     *  @swagger
     *  paths:
     *   "/annotations/{network}/{group}/duplicate":
     *     post:
     *       description: "Create a copy of an annotation group with a new name"
     *       tags:
     *         - Annotations
     *       requestBody:
     *         required: true
     *         content:
     *           application/json:
     *             schema:
     *              type: object
     *              description: "Name of the new annotation group"
     *              properties:
     *                name: newName
     *                type: string
     *       parameters:
     *         - $ref: "#/components/parameters/network"
     *         - $ref: "#/components/parameters/group"
     *       produces:
     *         - application/json
     *       responses:
     *         200:
     *           content:
     *             application/json:
     *               schema:
     *                 $ref: "#/components/schemas/AnnotationGroup"
     */
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

    /**
     *  @swagger
     *  paths:
     *   "/annotations/{network}/{group}/{annotationId}":
     *     put:
     *       description: "Update one annotation in an annotation group."
     *       tags:
     *         - Annotations
     *       requestBody:
     *         required: true
     *         content:
     *           application/json:
     *             schema:
     *               $ref: "#/components/schemas/AnnotationFeature"
     *       parameters:
     *         - $ref: "#/components/parameters/network"
     *         - $ref: "#/components/parameters/group"
     *         - $ref: "#/components/parameters/annotationId"
     *       produces:
     *         - application/json
     *       responses:
     *         200:
     *           content:
     *             application/json:
     *               schema:
     *                 $ref: "#/components/schemas/AnnotationFeature"
     */
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

    /**
     *  @swagger
     *  paths:
     *   "/annotations/{network}/{group}/{annotationId}":
     *     delete:
     *       description: "Delete one annotation in an annotation group."
     *       tags:
     *         - Annotations
     *       parameters:
     *         - $ref: "#/components/parameters/network"
     *         - $ref: "#/components/parameters/group"
     *         - $ref: "#/components/parameters/annotationId"
     *       produces:
     *         - application/json
     */
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
            this.logger.error(err?.message);
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
    router.post('/overlay', (req, res) => {
      return makeOverlayRequest(req.body).then(result => {
        return res.json(result);
      });
    });
    return router;
  }
}
