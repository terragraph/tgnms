/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApi from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import * as turf from '@turf/turf';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CreateAnnotationGroupForm from './CreateAnnotationGroupForm';
import Grid from '@material-ui/core/Grid';
import ImportAnnotationKMLForm from './ImportAnnotationKMLForm';
import MenuIconButton from '@fbcnms/tg-nms/app/components/common/MenuIconButton';
import MenuItem from '@material-ui/core/MenuItem';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import RenameAnnotationGroupForm from './RenameAnnotationGroupForm';
import Typography from '@material-ui/core/Typography';
import {
  ANNOTATION_DEFAULT_GROUP,
  useAnnotationGroups,
  useMapAnnotationContext,
} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {MapAnnotationGroupIdent} from '@fbcnms/tg-nms/shared/dto/MapAnnotations';

const MODE = {
  DEFAULT: 'default',
  NEW_LAYER: 'new_layer',
  IMPORT: 'import',
  RENAME_LAYER: 'rename_layer',
};
const useStyles = makeStyles(theme => ({
  root: {
    paddingTop: theme.spacing(1),
  },
}));
export default function AnnotationGroupsForm() {
  const classes = useStyles();
  const {mapboxRef} = useMapContext();
  const {networkName} = useNetworkContext();
  const {current} = useMapAnnotationContext();
  const {groups, loadGroup, loadGroups} = useAnnotationGroups();
  const [mode, setMode] = React.useState(MODE.DEFAULT);
  // group currently being edited. not necessarily the "current" group
  const [
    groupMenuTarget,
    setgroupMenuTarget,
  ] = React.useState<?MapAnnotationGroupIdent>(null);
  React.useEffect(() => {
    loadGroups();
  }, [networkName, loadGroups]);

  const resetMode = React.useCallback(() => {
    setMode(MODE.DEFAULT);
    setgroupMenuTarget(null);
  }, []);

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
        mapboxRef?.fitBounds(
          [
            [lon1, lat1],
            [lon2, lat2],
          ],
          {maxZoom: 15},
        );
      }
    },
    [loadGroup, current, mapboxRef],
  );
  const handleRenameGroup = React.useCallback(
    group => {
      setgroupMenuTarget(group);
      setMode(MODE.RENAME_LAYER);
    },
    [setgroupMenuTarget],
  );

  return (
    <Grid container direction="column" wrap="nowrap" className={classes.root}>
      {mode === MODE.DEFAULT && (
        <Grid container justifyContent="space-between" spacing={3}>
          <Grid item xs={6}>
            <Button
              variant="contained"
              disableElevation
              onClick={() => setMode(MODE.NEW_LAYER)}
              fullWidth>
              New Layer
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="contained"
              disableElevation
              onClick={() => setMode(MODE.IMPORT)}
              fullWidth>
              Import KML
            </Button>
          </Grid>
        </Grid>
      )}
      {mode === MODE.NEW_LAYER && (
        <CreateAnnotationGroupForm onClose={resetMode} />
      )}
      {mode === MODE.RENAME_LAYER && (
        <RenameAnnotationGroupForm
          onClose={resetMode}
          group={groupMenuTarget}
        />
      )}
      {mode === MODE.IMPORT && <ImportAnnotationKMLForm onClose={resetMode} />}
      <Box mb={1} mt={3}>
        <Grid container item direction="column" xs={12} wrap="nowrap">
          {groups.map(group => (
            <GroupLayer
              key={group.name}
              group={group}
              isSelected={current?.name === group.name}
              onSelect={handleGroupSelect}
              onRename={handleRenameGroup}
            />
          ))}
        </Grid>
      </Box>
    </Grid>
  );
}

type GroupLayerProps = {|
  group: MapAnnotationGroupIdent,
  isSelected: boolean,
  onSelect: MapAnnotationGroupIdent => void | Promise<void>,
  onRename: MapAnnotationGroupIdent => void | Promise<void>,
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
  groupName: {
    textTransform: 'capitalize',
  },
}));
function GroupLayer({group, isSelected, onSelect, onRename}: GroupLayerProps) {
  const {name, topologyName} = group ?? {};
  const {loadGroups, loadGroup} = useAnnotationGroups();
  const classes = useGroupLayerStyles({isSelected});
  const handleSelect = React.useCallback(() => {
    onSelect(group);
  }, [group, onSelect]);
  const handleRenameLayer = React.useCallback(() => {
    onRename(group);
  }, [onRename, group]);
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
      justifyContent="space-between"
      wrap="nowrap"
      xs={12}
      className={classes.group}
      onClick={handleSelect}>
      <Grid item xs={9}>
        <Typography className={classes.groupName} variant="subtitle1">
          {name}
        </Typography>
      </Grid>
      <Grid
        item
        wrap="nowrap"
        xs={3}
        container
        justifyContent="flex-end"
        alignItems="flex-start">
        <Box mr={-1}>
          <MenuIconButton
            id="annotation-layers-menu"
            size="small"
            edge="end"
            icon={<MoreVertIcon fontSize="small" />}>
            {group.name !== ANNOTATION_DEFAULT_GROUP && [
              <MenuItem key="delete" onClick={handleDeleteLayer}>
                Delete Layer
              </MenuItem>,
              <MenuItem key="rename" onClick={handleRenameLayer}>
                Rename Layer
              </MenuItem>,
            ]}
            <MenuItem onClick={handleDuplicateLayer}>Duplicate Layer</MenuItem>
          </MenuIconButton>
        </Box>
      </Grid>
    </Grid>
  );
}
