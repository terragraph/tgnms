/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import Tooltip from '@material-ui/core/Tooltip';
import {TEST_STATUS} from '../../../shared/dto/TestExecution';
import {formatNumber} from '../../helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import type {TestExecution} from '../../../shared/dto/TestExecution';

const useStyles = makeStyles(_theme => ({
  defaultClassName: {width: 100, flexGrow: 1},
}));

type Props = {
  execution: TestExecution,
  className: string,
};

export default function RunningTestIndicator(props: Props) {
  const {execution, className} = props;
  const {expected_end_date_utc, start_date_utc, status} = execution;
  const {defaultClassName} = useStyles();
  const percentage = useTestStatusProgress({
    expected_end_date_utc,
    start_date_utc,
    status,
  });
  return (
    <Tooltip
      title={`Test Running. ${formatNumber(percentage, 0)}% complete`}
      placement="top">
      <div>
        <LinearProgress
          className={className || defaultClassName}
          variant="determinate"
          value={percentage}
        />
      </div>
    </Tooltip>
  );
}

/*
 * computes a percentage based on start date,
 * expected end date, and current time
 */
export function useTestStatusProgress({
  start_date_utc,
  expected_end_date_utc,
  status,
}: {
  start_date_utc: Date,
  expected_end_date_utc: Date,
  status: number,
}) {
  const [percentage, setPercentage] = React.useState(0);

  React.useEffect(() => {
    let interval: ?IntervalID = null;
    if (status === TEST_STATUS.RUNNING) {
      if (!(start_date_utc && expected_end_date_utc)) {
        return;
      }
      const expectedElapsedMs =
        expected_end_date_utc.getTime() - start_date_utc.getTime();
      interval = setInterval(() => {
        const timeLeft = expected_end_date_utc.getTime() - new Date().getTime();
        const pct = ((expectedElapsedMs - timeLeft) / expectedElapsedMs) * 100;
        setPercentage(Math.min(pct, 100));
        if (pct > 100) {
          clearInterval(interval);
        }
      }, 500);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [status, expected_end_date_utc, start_date_utc]);
  return percentage;
}
