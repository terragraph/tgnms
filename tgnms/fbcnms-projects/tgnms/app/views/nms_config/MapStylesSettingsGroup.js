/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import FormHelperText from '@material-ui/core/FormHelperText';
import SettingInput from './SettingInput';
import SettingsGroup from './SettingsGroup';
import {useSettingsFormContext} from './SettingsFormContext';

export default function MapStylesSettingsGroup() {
  const {formState} = useSettingsFormContext();
  const {MAPSTYLE_MAPBOX_ENABLED, MAPBOX_ACCESS_TOKEN} = formState;
  const showTokenRequiredMsg =
    MAPSTYLE_MAPBOX_ENABLED === 'true' &&
    (MAPBOX_ACCESS_TOKEN == null || MAPBOX_ACCESS_TOKEN.trim() == '');
  return (
    <SettingsGroup
      title="Map Styles"
      description="Configure where Mapbox map styles are fetched from">
      <SettingInput
        setting="MAPSTYLE_FACEBOOK_ENABLED"
        label="Enable Facebook map tiles"
        isFeatureToggle
      />
      <SettingInput
        setting="MAPSTYLE_MAPBOX_ENABLED"
        label="Enable Mapbox map tiles"
        isFeatureToggle
        helperText={
          showTokenRequiredMsg && (
            <FormHelperText error>
              Mapbox access token is required
            </FormHelperText>
          )
        }
      />
      <SettingInput setting="MAPBOX_ACCESS_TOKEN" label="Mapbox access token" />
      <SettingInput
        setting="TILE_STYLE"
        label="Custom tile URLs"
        helperText={
          'Format: ' +
          'Custom 1=https://style.com/1,Custom 2=https://style.com/2'
        }
      />
    </SettingsGroup>
  );
}
