/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

export const HEALTH_CODES = {
  MISSING: 4,
  EXCELLENT: 0,
  GOOD: 1,
  MARGINAL: 2,
  POOR: 3,
};

export const HEALTH_EXECUTIONS = [
  HEALTH_CODES.POOR,
  HEALTH_CODES.MARGINAL,
  HEALTH_CODES.GOOD,
  HEALTH_CODES.EXCELLENT,
  HEALTH_CODES.MISSING,
];

export type HealthDef = {
  name: string,
  color: string,
};

export const HEALTH_DEFS: {[code: number]: HealthDef} = {
  [HEALTH_CODES.EXCELLENT]: {
    code: HEALTH_CODES.EXCELLENT,
    name: 'Excellent',
    color: 'rgb(76, 175, 80)',
  },
  [HEALTH_CODES.GOOD]: {
    code: HEALTH_CODES.GOOD,
    name: 'Good',
    color: 'rgb(103, 200, 255)',
  },
  [HEALTH_CODES.MARGINAL]: {
    code: HEALTH_CODES.MARGINAL,
    name: 'Marginal',
    color: 'rgb(255, 193, 7)',
  },
  [HEALTH_CODES.POOR]: {
    code: HEALTH_CODES.POOR,
    name: 'Poor',
    color: 'rgb(244, 137, 54)',
  },
  [HEALTH_CODES.MISSING]: {
    code: HEALTH_CODES.MISSING,
    name: 'Missing',
    color: 'rgb(158,158,158)',
  },
};

export function getHealthDef(health: number): HealthDef {
  const def = HEALTH_DEFS[health];
  if (!def) {
    return HEALTH_DEFS[HEALTH_CODES.MISSING];
  }
  return def;
}
