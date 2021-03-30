/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  eventLine: {
    position: 'absolute',
    width: theme.spacing(0.125),
    height: `calc(100vh - ${theme.spacing(20)}px)`,
    zIndex: 101,
    marginTop: -theme.spacing(5),
  },
  eventHover: {
    border: `${theme.spacing(0.25)} solid #0077ff`,
    borderRadius: theme.spacing(0.125),
  },
  eventPoint: {
    position: 'absolute',
    borderRadius: '50%',
    marginTop: -theme.spacing(5.625),
    marginLeft: -theme.spacing(0.625),
    height: theme.spacing(1.5),
    width: theme.spacing(1.5),
    zIndex: 102,
  },
  eventTimeLine: {
    position: 'absolute',
    width: `calc(100vw - ${theme.spacing(75)}px)`,
    left: '8%',
    backgroundColor: '#DDDDDD',
    height: theme.spacing(0.5),
    zIndex: 100,
    overflow: 'hidden',
    marginTop: theme.spacing(1.5),
  },
  hide: {
    visibility: 'hidden',
  },
  eventDetails: {
    backgroundColor: 'white',
    position: 'absolute',
    zIndex: 103,
    border: 'solid',
    borderRadius: theme.spacing(0.5),
    borderColor: '#d4d4d4',
    margin: theme.spacing(2),
    padding: theme.spacing(),
    marginTop: -theme.spacing(3.75),
    heigh: theme.spacing(12.5),
  },
  eventDetailsArrow: {
    marginLeft: -theme.spacing(4.75),
    float: 'left',
    fontSize: theme.spacing(6),
    color: '#d4d4d4',
  },
  checkboxPadding: {padding: 0},
  legendIcon: {
    borderRadius: '50%',
    height: theme.spacing(1.5),
    width: theme.spacing(1.5),
    marginTop: theme.spacing(0.5),
  },
  timelineDates: {marginTop: theme.spacing(2)},
  floatRight: {float: 'right'},
}));

type EventType = {
  color: string,
  id: string,
  timeStamp: string,
  visible: boolean,
  type: $Values<typeof EVENT_TYPES>,
  timelinePercent: number,
};

type EventGroupType = {
  color: string,
  title: string,
  checked: boolean,
  handleChange: boolean => void,
};

export const EVENT_TYPES = {
  NETWORK_CONFIG_CHANGE: 'setNetworkOverridesConfig',
  DELETE_LINK: 'delLink',
  ADD_LINK: 'addLink',
  BULK_ADD: 'bulkAdd',
  ADD_NODE: 'addNode',
  NODE_CONFIG_CHANGE: 'setNodeOverridesConfig',
  DEFAULT_ROUTE_CHANGE: 'changeDefaultRoute',
};

const EVENT_TYPE_DESCRIPTION = {
  [EVENT_TYPES.NETWORK_CONFIG_CHANGE]: 'Network Config Change',
  [EVENT_TYPES.DELETE_LINK]: 'Link Deleted',
  [EVENT_TYPES.ADD_LINK]: 'Link Added',
  [EVENT_TYPES.BULK_ADD]: 'Multiple Topology Elements Added',
  [EVENT_TYPES.ADD_NODE]: 'Node Added',
  [EVENT_TYPES.NODE_CONFIG_CHANGE]: 'Node Config Change',
  [EVENT_TYPES.DEFAULT_ROUTE_CHANGE]: 'Default Route Change',
};

export default function EventsView({
  events,
  eventGroups,
  startTime,
}: {
  events: Array<EventType>,
  eventGroups: Array<EventGroupType>,
  startTime: number,
}) {
  const classes = useStyles();
  const [highlightedEvent, setHighlightedEvent] = React.useState(null);

  return (
    <Grid item xs={12}>
      <Grid item xs={12} container spacing={4}>
        <Grid item xs={1} />
        <Grid item xs={8}>
          <Typography variant="h6">Timeline</Typography>
        </Grid>
        <Grid item container xs={3}>
          {eventGroups.map(group => (
            <Grid item container spacing={1} direction="row" xs={12}>
              <Grid item>
                <Checkbox
                  className={classes.checkboxPadding}
                  checked={group.checked}
                  onChange={event => group.handleChange(event.target.checked)}
                  size="small"
                />
              </Grid>
              <Grid item>
                <div
                  className={classes.legendIcon}
                  style={{
                    backgroundColor: group.color,
                  }}
                />
              </Grid>
              <Grid item>{group.title}</Grid>
            </Grid>
          ))}
        </Grid>
      </Grid>
      <div className={classes.eventTimeLine} />
      <Grid container className={classes.timelineDates}>
        <Grid item xs={1} />
        <Grid item xs={1}>
          {new Date(startTime).toLocaleString()}
        </Grid>
        <Grid item xs={9} />
        <Grid item xs={1}>
          Now
        </Grid>
      </Grid>
      {events.map(
        event =>
          event.visible && (
            <div>
              <div
                className={classNames(
                  classes.eventPoint,
                  event.id === highlightedEvent && classes.eventHover,
                )}
                onMouseOver={() => setHighlightedEvent(event.id)}
                onMouseOut={() => setHighlightedEvent(null)}
                style={{
                  left: event.timelinePercent + '%',
                  backgroundColor: event.color,
                }}
              />
              <div
                className={classNames(
                  classes.eventDetails,
                  event.id !== highlightedEvent && classes.hide,
                )}
                onMouseOver={() => setHighlightedEvent(event.id)}
                onMouseOut={() => setHighlightedEvent(null)}
                style={{
                  left: event.timelinePercent + '%',
                }}>
                <ArrowLeftIcon className={classes.eventDetailsArrow} />
                <div className={classes.floatRight}>
                  <Grid container direction="column">
                    <Grid item>{EVENT_TYPE_DESCRIPTION[event.type]} at </Grid>
                    <Grid item>
                      {new Date(event.timeStamp).toLocaleString()}
                    </Grid>
                  </Grid>
                </div>
              </div>
              <div
                style={{
                  left: event.timelinePercent + '%',
                  backgroundColor: event.color,
                }}
                className={classNames(
                  classes.eventLine,
                  event.id === highlightedEvent && classes.eventHover,
                )}
                onMouseOver={() => setHighlightedEvent(event.id)}
                onMouseOut={() => setHighlightedEvent(null)}
              />
            </div>
          ),
      )}
    </Grid>
  );
}
