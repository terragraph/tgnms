/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';

export const NOTIFICATION_SOURCE = {
  EVENTS_KAFKA: 'events',
};

export type NotificationMenuItem = {
  key: string,
  primaryText: string | React.Node,
  secondaryText: string | React.Node,
  details: Object,
  source: $Values<typeof NOTIFICATION_SOURCE>,
  Icon: React.Element<any>,
  /*
   * original value which this notification is based on. Use this to show extra
   * details in the notification dialog
   */
  data: any,
};
