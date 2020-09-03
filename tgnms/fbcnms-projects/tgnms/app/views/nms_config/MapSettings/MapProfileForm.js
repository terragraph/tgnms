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
import InputLabel from '@material-ui/core/InputLabel';
import McsTableEditor from './McsTableEditor';
import NetworkSelect from '../../../components/common/NetworkSelect';
import SettingsGroup from '../SettingsGroup';
import TextField from '@material-ui/core/TextField';
import useForm from '../../../hooks/useForm';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '../../../helpers/ObjectHelpers';
import type {MapProfile} from '../../../../shared/dto/MapProfile';
import type {McsLinkBudget} from '../../../../shared/dto/MapProfile';

export type MapProfileUpdate = {
  id: number,
  name: string,
  mcsTable: {[string]: McsLinkBudget},
  networks: Array<string>,
};
export type HandleRangeChange = {
  (mcs: number, rangeMeters: number): void,
};

const useStyles = makeStyles(theme => ({
  formControl: {
    margin: theme.spacing(1),
    marginLeft: 0,
    minWidth: 120,
    maxWidth: 300,
  },
}));
export default function MapProfileForm({
  isDisabled,
  isDefault,
  profile,
  onUpdate,
}: {
  isDefault: boolean,
  isDisabled: boolean,
  profile: MapProfile,
  onUpdate: MapProfile => void | Promise<void>,
}) {
  const classes = useStyles();
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
    (networks: Array<string>) => {
      updateFormState({
        networks,
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
        <Grid item>
          <TextField
            disabled={isDisabled}
            value={formState.name}
            onChange={handleInputChange(val => ({name: val}))}
            label="Name"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl className={classes.formControl}>
            <InputLabel>Networks</InputLabel>
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
    </Grid>
  );
}

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
    },
  };
}
