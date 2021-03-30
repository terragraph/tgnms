/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
} from '../../constants/ConfigConstants';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

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
