/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import ConfigContentError from './ConfigContentError';
import ConfigJson from './ConfigJson';
import ConfigQuickSettingsForm from './ConfigQuickSettingsForm';
import ConfigTable from './ConfigTable';
import React from 'react';
import {
  CONFIG_PARAM_MODE,
  EDITOR_OPTIONS,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

type Props = {
  contentDisplayMode: $Values<typeof EDITOR_OPTIONS>,
  hideDeprecatedFields: boolean,
};

export default function ConfigContent(props: Props) {
  const {contentDisplayMode, hideDeprecatedFields} = props;
  const {configParams, editMode} = useConfigTaskContext();
  const {baseConfigs} = configParams;

  if (
    baseConfigs === null ||
    configParams[CONFIG_PARAM_MODE[editMode]] === null
  ) {
    return <ConfigContentError />;
  }
  switch (contentDisplayMode) {
    case EDITOR_OPTIONS.JSON:
      return <ConfigJson />;
    case EDITOR_OPTIONS.FORM:
      return <ConfigQuickSettingsForm />;
    case EDITOR_OPTIONS.TABLE:
      return <ConfigTable hideDeprecatedFields={hideDeprecatedFields} />;
  }
  return null;
}
