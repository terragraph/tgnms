/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import DescriptionIcon from '@material-ui/icons/Description';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import Typography from '@material-ui/core/Typography';
import {
  Detail,
  Section,
} from '@fbcnms/alarms/components/alertmanager/AlertDetails/AlertDetailsPane';

import type {AlertViewerProps} from '@fbcnms/alarms/components/rules/RuleInterface';
import type {EventType} from '@fbcnms/tg-nms/shared/types/Event';

const EVENT_LIMIT = 10;

export default function EventAlertViewer({alert}: AlertViewerProps) {
  const {entity, network} = alert.labels || {};
  const {description, events} = alert.annotations || {};

  const allEvents = React.useMemo<Array<EventType>>(
    () => (typeof events !== 'string' ? [] : JSON.parse(events)),
    [events],
  );
  /**
   * sometimes an alarm can have thousands of duplicate events. The first 10
   * should suffice. If not, we can find a better way to render this.
   */
  const isTruncated = allEvents.length > EVENT_LIMIT;
  return (
    <Grid container data-testid="event-alert-viewer" spacing={2}>
      <Section title="Details">
        <Detail icon={DescriptionIcon} title="Description">
          <Typography color="textSecondary">{description}</Typography>
        </Detail>
        <Detail icon={RouterIcon} title="Network">
          <Grid item>
            <Typography color="textSecondary">{network}</Typography>
          </Grid>
        </Detail>
        <Detail icon={RouterIcon} title="Entity">
          <Typography>{entity}</Typography>
        </Detail>
      </Section>

      <Section title="Events">
        <List dense>
          {allEvents.slice(0, EVENT_LIMIT).map((event, i) => (
            <ListItem key={i}>
              <ListItemText
                primary={event.reason}
                secondary={`${
                  event.nodeName || event?.nodeId || 'unknown'
                } ${new Date(event.timestamp).toLocaleTimeString()}`}
              />
            </ListItem>
          ))}
          {isTruncated && (
            <ListItem>
              <ListItemText
                primary={`${
                  allEvents.length - EVENT_LIMIT
                } more events not shown...`}
              />
            </ListItem>
          )}
        </List>
      </Section>
    </Grid>
  );
}
