/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export const HEALTH_CODES = {
  EXCELLENT: 0,
  HEALTHY: 1,
  MARGINAL: 2,
  WARNING: 3,
  UNKNOWN: 4,
  DOWN: 5,
};

export type HealthDef = {
  name: string,
  color: string,
};

export const HEALTH_DEFS: {[code: number]: HealthDef} = {
  [HEALTH_CODES.EXCELLENT]: {
    code: HEALTH_CODES.EXCELLENT,
    name: 'excellent',
    color: 'rgb(76, 175, 80)',
  },
  [HEALTH_CODES.HEALTHY]: {
    code: HEALTH_CODES.HEALTHY,
    name: 'healthy',
    color: 'rgb(103, 200, 255)',
  },
  [HEALTH_CODES.MARGINAL]: {
    code: HEALTH_CODES.MARGINAL,
    name: 'marginal',
    color: 'rgb(255, 193, 7)',
  },
  [HEALTH_CODES.WARNING]: {
    code: HEALTH_CODES.WARNING,
    name: 'warning',
    color: 'rgb(244, 137, 54)',
  },
  [HEALTH_CODES.UNKNOWN]: {
    code: HEALTH_CODES.UNKNOWN,
    name: 'unknown',
    color: 'rgb(33,33,33)',
  },
  [HEALTH_CODES.DOWN]: {
    code: HEALTH_CODES.DOWN,
    name: 'down',
    color: 'rgb(244, 67, 54)',
  },
};

export function getHealthDef(health: number): HealthDef {
  const def = HEALTH_DEFS[health];
  if (!def) {
    return HEALTH_DEFS[HEALTH_CODES.UNKNOWN];
  }
  return def;
}
