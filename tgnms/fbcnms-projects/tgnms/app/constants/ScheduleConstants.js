/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import * as React from 'react';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckIcon from '@material-ui/icons/Check';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import EventIcon from '@material-ui/icons/Event';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import Tooltip from '@material-ui/core/Tooltip';

export const NETWORK_TEST_TYPES = {
  sequential: 'Sequential Link Test',
  parallel: 'Parallel Link Test',
  multihop: 'Multihop Node Test',
};

export const MODAL_MODE = {
  EDIT: 'edit',
  CREATE: 'create',
};

export const EXECUTION_STATUS = {
  COMPLETED: 'finished',
  FINISHED: 'finished',
  ABORTED: 'aborted',
  FAILED: 'failed',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
};

export const STATUS_ICONS = {
  COMPLETED: (
    <Tooltip title={'Completed'} placement="top">
      <CheckIcon />
    </Tooltip>
  ),
  ABORTED: (
    <Tooltip title={'Aborted'} placement="top">
      <CancelIcon />
    </Tooltip>
  ),
  FAILED: (
    <Tooltip title={'Failed'} placement="top">
      <ErrorOutlineIcon color="error" />
    </Tooltip>
  ),
  SCHEDULED: (
    <Tooltip title={'Scheduled'} placement="top">
      <EventIcon />
    </Tooltip>
  ),
  RUNNING: (
    <Tooltip title={'Running'} placement="top">
      <RadioButtonUncheckedIcon />
    </Tooltip>
  ),
};

export const NETWORK_TEST_PROTOCOLS = {
  TCP: 6,
  UDP: 17,
};

export const TEST_TYPE_CODES = {
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  MULTIHOP: 'multihop',
};

export const NETWORK_TEST_IPERF_DEFAULTS = {
  sequential: {
    bitrate: 200000000,
    timeSec: 60,
    protocol: 17,
    omitSec: 0,
    intervalSec: null,
    windowSize: null,
  },
  parallel: {
    bitrate: 200000000,
    timeSec: 300,
    protocol: 17,
    omitSec: 0,
    intervalSec: null,
    windowSize: null,
  },
  multihop: {
    bitrate: 300000000,
    timeSec: 60,
    protocol: 6,
    omitSec: 2,
    intervalSec: null,
    windowSize: null,
  },
};

export const FREQUENCIES = {
  never: 'Does not repeat',
  daily: 'Once a day',
  weekly: 'Once a week',
  biweekly: 'Once every 2 weeks',
  monthly: 'Once a month',
};

export const DAYS = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUES: 'Tuesday',
  WED: 'Wednesday',
  THURS: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

export const BUTTON_TYPES = {
  edit: 'Edit',
  abort: 'Abort',
  delete: 'Delete',
  download: 'Download',
};

export const API_TYPE = {
  test: 'test',
  scan: 'scan',
};

export const PROTOCOL = {
  TCP: 'TCP',
  UDP: 'UDP',
};

export const EXECUTION = {
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
  FAILED: 'FAILED',
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
};
