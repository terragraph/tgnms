/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as mapApi from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';
import * as turf from '@turf/turf';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormatShapesIcon from '@material-ui/icons/FormatShapes';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import NotListedLocationIcon from '@material-ui/icons/NotListedLocation';
import PlaceIcon from '@material-ui/icons/Place';
import PublishIcon from '@material-ui/icons/Publish';
import TextField from '@material-ui/core/TextField';
import TimelineIcon from '@material-ui/icons/Timeline';
import Typography from '@material-ui/core/Typography';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  LINES,
  POINTS,
  POLYS,
} from '@fbcnms/tg-nms/app/constants/GeoJSONConstants';
import {kml as kmlToGeojson} from '@mapbox/togeojson';
import {parseAndCleanKML} from '@fbcnms/tg-nms/app/helpers/KMLImport';
import {useAnnotationGroups} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {GeoFeature, GeoGeometryType} from '@turf/turf';

type KMLAnnotationImport = {
  fileName: string,
  groupName: string,
  features: Array<GeoFeature>,
};

export default function ImportAnnotationKMLForm({
  onClose,
}: {
  onClose: () => void,
}) {
  const {loadGroups, loadGroup} = useAnnotationGroups();
  const {networkName} = useNetworkContext();
  const {isLoading, isError, message, setMessage, setState} = useTaskState();
  const [importData, setImportData] = React.useState<?KMLAnnotationImport>(
    null,
  );

  const handleFileSelected = React.useCallback(
    (e: SyntheticInputEvent<HTMLInputElement>) => {
      const readFile = async () => {
        try {
          const file = e?.target?.files[0];
          const fileText = await new Promise((res, rej) => {
            const fileReader = new FileReader();
            fileReader.onloadend = () => {
              if (typeof fileReader.result === 'string') {
                res(fileReader.result);
              }
            };
            fileReader.onerror = rej;
            fileReader.readAsText(file);
          });
          const kml = parseAndCleanKML(fileText);
          const features = kmlToGeojson(kml).features;
          setImportData({
            features,
            fileName: file?.name,
            groupName: file?.name?.split('.')[0],
          });
        } catch (err) {
          setState(TASK_STATE.ERROR);
        }
      };
      readFile();
    },
    [setImportData, setState],
  );
  const handleSubmit = React.useCallback(
    async e => {
      e.preventDefault();
      try {
        setState(TASK_STATE.LOADING);
        if (
          !importData ||
          importData.groupName == null ||
          importData.groupName.trim() === ''
        ) {
          setState(TASK_STATE.ERROR);
          setMessage('Name required');
          return;
        }
        await mapApi.saveAnnotationGroup({
          networkName,
          group: {
            name: importData?.groupName,
            geojson: JSON.stringify(
              turf.featureCollection(importData.features),
            ),
          },
        });
        await loadGroups();
        await loadGroup({name: importData?.groupName});
        onClose();
      } catch (err) {
        setState(TASK_STATE.ERROR);
        setMessage(err?.message ?? 'Error');
      }
    },
    [
      onClose,
      loadGroups,
      loadGroup,
      setState,
      setMessage,
      importData,
      networkName,
    ],
  );
  return (
    <Grid
      component="form"
      onSubmit={handleSubmit}
      item
      container
      xs={12}
      direction="column"
      wrap="nowrap"
      spacing={2}>
      <Grid item container justifyContent="center">
        {isLoading && <CircularProgress />}
        {isError && (
          <Alert color="error" severity="error">
            {message}
          </Alert>
        )}
      </Grid>
      <Grid item container xs={12} justifyContent="center">
        <Button
          variant="contained"
          disabled={isLoading}
          color="primary"
          component="label"
          endIcon={<PublishIcon />}>
          Select File
          <Input
            data-testid="fileInput"
            onChange={handleFileSelected}
            type="file"
            inputProps={{accept: '.xml, .kml'}}
            style={{display: 'none'}}
          />
        </Button>
      </Grid>
      <Grid item>
        <TextField
          label="New Layer Name"
          name="name"
          fullWidth
          value={importData?.groupName ?? ''}
          onChange={e => {
            // cache value because of event pooling
            const val = e.target.value;
            setImportData(cur => ({
              ...(cur || {}: $Shape<KMLAnnotationImport>),
              groupName: val,
            }));
          }}
        />
      </Grid>
      {importData && <FeaturePreview features={importData.features} />}
      <Grid item container justifyContent="flex-end" spacing={1}>
        <Grid item>
          <Button variant="outlined" size="small" onClick={onClose}>
            Cancel
          </Button>
        </Grid>
        <Grid item>
          <Button
            disabled={importData == null}
            variant="contained"
            color="primary"
            size="small"
            type="submit">
            Import
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}

function FeaturePreview({features}: {features: Array<GeoFeature>}) {
  return (
    <Grid item xs={12} container direction="column">
      {features?.map((feature, idx) => (
        <Grid
          key={feature.id || feature.properties?.name || idx.toString()}
          item
          xs={12}
          container
          wrap="nowrap"
          spacing={1}>
          <Grid item xs={2}>
            <GeometryIcon type={turf.getType(feature)} />
          </Grid>
          <Grid item xs={10}>
            <Typography variant="body2">{feature.properties.name}</Typography>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
}

function GeometryIcon({type}: {type: GeoGeometryType}) {
  if (typeof type === 'string' && type.trim() !== '') {
    if (LINES.has(type)) {
      return <TimelineIcon color="secondary" />;
    }
    if (POLYS.has(type)) {
      return <FormatShapesIcon color="secondary" />;
    }
    if (POINTS.has(type)) {
      return <PlaceIcon color="secondary" />;
    }
  }
  return <NotListedLocationIcon color="secondary" />;
}
