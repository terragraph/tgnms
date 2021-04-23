/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as turf from '@turf/turf';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {
  LINES,
  MEASURABLE,
  POLYS,
} from '@fbcnms/tg-nms/app/constants/GeoJSONConstants';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import type {GeoFeature} from '@turf/turf';

const MIN_LEN_KM = 2;
const MAX_AREA_M = 1000000; // maximum m^2 before we convert to km^2

export default function Measurement({feature}: {feature: GeoFeature}) {
  const geometryType = feature?.geometry?.type;
  if (!(geometryType && MEASURABLE.has(geometryType) && feature)) {
    return null;
  }

  return (
    <Grid item container direction="column">
      {LINES.has(geometryType) && <FeatureLength feature={feature} />}
      {POLYS.has(geometryType) && <FeatureArea feature={feature} />}
    </Grid>
  );
}

function FeatureLength({feature}: {feature: GeoFeature}) {
  const lengthKM = turf.length(feature);
  const lengthString = React.useMemo(() => {
    if (lengthKM >= MIN_LEN_KM) {
      return `${formatNumber(lengthKM)} km`;
    }
    const lengthM = turf.convertLength(lengthKM, 'kilometers', 'meters');
    return `${formatNumber(lengthM, 1)} m`;
  }, [lengthKM]);

  return (
    <Grid item container xs={12} spacing={2}>
      <Grid item>
        <Typography variant="body2" color="textSecondary">
          Length:
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body2">
          <span data-testid="feature-length">{lengthString}</span>
        </Typography>
      </Grid>
    </Grid>
  );
}

export function FeatureArea({feature}: {feature: GeoFeature}) {
  const areaM = turf.area(feature);
  const areaString = React.useMemo(() => {
    if (areaM < MAX_AREA_M) {
      return `${formatNumber(areaM, 1)} sq m`;
    }
    const areaKM = turf.convertArea(areaM, 'meters', 'kilometers');
    return `${formatNumber(areaKM)} sq km`;
  }, [areaM]);

  return (
    <Grid item container xs={12} spacing={2}>
      <Grid item>
        <Typography variant="body2" color="textSecondary">
          Area:
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body2">
          <span data-testid="feature-area">{areaString}</span>
        </Typography>
      </Grid>
    </Grid>
  );
}
