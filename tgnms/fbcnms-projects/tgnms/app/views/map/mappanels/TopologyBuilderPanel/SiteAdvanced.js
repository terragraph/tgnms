/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TextField from '@material-ui/core/TextField';

import type {LocationType} from '@fbcnms/tg-nms/shared/types/Topology';

export default function SiteAdvanced({
  onChange,
  location,
}: {
  location: LocationType,
  onChange: ({[string]: number}) => void,
}) {
  const {latitude, longitude, altitude, accuracy} = location;

  const handleChange = React.useCallback(
    (ev, label: string) => {
      onChange({[label]: Number(ev.target.value)});
    },
    [onChange],
  );

  return (
    <>
      <TextField
        id="latitude"
        key="latitude"
        label="Latitude"
        data-testid="latitude-input"
        type="number"
        InputLabelProps={{shrink: true}}
        inputProps={{step: 0.00001}}
        margin="dense"
        fullWidth
        required={true}
        onChange={ev => handleChange(ev, 'latitude')}
        value={latitude}
      />
      <TextField
        id="longitude"
        key="longitude"
        label="Longitude"
        type="number"
        InputLabelProps={{shrink: true}}
        inputProps={{step: 0.00001}}
        margin="dense"
        fullWidth
        required={true}
        onChange={ev => handleChange(ev, 'longitude')}
        value={longitude}
      />
      <TextField
        id="altitude"
        key="altitude"
        label="Altitude"
        type="number"
        InputLabelProps={{shrink: true}}
        helperText="The altitude of the site (in meters)."
        inputProps={{step: 0.00001}}
        margin="dense"
        fullWidth
        required={true}
        onChange={ev => handleChange(ev, 'altitude')}
        value={altitude}
      />
      <TextField
        id="accuracy"
        key="accuracy"
        label="Accuracy"
        type="number"
        InputLabelProps={{shrink: true}}
        helperText="The accuracy of the given position (in meters)."
        inputProps={{step: 0.001}}
        margin="dense"
        fullWidth
        required={true}
        onChange={ev => handleChange(ev, 'accuracy')}
        value={accuracy}
      />
    </>
  );
}
