/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as CronParser from 'cron-parser';
import * as StringHelpers from './StringHelpers';
import {
  DAYS,
  FREQUENCIES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {objectValuesTypesafe} from './ObjectHelpers';

const MEGABITS = Math.pow(1000, 2);

export function getParsedCronString({cronString}: {cronString: string}) {
  const [minute, hour, month, _, weekDay] = cronString.split(' ');
  const initialDay =
    month === '*'
      ? objectValuesTypesafe<string>(DAYS)[Number(weekDay.split('#')[0])]
      : month;

  const utcDate = new Date(new Date().setHours(Number(hour), Number(minute)));

  const initialTime = adjustDateFromUTCTime(utcDate).toLocaleString([], {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const initialFrequency =
    month === '*' && weekDay === '*'
      ? FREQUENCIES.daily
      : weekDay === '*'
      ? FREQUENCIES.monthly
      : weekDay.includes('#')
      ? FREQUENCIES.biweekly
      : FREQUENCIES.weekly;

  return {initialFrequency, initialTime, initialDay};
}

export function getDateNth({date}: {date: number}) {
  if (date > 3 && date < 21) return date + 'th';
  switch (date % 10) {
    case 1:
      return date + 'st';
    case 2:
      return date + 'nd';
    case 3:
      return date + 'rd';
    default:
      return date + 'th';
  }
}

export function getFormattedDateAndTime({date}: {date: string}) {
  return adjustDateFromUTCTime(new Date(date)).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function adjustDateFromUTCTime(date: Date): Date {
  const tempDate = new Date(date);
  const msOffset = tempDate.getTimezoneOffset() * 60000;
  return new Date(tempDate.getTime() - msOffset);
}

export function numToMegabits(number: number): number {
  return number / MEGABITS;
}

export function numToMegabitsString(number: number): string {
  return StringHelpers.formatNumber(numToMegabits(number), 2);
}

export function createMapLink({
  networkName,
  executionId,
  type,
}: {
  networkName: ?string,
  executionId: ?string | ?number,
  type: string,
}) {
  if (
    !networkName ||
    executionId === null ||
    typeof executionId === 'undefined'
  ) {
    return '';
  }
  return `/map/${networkName || ''}/${type}s?${type}=${executionId || ''}`;
}

export function getContextString({
  type,
  frequency,
  adHoc,
  selectedDate,
  day,
  curCronString,
}: {
  type: string,
  frequency: $Values<typeof FREQUENCIES>,
  adHoc: boolean,
  selectedDate: Date,
  day: string | number,
  curCronString: ?string,
}) {
  if (adHoc) {
    return `The ${type} will begin immediately.`;
  } else {
    const cronString =
      curCronString && curCronString.includes('#')
        ? curCronString.split('#')[0]
        : curCronString;
    const nextDate = cronString
      ? CronParser.parseExpression(cronString).next()._date._d
      : '';

    const formattedNextDate = new Date(nextDate).toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const currentTime = selectedDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    const executionType = type.includes('test') ? 'test' : 'scan';

    switch (frequency) {
      case FREQUENCIES.daily:
        return `A ${type} will begin every day at ${currentTime}.`;
      case FREQUENCIES.weekly:
        return `A ${type} will begin every ${day} at ${currentTime}. The first ${executionType} will occur on ${
          formattedNextDate.split(',')[0]
        }, ${currentTime}.`;
      case FREQUENCIES.biweekly:
        return `A ${type} will begin every other ${day} at ${currentTime}. The first ${executionType} will occur on ${
          formattedNextDate.split(',')[0]
        }, ${currentTime}.`;
      case FREQUENCIES.monthly:
        return `A ${type} will begin on the ${getDateNth({
          date: Number(day),
        })} day of each month at ${currentTime}. The first ${executionType} will occur on ${
          formattedNextDate.split(',')[0]
        }, ${currentTime}.`;
    }
  }
}
