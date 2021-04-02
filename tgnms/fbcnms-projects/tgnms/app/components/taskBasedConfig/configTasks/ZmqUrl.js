/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ConfigTaskInput from '../ConfigTaskInput';

export default function ZmqUrl({
  onChange,
}: {
  onChange?: (string | number | boolean) => void,
}) {
  return (
    <ConfigTaskInput
      label="ZMQ Controller URL"
      onChange={onChange}
      configField="statsAgentParams.sources.controller.zmq_url"
    />
  );
}
