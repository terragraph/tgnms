/*
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';
import XHR from 'i18next-xhr-backend';

const backendOptions = {
  loadPath: '/translations/{{lng}}/{{ns}}.json',
  addPath: '/translations/add/{{lng}}/{{ns}}',
};

const SAVE_MISSING_TRANSLATIONS = window.CONFIG.env.SAVE_MISSING_TRANSLATIONS;

const {locale, fallbackLocale} = getLanguage();
i18next
  .use(XHR)
  .use(initReactI18next)
  .init({
    lng: locale,
    fallbackLng: fallbackLocale,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: backendOptions,
    keySeparator: false,
    debug: SAVE_MISSING_TRANSLATIONS,
    saveMissing: SAVE_MISSING_TRANSLATIONS,
  });

function getLanguage() {
  let i18n = window.CONFIG.i18n;
  if (!i18n) {
    i18n = {};
  }

  if (typeof i18n.locale !== 'string' || i18n.locale.trim() === '') {
    i18n.locale = 'en_US';
  }

  if (
    typeof i18n.fallbackLocale !== 'string' ||
    i18n.fallbackLocale.trim() === ''
  ) {
    i18n.fallbackLocale = 'en_US';
  }
  return i18n;
}

export default i18next;
