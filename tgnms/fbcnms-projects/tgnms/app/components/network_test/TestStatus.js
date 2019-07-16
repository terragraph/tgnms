/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import * as React from 'react';
import AccessTimeIcon from '@material-ui/icons/AlarmOn';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckIcon from '@material-ui/icons/Check';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import RunningTestIndicator from './RunningTestIndicator';
import {TEST_STATUS} from '../../../shared/dto/TestExecution';
import type {TestExecution} from '../../../shared/dto/TestExecution';

type TestStatusProps = {|execution: TestExecution, className: string|};
export default function TestStatus(props: TestStatusProps) {
  const {text, icon: StatusIcon} = getStatusDef(props.execution.status);
  return <StatusIcon title={text} {...props} />;
}

type StatusDef = {
  text: string,
  icon: React.ComponentType<any>,
};
/**
 * Map from a status to an icon / tooltip text.
 */
const statusMap: {[number | string]: StatusDef} = {
  [TEST_STATUS.FINISHED]: {
    text: 'Finished',
    icon: props => <CheckIcon color="primary" {...props} />,
  },
  [TEST_STATUS.ABORTED]: {
    text: 'Aborted',
    icon: props => <CancelIcon {...props} />,
  },
  [TEST_STATUS.FAILED]: {
    text: 'Failed',
    icon: props => <ErrorOutlineIcon color="error" {...props} />,
  },
  [TEST_STATUS.SCHEDULED]: {
    text: 'Scheduled',
    icon: props => <AccessTimeIcon color="primary" {...props} />,
  },
  [TEST_STATUS.QUEUED]: {
    text: 'Queued',
    icon: props => <AccessTimeIcon color="primary" {...props} />,
  },
  [TEST_STATUS.RUNNING]: {
    text: 'Running',
    icon: props => <RunningTestIndicator {...props} />,
  },
  unknown: {
    text: 'Unknown',
    icon: () => null,
  },
};

export function getStatusDef(
  statusCode: $Values<typeof TEST_STATUS>,
): StatusDef {
  const def = statusMap[statusCode];
  return def ? def : statusMap.unknown;
}
