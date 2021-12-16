/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Alert from '@material-ui/lab/Alert';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import McsTableEditor from './McsTableEditor';
import NetworkSelect from '@fbcnms/tg-nms/app/components/common/NetworkSelect';
import RemoteOverlaysEditor from './RemoteOverlaysEditor';
import SettingsGroup from '../SettingsGroup';
import TextField from '@material-ui/core/TextField';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';
import type {McsLinkBudget} from '@fbcnms/tg-nms/shared/dto/MapProfile';
import type {RemoteOverlay} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';

export type HandleRangeChange = {
  (mcs: number, rangeMeters: number): void,
};

type Props = {|
  isDefault: boolean,
  isDisabled: boolean,
  profile: MapProfile,
  onUpdate: MapProfile => void | Promise<void>,
|};

export default function MapProfileForm({
  isDisabled,
  isDefault,
  profile,
  onUpdate,
}: Props) {
  const {
    formState,
    handleInputChange,
    updateFormState,
    setFormState,
  } = useForm<MapProfileUpdate>({
    initialState: fromMapProfile(profile),
    onFormUpdated: update => {
      onUpdate(toMapProfile(update));
    },
  });
  React.useEffect(() => {
    setFormState(fromMapProfile(profile));
  }, [profile, setFormState]);

  const handleRangeChange = React.useCallback<HandleRangeChange>(
    (mcs: number, rangeMeters: number) => {
      const def = formState.mcsTable[mcs.toString()];
      const update = {...def, rangeMeters};
      updateFormState({
        mcsTable: {
          ...formState.mcsTable,
          [mcs]: update,
        },
      });
    },
    [updateFormState, formState],
  );

  const handleNetworkSelectionChange = React.useCallback(
    (networks: Array<string> | string) => {
      updateFormState({
        networks: Array.isArray(networks) ? networks : [networks],
      });
    },
    [updateFormState],
  );

  const handleOverlaysChange = React.useCallback(
    (overlays: Array<RemoteOverlay>) => {
      updateFormState({
        remoteOverlays: overlays,
      });
    },
    [updateFormState],
  );

  return (
    <Grid item container direction="column" spacing={4}>
      <SettingsGroup title={profile.name}>
        {isDefault && (
          <Grid item>
            <Alert color="info" severity="info">
              To edit the map profile, duplicate the Default profile or select
              an existing profile.
            </Alert>
          </Grid>
        )}
        <Grid item xs={6}>
          <TextField
            fullWidth
            disabled={isDisabled}
            value={formState.name}
            onChange={handleInputChange(val => ({name: val}))}
            label="Name"
            id="name"
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth>
            <NetworkSelect
              value={formState.networks}
              onChange={handleNetworkSelectionChange}
            />
          </FormControl>
        </Grid>
      </SettingsGroup>
      <McsTableEditor
        mcsTable={formState.mcsTable}
        onRangeChange={handleRangeChange}
        disabled={isDefault}
      />
      {!isDefault && (
        <RemoteOverlaysEditor
          overlays={formState.remoteOverlays}
          onChange={handleOverlaysChange}
        />
      )}
    </Grid>
  );
}

export type MapProfileUpdate = {
  id: number,
  name: string,
  mcsTable: {[string]: McsLinkBudget},
  remoteOverlays: Array<RemoteOverlay>,
  networks: Array<string>,
};

function fromMapProfile(profile: MapProfile): MapProfileUpdate {
  const {id, name, networks} = profile;
  return {
    id,
    name,
    networks,
    mcsTable: (profile.data.mcsTable ?? []).reduce((lookup, def) => {
      lookup[def.mcs] = def;
      return lookup;
    }, {}),
    remoteOverlays: profile.data.remoteOverlays ?? [],
  };
}
function toMapProfile(update: MapProfileUpdate): MapProfile {
  const {id, name, networks} = update;
  return {
    id,
    name,
    networks,
    data: {
      mcsTable: objectValuesTypesafe(update.mcsTable),
      remoteOverlays: update.remoteOverlays,
    },
  };
}
