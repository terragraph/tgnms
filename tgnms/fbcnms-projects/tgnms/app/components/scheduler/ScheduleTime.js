/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AccessTimeIcon from '@material-ui/icons/AccessTime';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import React, {useCallback, useEffect, useState} from 'react';
import TabbedButton from '../common/TabbedButton';
import TextField from '@material-ui/core/TextField';
import {DAYS, FREQUENCIES} from '../../constants/ScheduleConstants';
import {KeyboardTimePicker} from '@material-ui/pickers';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

type Props = {
  handleCronStringUpdate: (?string) => void,
  handleAdHocChange: boolean => void,
  adHoc: boolean,
};

export default function ScheduleTime(props: Props) {
  const {handleCronStringUpdate, handleAdHocChange, adHoc} = props;

  const [frequency, setFrequency] = useState(FREQUENCIES.never);
  const [day, setDay] = useState(DAYS.MON);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const handleFrequencyChange = useCallback(
    (newFrequency: $Values<typeof FREQUENCIES>) => {
      if (newFrequency === FREQUENCIES.monthly) {
        setDay(1);
      } else {
        setDay(DAYS.MON);
      }
      setFrequency(newFrequency);
    },
    [setFrequency],
  );

  const handleDayChange = useCallback(
    (newDay: $Values<typeof DAYS>) => {
      setDay(newDay);
    },
    [setDay],
  );

  const handleNowClick = () => handleAdHocChange(true);
  const handleLaterClick = () => handleAdHocChange(false);

  const handleDateChange = date => {
    if (date.toString() === 'Invalid Date') {
      return;
    }
    setSelectedDate(new Date(date));
  };

  useEffect(() => {
    setFrequency(adHoc ? FREQUENCIES.never : FREQUENCIES.weekly);
    setDay(DAYS.MON);
  }, [adHoc, setFrequency, setDay]);

  useEffect(() => {
    const time = selectedDate.getMinutes() + ' ' + selectedDate.getHours();
    const currentDay =
      frequency === FREQUENCIES.monthly
        ? selectedDate.getDate()
        : selectedDate.getDay();
    let cronString;
    switch (frequency) {
      case FREQUENCIES.never:
        cronString = null;
        break;
      case FREQUENCIES.daily:
        cronString = `${time} * * *`;
        break;
      case FREQUENCIES.weekly:
        cronString = `${time} * * ${adHoc ? currentDay : day}`;
        break;
      case FREQUENCIES.biweekly:
        cronString = `${time} * * ${adHoc ? currentDay : day}#1,${
          adHoc ? currentDay : day
        }#3`;
        break;
      case FREQUENCIES.monthly:
        cronString = `${time} ${adHoc ? currentDay : day} * *`;
        break;
    }
    handleCronStringUpdate(cronString);
  }, [selectedDate, day, frequency, adHoc, handleCronStringUpdate]);

  return (
    <FormGroup row={false}>
      <Grid container direction="column" spacing={2}>
        <Grid item>
          <FormLabel component="legend">
            <span>Start</span>
          </FormLabel>
        </Grid>
        <Grid item>
          <TabbedButton
            leftText="now"
            rightText="later"
            leftOnclick={handleNowClick}
            rightOnclick={handleLaterClick}
          />
        </Grid>
        <Grid item container spacing={1}>
          <Grid
            item
            container
            direction="column"
            xs={adHoc ? 12 : 6}
            spacing={1}>
            <Grid item>
              <FormLabel component="legend">
                <span>Frequency</span>
              </FormLabel>
            </Grid>
            <Grid item>
              <TextField
                select
                variant="outlined"
                value={frequency}
                InputLabelProps={{shrink: true}}
                margin="dense"
                fullWidth
                onChange={ev => handleFrequencyChange(ev.target.value)}>
                {objectValuesTypesafe<string>(FREQUENCIES)
                  .filter(frequency => adHoc || frequency !== FREQUENCIES.never)
                  .map(name => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
          </Grid>
          {adHoc ? null : (
            <Grid item container xs={6} spacing={1}>
              {frequency === FREQUENCIES.daily ? null : (
                <Grid item container xs={6} direction="column" spacing={1}>
                  <Grid item>
                    <FormLabel component="legend">
                      <span>On</span>
                    </FormLabel>
                  </Grid>
                  <Grid item>
                    {frequency === FREQUENCIES.monthly ? (
                      <TextField
                        type="number"
                        inputProps={{min: 1, max: 31}}
                        variant="outlined"
                        value={day}
                        InputLabelProps={{shrink: true}}
                        margin="dense"
                        fullWidth
                        onChange={ev => handleDayChange(ev.target.value)}
                      />
                    ) : (
                      <TextField
                        select
                        variant="outlined"
                        value={day}
                        InputLabelProps={{shrink: true}}
                        margin="dense"
                        fullWidth
                        onChange={ev => handleDayChange(ev.target.value)}>
                        {objectValuesTypesafe<string>(DAYS).map(name => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Grid>
                </Grid>
              )}
              <Grid
                item
                container
                xs={frequency === FREQUENCIES.daily ? 12 : 6}
                direction="column"
                spacing={1}>
                <Grid item>
                  <FormLabel component="legend">
                    <span>At</span>
                  </FormLabel>
                </Grid>
                <Grid item>
                  <KeyboardTimePicker
                    margin="dense"
                    inputVariant="outlined"
                    id="time"
                    keyboardIcon={<AccessTimeIcon />}
                    value={selectedDate}
                    onChange={handleDateChange}
                    KeyboardButtonProps={{
                      'aria-label': 'change time',
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </FormGroup>
  );
}
