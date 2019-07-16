/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const express = require('express');
import {addMissingKeysHandler, getLocaleHandler} from '@fbcnms/i18n';
const router = express.Router();
import {createErrorHandler} from '../helpers/apiHelpers';
import {i18nextInstance, saveTranslationFile} from './service';

/**
 * UI posts missing translation keys to the backend - this is how we handle
 * translation extraction
 **/
router.post('/add/:locale/:ns', addMissingKeysHandler(i18nextInstance));

// retrieve translations for a language & namespace
router.get('/:locale/:ns.json', getLocaleHandler(i18nextInstance));

// partner integration - post custom translations to the backend
router.post('/:locale', (req, res) => {
  const {locale} = req.params;
  return saveTranslationFile({
    locale: locale,
    fileContents: req.body,
  })
    .then(() => {
      return res.status(200).send();
    })
    .catch(createErrorHandler(res));
});

module.exports = router;
