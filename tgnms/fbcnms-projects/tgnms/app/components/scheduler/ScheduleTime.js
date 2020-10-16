/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import React, {useCallback, useEffect, useState} from 'react';
import TabbedButton from '../common/TabbedButton';
import TextField from '@material-ui/core/TextField';
import {DAYS, FREQUENCIES, MODAL_MODE} from '../../constants/ScheduleConstants';
import {TimePicker} from '@material-ui/pickers';
import {
  getContextString,
  getParsedCronString,
} from '../../helpers/ScheduleHelpers';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

type Props = {
  onCronStringUpdate: (?string) => void,
  onAdHocChange: boolean => void,
  adHoc: boolean,
  modalMode: $Values<typeof MODAL_MODE>,
  initialCronString?: string,
  type: string,
};

export default function ScheduleTime(props: Props) {
  const {
    onCronStringUpdate,
    onAdHocChange,
    adHoc,
    modalMode,
    initialCronString,
    type,
  } = props;

  const {initialDay, initialTime, initialFrequency} = initialCronString
    ? getParsedCronString({cronString: initialCronString})
    : {initialDay: null, initialTime: null, initialFrequency: null};

  const [frequency, setFrequency] = useState(
    initialFrequency || FREQUENCIES.never,
  );
  const [day, setDay] = useState(initialDay || DAYS.MON);
  const [selectedDate, setSelectedDate] = React.useState(
    initialTime ? new Date(initialTime) : new Date(),
  );

  const [curCronString, setCurCronString] = React.useState(null);

  const handleFrequencyChange = useCallback(
    (newFrequency: $Values<typeof FREQUENCIES>) => {
      if (newFrequency === FREQUENCIES.monthly) {
        setDay(1);
      } else if (typeof day === 'number') {
        setDay(DAYS.MON);
      }
      setFrequency(newFrequency);
    },
    [setFrequency, day],
  );

  const handleDayChange = useCallback(
    (newDay: $Values<typeof DAYS>) => {
      setDay(newDay);
    },
    [setDay],
  );

  const handleNowClick = () => onAdHocChange(true);
  const handleLaterClick = () => onAdHocChange(false);

  const handleDateChange = date => {
    if (date.toString() === 'Invalid Date') {
      return;
    }
    setSelectedDate(new Date(date.toString()));
  };

  useEffect(() => {
    if (!initialCronString) {
      setFrequency(adHoc ? FREQUENCIES.never : FREQUENCIES.weekly);
      setDay(DAYS.MON);
    }
  }, [adHoc, setFrequency, setDay, initialCronString]);

  const getDayValue = useCallback(() => {
    const adHocDay =
      frequency === FREQUENCIES.monthly
        ? selectedDate.getDate()
        : selectedDate.getDay();

    let scheduledDay =
      frequency === FREQUENCIES.monthly
        ? day
        : objectValuesTypesafe<string>(DAYS).indexOf(day);
    if (scheduledDay === -1) {
      scheduledDay = 0;
    }
    return adHoc ? adHocDay : scheduledDay;
  }, [adHoc, day, frequency, selectedDate]);

  const context = React.useMemo(() => {
    return getContextString({
      type,
      frequency,
      adHoc,
      selectedDate,
      day,
      curCronString,
    });
  }, [type, frequency, adHoc, selectedDate, day, curCronString]);

  useEffect(() => {
    const time =
      selectedDate.getUTCMinutes() + ' ' + selectedDate.getUTCHours();
    const cronDay = getDayValue();
    let cronString;
    switch (frequency) {
      case FREQUENCIES.never:
        cronString = null;
        break;
      case FREQUENCIES.daily:
        cronString = `${time} * * *`;
        break;
      case FREQUENCIES.weekly:
        cronString = `${time} * * ${cronDay}`;
        break;
      case FREQUENCIES.biweekly:
        cronString = `${time} * * ${cronDay}#1,${cronDay}#3`;
        break;
      case FREQUENCIES.monthly:
        cronString = `${time} ${cronDay} * *`;
        break;
    }
    setCurCronString(cronString);
    onCronStringUpdate(cronString);
  }, [selectedDate, day, frequency, adHoc, onCronStringUpdate, getDayValue]);

  return (
    <FormGroup row={false}>
      <Grid container direction="column" spacing={3}>
        {modalMode === MODAL_MODE.CREATE && (
          <Grid item container spacing={2} direction="column">
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
          </Grid>
        )}
        {adHoc ? null : (
          <Grid item container spacing={1}>
            <Grid item container direction="column" xs={6} spacing={1}>
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
                    .filter(
                      frequency => adHoc || frequency !== FREQUENCIES.never,
                    )
                    .map(name => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
            </Grid>
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
                  <TimePicker
                    margin="dense"
                    inputVariant="outlined"
                    id="time"
                    value={selectedDate}
                    onChange={handleDateChange}
                    KeyboardButtonProps={{
                      'aria-label': 'change time',
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}
        <Grid item>
          <FormLabel component="legend">
            <span>{context}</span>
          </FormLabel>
        </Grid>
      </Grid>
    </FormGroup>
  );
}
