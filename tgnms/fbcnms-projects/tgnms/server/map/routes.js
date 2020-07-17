/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as mapService from './service';
import {createApi, createErrorHandler} from '../helpers/apiHelpers';

const router = createApi();

router.get('/annotations/:network', (req, res) => {
  const {network} = req.params;
  return mapService
    .getNetworkGroups({network})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.get('/annotations/:network/:group', (req, res) => {
  const {network, group} = req.params;
  return mapService
    .getAnnotationGroup({network, group})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

router.post('/annotations/:network', (req, res) => {
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

router.delete('/annotations/:network/:group', (req, res) => {
  const {network, group} = req.params;
  return mapService
    .deleteAnnotationGroup({network, group})
    .then(x => res.json(x))
    .catch(createErrorHandler(res));
});

module.exports = router;
