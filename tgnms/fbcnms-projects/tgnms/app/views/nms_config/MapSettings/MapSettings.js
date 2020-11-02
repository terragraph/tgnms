/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApi from '../../../apiutils/MapAPIUtil';
import Box from '@material-ui/core/Box';
import CircularProgress from '@material-ui/core/CircularProgress';
import DeleteIcon from '@material-ui/icons/Delete';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import MapProfileForm from './MapProfileForm';
import MapSettingsLayout from './MapSettingsLayout';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import useLiveRef from '../../../hooks/useLiveRef';
import useTaskState, {TASK_STATE} from '../../../hooks/useTaskState';
import {DEFAULT_MAP_PROFILE} from '../../../constants/MapProfileConstants';
import {useNetworkListContext} from '../../../contexts/NetworkListContext';
import type {Props as IconButtonProps} from '@material-ui/core/IconButton/IconButton';
import type {MapProfile} from '../../../../shared/dto/MapProfile';

export default function MapSettings() {
  const {networkList} = useNetworkListContext();
  const [profiles, setProfiles] = React.useState([]);
  const [selectedName, setSelectedName] = React.useState(
    DEFAULT_MAP_PROFILE.name,
  );
  const isDefaultSelected = selectedName === DEFAULT_MAP_PROFILE.name;
  const networkNames = React.useMemo(() => Object.keys(networkList), [
    networkList,
  ]);
  const currentProfile: MapProfile = React.useMemo(() => {
    const curr = profiles.find(p => p.name === selectedName);
    if (curr != null) {
      return curr;
    }
    const unassignedNetworks = getUnassignedNetworks(networkNames, profiles);
    const defaultCurr = {...DEFAULT_MAP_PROFILE, networks: unassignedNetworks};
    // if no profile is selected, show the default profile
    return defaultCurr;
  }, [selectedName, profiles, networkNames]);
  const [dirtyProfile, setDirtyProfile] = React.useState<?MapProfile>(null);
  const {isLoading, setState, setMessage} = useTaskState();
  const loadProfiles = React.useCallback(async () => {
    try {
      setState(TASK_STATE.LOADING);
      const _profiles = await mapApi.getProfiles();
      setProfiles(_profiles);
      setState(TASK_STATE.SUCCESS);
    } catch (err) {
      setState(TASK_STATE.ERROR);
      setMessage(err.message);
    }
  }, [setProfiles, setState, setMessage]);
  const loadProfilesRef = useLiveRef(loadProfiles);

  // load the profiles when the component mounts
  React.useEffect(() => {
    loadProfilesRef.current();
  }, [loadProfilesRef]);
  // clear out the form changes if the user changes profiles
  React.useEffect(() => {
    setDirtyProfile(null);
  }, [selectedName, setDirtyProfile]);
  const handleDeleteProfile = React.useCallback(async () => {
    try {
      setState(TASK_STATE.LOADING);
      await mapApi.deleteProfile(currentProfile.id);
      await loadProfiles();
      setSelectedName(DEFAULT_MAP_PROFILE.name);
    } catch (err) {
      setState(TASK_STATE.ERROR);
      setMessage(err.message);
    }
  }, [currentProfile, setState, setMessage, setSelectedName, loadProfiles]);
  const handleDuplicateProfile = React.useCallback(async () => {
    try {
      setState(TASK_STATE.LOADING);
      const newName = `${currentProfile.name} - Copy`;
      const newProfile = await mapApi.createProfile({
        name: newName,
        data: currentProfile.data,
      });
      await loadProfiles();
      setSelectedName(newProfile.name);
    } catch (err) {
      setState(TASK_STATE.ERROR);
      setMessage(err.message);
    }
  }, [setState, currentProfile, loadProfiles, setSelectedName, setMessage]);

  const saveProfile = React.useCallback(async () => {
    try {
      setState(TASK_STATE.LOADING);
      if (dirtyProfile == null) {
        throw new Error('Profile not changed');
      }
      setSelectedName(_ => dirtyProfile.name);
      await mapApi.saveProfile(dirtyProfile);
      setDirtyProfile(null);
      await loadProfiles();
      setState(TASK_STATE.SUCCESS);
    } catch (err) {
      setState(TASK_STATE.ERROR);
      setMessage(err.message);
    }
  }, [
    setState,
    setSelectedName,
    setDirtyProfile,
    loadProfiles,
    setMessage,
    dirtyProfile,
  ]);

  const handleProfileFormUpdate = React.useCallback(
    (p: MapProfile) => {
      setDirtyProfile(p);
    },
    [setDirtyProfile],
  );
  const handleSubmit = React.useCallback(
    (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      saveProfile();
    },
    [saveProfile],
  );

  const isFormDisabled = isDefaultSelected || dirtyProfile == null || isLoading;
  return (
    <MapSettingsLayout
      title="Map Profiles"
      description="Reusable settings for the Network Map."
      isSubmitDisabled={isFormDisabled}
      onSubmit={handleSubmit}
      onCancel={() => setSelectedName(DEFAULT_MAP_PROFILE.name)}>
      <Grid item container xs={12} direction="column" spacing={4}>
        <Grid item xs={8} container alignItems="flex-end" spacing={2}>
          <Grid item xs={6}>
            <TextField
              select
              fullWidth
              value={selectedName}
              label="Profiles"
              id="profiles"
              onChange={e => setSelectedName(e.target.value)}>
              <MenuItem value={DEFAULT_MAP_PROFILE.name}>
                {DEFAULT_MAP_PROFILE.name}
              </MenuItem>
              {profiles.map(p => (
                <MenuItem key={p.name} value={p.name}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} container wrap="nowrap" alignItems="flex-end">
            <Grid item>
              <ProfileButton
                tooltip="Duplicate Profile"
                onClick={handleDuplicateProfile}
                disabled={isLoading}
                data-testid="duplicate-profile">
                <FileCopyIcon />
              </ProfileButton>
            </Grid>
            {!isDefaultSelected && (
              <Grid item>
                <ProfileButton
                  onClick={handleDeleteProfile}
                  disabled={isLoading}
                  tooltip={
                    <>
                      Delete Profile - Networks using this profile will be reset
                      back to the default profile
                    </>
                  }
                  data-testid="delete-profile">
                  <DeleteIcon />
                </ProfileButton>
              </Grid>
            )}
            {isLoading && (
              <Grid item>
                <CircularProgress size={24} />
              </Grid>
            )}
          </Grid>
        </Grid>
        <MapProfileForm
          isDisabled={isDefaultSelected || isLoading}
          isDefault={isDefaultSelected}
          profile={currentProfile}
          onUpdate={handleProfileFormUpdate}
        />
      </Grid>
    </MapSettingsLayout>
  );
}

function getUnassignedNetworks(
  networkNames: Array<string>,
  profiles: Array<MapProfile>,
): Array<string> {
  const assignedNetworks = new Set();
  for (const p of profiles) {
    for (const n of p.networks) {
      assignedNetworks.add(n);
    }
  }
  const unassignedNetworks = [];
  for (const net of networkNames) {
    if (!assignedNetworks.has(net)) {
      unassignedNetworks.push(net);
    }
  }
  return unassignedNetworks;
}

type ProfileButtonProps = {
  ...IconButtonProps,
  tooltip: React.Node,
  children: React.Node,
};
function ProfileButton({tooltip, children, ...btnProps}: ProfileButtonProps) {
  return (
    <Tooltip title={tooltip} placement="top-start">
      {/** offset by the button's padding so it's aligned with the
              textbox */}
      <Box mb={-0.5}>
        <IconButton
          size="small"
          {...(btnProps: $Rest<ProfileButtonProps, IconButtonProps>)}>
          {children}
        </IconButton>
      </Box>
    </Tooltip>
  );
}
