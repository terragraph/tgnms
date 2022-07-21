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
