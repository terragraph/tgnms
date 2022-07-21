/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';

import KafkaEventNotificationDialog from './KafkaEventNotificationDialog';
import {NOTIFICATION_SOURCE} from './constants';
import type {NotificationMenuItem} from './constants';

type Props = {|
  notification: ?NotificationMenuItem,
  onClose: () => any,
|};

export default function NotificationDialog({notification, ...props}: Props) {
  return (
    <Dialog
      fullWidth
      maxWidth={'sm'}
      {...props}
      open={!!notification}
      aria-labelledby="notification-dialog-title"
      data-testid="notification-dialog">
      <DialogTitle id="notification-dialog-title">Event Details</DialogTitle>
      <DialogContent>
        {notification &&
          (() => {
            switch (notification.source) {
              case NOTIFICATION_SOURCE.EVENTS_KAFKA:
                return (
                  <KafkaEventNotificationDialog event={notification.data} />
                );
              default:
                return JSON.stringify(notification.data);
            }
          })()}
      </DialogContent>
    </Dialog>
  );
}
