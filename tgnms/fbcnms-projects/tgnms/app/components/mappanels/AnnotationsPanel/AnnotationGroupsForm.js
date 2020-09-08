/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApi from '../../../apiutils/MapAPIUtil';
import * as turf from '@turf/turf';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CreateAnnotationGroupForm from './CreateAnnotationGroupForm';
import Grid from '@material-ui/core/Grid';
import ImportAnnotationKMLForm from './ImportAnnotationKMLForm';
import MenuIconButton from '../../common/MenuIconButton';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Typography from '@material-ui/core/Typography';
import {
  ANNOTATION_DEFAULT_GROUP,
  useMapAnnotationContext,
} from '../../../contexts/MapAnnotationContext';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '../../../contexts/MapContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';
import type {MapAnnotationGroupIdent} from '../../../../shared/dto/MapAnnotations';

const MODE = {
  DEFAULT: 'default',
  NEW_LAYER: 'new_layer',
  IMPORT: 'import',
};

export default function AnnotationGroupsForm() {
  const {mapboxRef} = useMapContext();
  const {networkName} = useNetworkContext();
  const {current, loadGroup, loadGroups, groups} = useMapAnnotationContext();

  const [mode, setMode] = React.useState(MODE.DEFAULT);
  React.useEffect(() => {
    loadGroups();
  }, [networkName, loadGroups]);

  const handleGroupSelect = React.useCallback(
    async (ident: MapAnnotationGroupIdent) => {
      if (current?.name !== ident.name) {
        const group = await loadGroup(ident);
        if (!(group && group.geojson)) {
          return;
        }
        // fly the camera to fit the bounding box of the group's features
        const bbox = turf.bbox(group.geojson);
        if (!(bbox && bbox.length >= 4)) {
          return;
        }
        const [lon1, lat1, lon2, lat2] = bbox;
        mapboxRef?.fitBounds([
          [lon1, lat1],
          [lon2, lat2],
        ]);
      }
    },
    [loadGroup, current, mapboxRef],
  );

  const handleCreateLayer = React.useCallback(
    () => setMode(MODE.NEW_LAYER),
    [],
  );
  const handleImportKML = React.useCallback(() => setMode(MODE.IMPORT), []);

  return (
    <>
      <Grid item container direction="column" spacing={2} wrap="nowrap">
        <Grid item>
          <Typography variant="h5">Annotation Layers</Typography>
        </Grid>
        {mode === MODE.DEFAULT && (
          <Grid item container justify="space-between">
            <Button
              variant="contained"
              disableElevation
              onClick={handleCreateLayer}>
              New Layer
            </Button>
            <Button
              variant="contained"
              disableElevation
              onClick={handleImportKML}>
              Import KML
            </Button>
          </Grid>
        )}
        {mode === MODE.NEW_LAYER && (
          <CreateAnnotationGroupForm onClose={() => setMode(MODE.DEFAULT)} />
        )}
        {mode === MODE.IMPORT && (
          <ImportAnnotationKMLForm onClose={() => setMode(MODE.DEFAULT)} />
        )}
        <Box mb={1}>
          <Grid container item direction="column" xs={12} wrap="nowrap">
            {groups.map(group => (
              <GroupLayer
                key={group.name}
                group={group}
                isSelected={current?.name === group.name}
                onSelect={handleGroupSelect}
              />
            ))}
          </Grid>
        </Box>
      </Grid>
    </>
  );
}

type GroupLayerProps = {|
  group: MapAnnotationGroupIdent,
  isSelected: boolean,
  onSelect: MapAnnotationGroupIdent => void | Promise<void>,
|};
const useGroupLayerStyles = makeStyles(theme => ({
  group: {
    cursor: 'pointer',
    backgroundColor: ({isSelected}: $Shape<GroupLayerProps>) =>
      isSelected ? theme.palette.grey[200] : '',
    padding: `${theme.spacing(1)}px ${theme.spacing(1)}px`,
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
    },
  },
}));
function GroupLayer({group, onSelect, isSelected}: GroupLayerProps) {
  const {name, topologyName} = group ?? {};
  const {loadGroups, loadGroup} = useMapAnnotationContext();
  const classes = useGroupLayerStyles({isSelected});
  const handleSelect = React.useCallback(() => {
    onSelect(group);
  }, [group, onSelect]);
  const handleDeleteLayer = React.useCallback(async () => {
    await mapApi.deleteAnnotationGroup({
      networkName: topologyName,
      group: {name},
    });
    await loadGroups();
  }, [topologyName, name, loadGroups]);
  const handleDuplicateLayer = React.useCallback(async () => {
    const newName = `${name} - copy`;
    await mapApi.duplicateAnnotationGroup({
      networkName: topologyName,
      groupName: name,
      newName,
    });
    await loadGroups();
    await loadGroup({name: newName});
  }, [name, loadGroups, loadGroup, topologyName]);

  return (
    <Grid
      item
      container
      justify="space-between"
      wrap="nowrap"
      xs={12}
      className={classes.group}
      onClick={handleSelect}>
      <Grid item xs={9}>
        <Typography variant="subtitle1">{name}</Typography>
      </Grid>
      <Grid
        item
        wrap="nowrap"
        xs={3}
        container
        justify="flex-end"
        alignItems="flex-start">
        <Box mr={-1}>
          <MenuIconButton
            id="annotation-layers-menu"
            size="small"
            edge="end"
            icon={<MoreVertIcon fontSize="small" />}>
            {group.name !== ANNOTATION_DEFAULT_GROUP && (
              <MenuItem onClick={handleDeleteLayer}>Delete Layer</MenuItem>
            )}
            <MenuItem onClick={handleDuplicateLayer}>Duplicate Layer</MenuItem>
          </MenuIconButton>
        </Box>
      </Grid>
    </Grid>
  );
}
