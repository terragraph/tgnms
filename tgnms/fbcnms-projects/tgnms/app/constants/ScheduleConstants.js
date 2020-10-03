/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import * as React from 'react';
import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';
import CheckCircleOutlineOutlinedIcon from '@material-ui/icons/CheckCircleOutlineOutlined';
import DeleteIcon from '@material-ui/icons/Delete';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import EventIcon from '@material-ui/icons/Event';
import GetAppIcon from '@material-ui/icons/GetApp';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import PauseCircleOutlineIcon from '@material-ui/icons/PauseCircleOutline';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import ScheduleIcon from '@material-ui/icons/Schedule';
import Tooltip from '@material-ui/core/Tooltip';

export const NETWORK_TEST_TYPES = {
  sequential: 'Sequential link test',
  parallel: 'Parallel link test',
  multihop: 'Multihop node test',
  partial: 'Partial throughput test',
};

export const NETWORK_TEST_DEFS = {
  sequential: {
    title: 'Sequential Link Health Test',
    iperf_defaults: {
      bitrate: 200000000,
      timeSec: 60,
      protocol: 17,
      omitSec: 0,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  parallel: {
    title: 'Parallel Link Health Test',
    iperf_defaults: {
      bitrate: 200000000,
      timeSec: 300,
      protocol: 17,
      omitSec: 0,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  multihop: {
    title: 'Multihop Node Health Test',
    iperf_defaults: {
      bitrate: 300000000,
      timeSec: 60,
      protocol: 6,
      omitSec: 2,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  partial: {
    title: 'Partial Node Throughput Test',
    iperf_defaults: {
      bitrate: 300000000,
      timeSec: 60,
      protocol: 6,
      omitSec: 2,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
};

export const SCAN_SERVICE_TYPES = {
  IM: 'IM scan',
};

export const SCAN_SERVICE_MODE = {
  COARSE: 'Coarse',
  FINE: 'Fine',
  SELECTIVE: 'Selective',
  RELATIVE: 'Relative',
};

export const SCAN_TYPES = {
  IM: 2,
};

export const SCAN_MODE = {
  COARSE: 1,
  FINE: 2,
  SELECTIVE: 3,
  RELATIVE: 4,
};

export const MODAL_MODE = {
  EDIT: 'edit',
  CREATE: 'create',
};

export const SCHEDULE_TABLE_TYPES = {
  TEST: 'test',
  SCAN: 'scan',
};

export const EXECUTION_STATUS = {
  FINISHED: 'Completed',
  ABORTED: 'Aborted',
  FAILED: 'Failed',
  SCHEDULED: 'Scheduled',
  PAUSED: 'Paused',
  RUNNING: 'Running',
  PROCESSING: 'Processing',
  QUEUED: 'Queued',
};

export const TEST_EXECUTION_STATUS = {
  FINISHED: 'Completed',
  ABORTED: 'Aborted',
  FAILED: 'Failed',
  SCHEDULED: 'Scheduled',
  PAUSED: 'Paused',
  RUNNING: 'Running',
  PROCESSING: 'Processing',
};

export const SCAN_EXECUTION_STATUS = {
  FINISHED: 'Completed',
  FAILED: 'Failed',
  SCHEDULED: 'Scheduled',
  PAUSED: 'Paused',
  RUNNING: 'Running',
  QUEUED: 'Queued',
};

export const EXECUTION_DEFS = {
  FINISHED: {
    icon: (
      <Tooltip title={TEST_EXECUTION_STATUS.FINISHED} placement="top">
        <CheckCircleOutlineOutlinedIcon />
      </Tooltip>
    ),
    order: 2,
  },
  ABORTED: {
    icon: (
      <Tooltip title={TEST_EXECUTION_STATUS.ABORTED} placement="top">
        <CancelOutlinedIcon />
      </Tooltip>
    ),
    order: 3,
  },
  FAILED: {
    icon: (
      <Tooltip title={TEST_EXECUTION_STATUS.FAILED} placement="top">
        <ErrorOutlineIcon color="error" />
      </Tooltip>
    ),
    order: 4,
  },
  SCHEDULED: {
    icon: (
      <Tooltip title={TEST_EXECUTION_STATUS.SCHEDULED} placement="top">
        <EventIcon />
      </Tooltip>
    ),
    order: 5,
  },
  PAUSED: {
    icon: (
      <Tooltip title={TEST_EXECUTION_STATUS.PAUSED} placement="top">
        <PauseCircleOutlineIcon />
      </Tooltip>
    ),
    order: 6,
  },
  RUNNING: {
    icon: <RadioButtonUncheckedIcon />,
    order: 1,
  },
  PROCESSING: {
    icon: <RadioButtonUncheckedIcon />,
    order: 1,
  },
  QUEUED: {
    icon: <ScheduleIcon />,
    order: 1,
  },
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

export const FREQUENCIES = {
  never: 'Does not repeat',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
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
  abort: <HighlightOffIcon />,
  delete: (
    <>
      <DeleteIcon />
      Delete
    </>
  ),
  download: <GetAppIcon />,
  disable: (
    <>
      <PauseIcon />
      Pause
    </>
  ),
  enable: (
    <>
      <PlayArrowIcon />
      Resume
    </>
  ),
};

export const API_TYPE = {
  test: 'test',
  scan: 'scan',
};

export const PROTOCOL = {
  TCP: 'TCP',
  UDP: 'UDP',
};
