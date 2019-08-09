/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AccessTimeIcon from '@material-ui/icons/AlarmOn';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckIcon from '@material-ui/icons/Check';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import RunningTestIndicator from './RunningTestIndicator';
import {TEST_STATUS} from '../../../shared/dto/TestExecution';
import type {TestExecution} from '../../../shared/dto/TestExecution';

type TestStatusProps = {|execution: TestExecution, className: string|};

export default React.forwardRef<TestStatusProps, void>(function TestStatus(
  props: TestStatusProps,
  ref: any,
) {
  const {text, icon: StatusIcon} = getStatusDef(props.execution.status);
  return <StatusIcon title={text} {...props} ref={ref} />;
});

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
    icon: React.forwardRef((props, ref) => (
      <CheckIcon color="primary" {...props} ref={ref} />
    )),
  },
  [TEST_STATUS.ABORTED]: {
    text: 'Aborted',
    icon: React.forwardRef((props, ref) => <CancelIcon {...props} ref={ref} />),
  },
  [TEST_STATUS.FAILED]: {
    text: 'Failed',
    icon: React.forwardRef((props, ref) => (
      <ErrorOutlineIcon color="error" {...props} ref={ref} />
    )),
  },
  [TEST_STATUS.SCHEDULED]: {
    text: 'Scheduled',
    icon: React.forwardRef((props, ref) => (
      <AccessTimeIcon color="primary" {...props} ref={ref} />
    )),
  },
  [TEST_STATUS.QUEUED]: {
    text: 'Queued',
    icon: React.forwardRef((props, ref) => (
      <AccessTimeIcon color="primary" {...props} ref={ref} />
    )),
  },
  [TEST_STATUS.RUNNING]: {
    text: 'Running',
    icon: React.forwardRef((props, ref) => (
      <RunningTestIndicator {...props} ref={ref} />
    )),
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
