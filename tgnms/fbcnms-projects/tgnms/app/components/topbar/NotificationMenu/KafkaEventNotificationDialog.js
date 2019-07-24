/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {invert} from 'lodash';

import FriendlyText from '../../common/FriendlyText';
import Grid from '@material-ui/core/Grid';
import Text from '@fbcnms/i18n/Text';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

import {
  EventCategoryValueMap,
  EventIdValueMap,
  EventLevelValueMap,
} from '../../../../shared/types/Event';
import type {EventType} from '../../../../shared/types/Event';

type KafkaMessage = {
  topic: string,
  value: string,
  offset: number,
  partition: number,
  key: string,
  timestamp: string,
};

const EVENT_CATEGORIES_INVERTED = invert(EventCategoryValueMap);
const EVENT_LEVELS_INVERTED = invert(EventLevelValueMap);
const EVENT_IDS_INVERTED = invert(EventIdValueMap);

const useStyles = makeStyles(theme => ({
  rawJsonContainer: {
    marginTop: theme.spacing(),
    overflow: 'hidden',
  },
  rawJsonPrettyPrint: {
    padding: theme.spacing(),
    overflow: 'auto',
    width: '100%',
    margin: '0 auto',
    backgroundColor: theme.palette.grey[50],
  },
  detailsHeader: {
    marginBottom: theme.spacing(),
  },
}));
export default function KafkaEventNotificationDialog({
  event,
}: {
  event: KafkaMessage,
}) {
  const classes = useStyles();
  const eventValue = React.useMemo<EventType>(() => JSON.parse(event.value), [
    event,
  ]);
  const prettyPrintRawJson = React.useMemo(() => {
    return JSON.stringify(
      {
        ...eventValue,
        details: eventValue.details ? JSON.parse(eventValue.details) : {},
      },
      null,
      2,
    );
  }, [eventValue]);
  return (
    <Grid container direction="column" spacing={1}>
      <Grid item>
        <Text color="textSecondary" variant="subtitle2">
          ID
        </Text>
        <Typography variant="body1">
          {EVENT_IDS_INVERTED[eventValue.eventId]}
        </Typography>
      </Grid>
      <Grid item>
        <Text color="textSecondary" variant="subtitle2">
          Message
        </Text>
        <Typography variant="body1">{eventValue.reason}</Typography>
      </Grid>
      <Grid item>
        <Text color="textSecondary" variant="subtitle2">
          Timestamp
        </Text>{' '}
        <Typography variant="body1">
          {renderTimestamp(eventValue.timestamp)}
        </Typography>
      </Grid>
      <Grid item>
        <Text color="textSecondary" variant="subtitle2">
          Level
        </Text>
        <FriendlyText
          text={EVENT_LEVELS_INVERTED[eventValue.level]}
          separator="_"
          variant="body1"
        />
      </Grid>
      <Grid item>
        <Text color="textSecondary" variant="subtitle2">
          Category
        </Text>
        <FriendlyText
          text={EVENT_CATEGORIES_INVERTED[eventValue.category]}
          separator="_"
          variant="body1"
        />
      </Grid>
      <Grid item xs={12} className={classes.rawJsonContainer}>
        <Text
          color="textSecondary"
          className={classes.detailsHeader}
          variant="subtitle2">
          Details
        </Text>
        <pre className={classes.rawJsonPrettyPrint}>{prettyPrintRawJson}</pre>
      </Grid>
    </Grid>
  );
}

function renderTimestamp(timestamp: number) {
  const date = fromEpoch(timestamp);
  const dateTimeString = date.toLocaleString();
  /*
   * gets the user's timezone name in this format:
   * "17:22:39 GMT-0700 (Pacific Daylight Time)"
   */
  const timeString = date.toTimeString();
  // extract the (Pacific Daylight Time) from the parens
  const timezoneString = (timeString.match(/\((.*)\)/) || [''])[0];

  return `${dateTimeString} ${timezoneString}`;
}

function fromEpoch(epochSeconds: number): Date {
  const d = new Date(0);
  d.setUTCSeconds(epochSeconds);
  return d;
}
