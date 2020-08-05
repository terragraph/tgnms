/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as StringHelpers from './StringHelpers';
import {DAYS, FREQUENCIES} from '../constants/ScheduleConstants';
import {objectValuesTypesafe} from './ObjectHelpers';

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
    year: '2-digit',
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

export function numToMegabits(number: number) {
  const MEGABITS = Math.pow(1000, 2);
  return StringHelpers.formatNumber(number / MEGABITS, 2);
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
