/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as settingsApi from '../apiutils/SettingsAPIUtil';
import {apiRequest} from '../apiutils/ServiceAPIUtil';
import {assign} from 'lodash';
import {useNetworkContext} from '../contexts/NetworkContext';
import {useSnackbars} from '../hooks/useSnackbar';

export type TroubleshootFix = ({
  settingsChange?: {[string]: string},
  configChange?: {[string]: string},
  apiCallData?: {endpoint: string, data: {}},
  successMessage: string,
}) => Promise<void>;

/**
 * returns a function that attempts a fix based on problem provided.
 * Provides confirmation modal and snackbars based on success or fail.
 */
export default function useTroubleshootAutomation(): TroubleshootFix {
  const snackbars = useSnackbars();
  const {networkName} = useNetworkContext();

  return React.useCallback(
    async ({settingsChange, configChange, apiCallData, successMessage}) => {
      try {
        if (settingsChange) {
          await makeSettingsChange(settingsChange);
        }
        if (configChange) {
          await makeConfigChange();
        }
        if (apiCallData) {
          await makeApiCall(networkName, apiCallData);
        }
        snackbars.success(successMessage);
      } catch (error) {
        snackbars.error('Attempted fix failed');
        console.error(error);
      }
    },
    [snackbars, networkName],
  );
}

async function makeSettingsChange(settingChange) {
  const {current} = await settingsApi.getSettings();
  const newSettings = assign({}, current, settingChange);
  await settingsApi.postSettings(newSettings);
}

async function makeConfigChange() {}

async function makeApiCall(networkName, apiCallData) {
  const {endpoint, data} = apiCallData;
  await apiRequest({networkName, endpoint, data});
}
