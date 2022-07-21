/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as settingsApi from '@fbcnms/tg-nms/app/apiutils/SettingsAPIUtil';
import {
  CONFIG_PARAM_MODE,
  FORM_CONFIG_MODES,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {assign} from 'lodash';
import {useNetworkContext} from '../contexts/NetworkContext';
import {useNodeConfig} from '@fbcnms/tg-nms/app/hooks/useNodeConfig';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import {useUpdateConfig} from '@fbcnms/tg-nms/app/hooks/useUpdateConfig';

export type TroubleshootFix = ({
  settingsChange?: {[string]: string},
  configChange?: {
    mode: $Values<typeof FORM_CONFIG_MODES>,
    drafts: {[string]: string | {[string]: string}},
  },
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
  const updateConfig = useUpdateConfig();
  const {configParams} = useNodeConfig({});

  return React.useCallback(
    async ({settingsChange, configChange, apiCallData, successMessage}) => {
      try {
        if (settingsChange) {
          await makeSettingsChange(settingsChange);
        }
        if (configChange) {
          await makeConfigChange(updateConfig, configChange, configParams);
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
    [snackbars, networkName, configParams, updateConfig],
  );
}

async function makeSettingsChange(settingChange) {
  const {current} = await settingsApi.getSettings();
  const newSettings = assign({}, current, settingChange);
  await settingsApi.postSettings(newSettings);
}

async function makeConfigChange(updateConfig, configChange, configParams) {
  const {mode, drafts} = configChange;
  const currentConfig = configParams[CONFIG_PARAM_MODE[mode]];
  if (!currentConfig) {
    throw 'No current config';
  }
  if (drafts != undefined && currentConfig != undefined) {
    await updateConfig[mode.toLowerCase()]({
      drafts,
      currentConfig,
    });
  }
}

async function makeApiCall(networkName, apiCallData) {
  const {endpoint, data} = apiCallData;
  await apiRequest({networkName, endpoint, data});
}
