/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import InputAdornment from '@material-ui/core/InputAdornment';
import MenuItem from '@material-ui/core/MenuItem';
import React, {useEffect} from 'react';
import TextField from '@material-ui/core/TextField';
import useForm from '../../hooks/useForm';
import {
  NETWORK_TEST_DEFS,
  NETWORK_TEST_PROTOCOLS,
  PROTOCOL,
  TEST_TYPE_CODES,
} from '../../constants/ScheduleConstants';
import {convertType} from '../../helpers/ObjectHelpers';

import type {IperfOptions} from '../../../shared/dto/NetworkTestTypes';

type Props = {
  onIperfOptionsUpdate: IperfOptions => void,
  initialOptions?: IperfOptions,
  type: $Keys<typeof NETWORK_TEST_DEFS>,
};

export default function NetworkTestAdvancedParams(props: Props) {
  const {onIperfOptionsUpdate, type, initialOptions} = props;

  const {formState, handleInputChange, updateFormState} = useForm({
    initialState: {
      ...convertType<IperfOptions>(NETWORK_TEST_DEFS[type].iperf_defaults),
      ...initialOptions,
    },
  });

  useEffect(() => {
    updateFormState(
      initialOptions
        ? {
            ...NETWORK_TEST_DEFS[type].iperf_defaults,
            ...initialOptions,
          }
        : NETWORK_TEST_DEFS[type].iperf_defaults,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, initialOptions]);

  useEffect(() => {
    const filteredOptions = Object.keys(formState)
      .filter(key => formState[key] && formState[key] > 0)
      .reduce((res, key) => {
        if (formState[key]) {
          res[key] = Number(formState[key]);
        }
        return res;
      }, {});
    onIperfOptionsUpdate(filteredOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  return (
    <FormGroup row={false}>
      <Grid container direction="column" spacing={2}>
        <Grid item container spacing={1}>
          <Grid item container direction="column" xs={6} spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Single iPerf Session Duration</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                id="iperfDuration"
                type="number"
                inputProps={{min: 1, max: 500}}
                variant="outlined"
                value={formState.timeSec}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleInputChange(val => ({timeSec: val}))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">seconds</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Grid item container direction="column" xs={6} spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Test Push Rate</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                type="number"
                inputProps={{min: 1, max: 500}}
                variant="outlined"
                value={formState.bitrate && formState.bitrate / 1000000}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleInputChange(val => ({
                  bitrate: val * 1000000,
                }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">Mbps</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item container direction="column" spacing={1}>
          <Grid item>
            <FormLabel component="legend">
              <span>iPerf Traffic Protocol</span>
            </FormLabel>
          </Grid>
          <Grid item>
            <TextField
              select
              disabled={
                type !== TEST_TYPE_CODES.SEQUENTIAL_NODE &&
                type !== TEST_TYPE_CODES.PARALLEL_NODE
              }
              variant="outlined"
              value={
                formState.protocol === NETWORK_TEST_PROTOCOLS.TCP
                  ? PROTOCOL.TCP
                  : PROTOCOL.UDP
              }
              InputLabelProps={{shrink: true}}
              margin="dense"
              fullWidth
              onChange={handleInputChange(val => ({
                protocol: NETWORK_TEST_PROTOCOLS[val],
              }))}>
              {Object.keys(NETWORK_TEST_PROTOCOLS).map(name => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        <Grid item container spacing={1}>
          <Grid item container direction="column" xs={6} spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Omit Seconds</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                type="number"
                inputProps={{min: 1, max: 500}}
                variant="outlined"
                value={formState.omitSec}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleInputChange(val => ({omitSec: val}))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">seconds</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Grid item container direction="column" xs={6} spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Interval Seconds</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                type="number"
                inputProps={{min: 1, max: 500}}
                variant="outlined"
                value={formState.intervalSec || ''}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleInputChange(val => ({intervalSec: val}))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">seconds</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item container spacing={1}>
          <Grid item container direction="column" xs={6} spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Window Size</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                type="number"
                inputProps={{min: 1, max: 500}}
                variant="outlined"
                value={formState.windowSize || ''}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={handleInputChange(val => ({windowSize: val}))}
              />
            </Grid>
          </Grid>
          {formState.protocol === NETWORK_TEST_PROTOCOLS.TCP && (
            <Grid item container direction="column" xs={6} spacing={1}>
              <Grid item>
                <FormLabel component="legend">
                  <span>Parallel Streams</span>
                </FormLabel>
              </Grid>
              <Grid item>
                <TextField
                  type="number"
                  inputProps={{min: 1, max: 500}}
                  variant="outlined"
                  value={formState.parallelStreams || ''}
                  InputLabelProps={{shrink: true}}
                  margin="dense"
                  fullWidth
                  onChange={handleInputChange(val => ({
                    parallelStreams: val,
                  }))}
                />
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </FormGroup>
  );
}
