/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as fs from 'fs';
import {TRANSLATIONS_DEFAULT_LOCALE} from '../config';

import {i18nBuilder, makeLocaleDirectory} from '@fbcnms/i18n';

export const i18nextInstance = i18nBuilder({
  preload: [TRANSLATIONS_DEFAULT_LOCALE],
  fallbackLng: TRANSLATIONS_DEFAULT_LOCALE,
});

/**
 * Saves a translation file for a custom locale to the configured locales dir.
 **/
export function saveTranslationFile({
  locale,
  fileContents,
}: {
  locale: string,
  fileContents: Object,
}) {
  makeLocaleDirectory(
    {
      locale: locale,
    },
    i18nextInstance,
  );

  const filepath = i18nextInstance.services.interpolator.interpolate(
    i18nextInstance.options.backend.addPath,
    {
      lng: locale,
      ns: 'translation',
    },
  );

  return new Promise<void>((res, rej) => {
    /**
     * using raw filesystem because the i18next backendConnector persists
     * key by key. This can cause problems if there are nested keys.
     **/
    fs.writeFile(
      filepath,
      JSON.stringify(fileContents),
      {encoding: 'utf-8'},
      err => {
        if (err) {
          return rej(err);
        }
        return res();
      },
    );
  }).then(() => i18nextInstance.reloadResources(locale));
}
