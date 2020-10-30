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
  sequential_link: 'Sequential link test',
  parallel_link: 'Parallel link test',
  sequential_node: 'Sequential node test',
  parallel_node: 'Parallel node test',
  partial: 'Partial throughput test',
  p2mp: 'Point to multipoint test',
  incremental_route: 'Incremental route test',
  congestion: 'Link congestion test',
};

export const NETWORK_TEST_PROTOCOLS = {
  TCP: 6,
  UDP: 17,
};

export const NETWORK_TEST_DEFS = {
  sequential_link: {
    title: 'Sequential Link Health Test',
    description:
      'Sends traffic through links one at a time with little network disruption. Highly accurate results.',
    iperf_defaults: {
      bitrate: 200000000,
      timeSec: 60,
      protocol: NETWORK_TEST_PROTOCOLS.UDP,
      omitSec: 0,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  parallel_link: {
    title: 'Parallel Link Health Test',
    description:
      'Sends traffic through all links at once. Faster test with more network disruption. Less accurate results.',
    iperf_defaults: {
      bitrate: 200000000,
      timeSec: 300,
      protocol: NETWORK_TEST_PROTOCOLS.UDP,
      omitSec: 0,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  sequential_node: {
    title: 'Sequential Node Health Test',
    description:
      'Sends traffic through nodes one at a time with little network disruption. Highly accurate results.',
    iperf_defaults: {
      bitrate: 300000000,
      timeSec: 60,
      protocol: NETWORK_TEST_PROTOCOLS.TCP,
      omitSec: 2,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  parallel_node: {
    title: 'Parallel Node Health Test',
    description:
      'Sends traffic through all nodes at once. Faster test with more network disruption. Less accurate results.',
    iperf_defaults: {
      bitrate: 3000000,
      timeSec: 300,
      protocol: NETWORK_TEST_PROTOCOLS.TCP,
      omitSec: 2,
      intervalSec: null,
      windowSize: null,
      parallelStreams: null,
    },
  },
  partial: {
    title: 'Partial throughput test',
    description: 'Tests upload and download speeds for one node.',
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
  p2mp: {
    title: 'Point to multipoint test',
    description: 'Tests all links of one node at once',
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
  incremental_route: {
    title: 'Incremental route test',
    description: 'Incrementally tests the default route of one node.',
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
  congestion: {
    title: 'Link congestion test',
    description: 'Tests all CN routes that include a particular link.',
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

export const TEST_TYPE_CODES = {
  SEQUENTIAL_LINK: 'sequential_link',
  PARALLEL_LINK: 'parallel_link',
  SEQUENTIAL_NODE: 'sequential_node',
  PARALLEL_NODE: 'parallel_node',
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
      <DeleteIcon style={{marginRight: '8px'}} />
      Delete
    </>
  ),
  download: <GetAppIcon />,
  disable: (
    <>
      <PauseIcon style={{marginRight: '8px'}} /> Pause
    </>
  ),
  enable: (
    <>
      <PlayArrowIcon style={{marginRight: '8px'}} /> Resume
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
