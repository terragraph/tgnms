/**
 * Copyright (c) 2014-present, Facebook, Inc.
 */
/*
 * If an environment variable is provided, treats it as a boolean flag. If the
 * var is not passed, undefined is returned.
 */
export function optionalBool(envVar: ?string): boolean | void {
  if (typeof envVar === 'string') {
    return envBool(envVar);
  }
}

/*
 * If an environment variable is provided, treats it as a boolean flag. If the
 * var is not passed, default value is returned.
 */
export function requiredBool(envVar: ?string, defaultValue: boolean): boolean {
  if (typeof envVar === 'string') {
    return envBool(envVar);
  }
  return defaultValue;
}

/*
 * If an environment variable is provided, parses it as an integer. If the
 * var is not passed, undefined is returned.
 */
export function optionalInt(envVar: ?string): number | void {
  if (typeof envVar === 'string') {
    return envInt(envVar);
  }
}

/*
 * If an environment variable is provided, parses it as an integer. If the
 * var is not passed, default value is returned.
 */
export function requiredInt(envVar: ?string, defaultValue: number): number {
  if (typeof envVar === 'string') {
    return envInt(envVar, defaultValue);
  }
  return defaultValue;
}

export function envInt(val: string, defaultValue: number): number {
  const parsed = parseInt(val);
  if (isNaN(parsed)) {
    console.error(
      `Invalid environment variable. Expected: integer, Actual: ${
        val || 'undefined'
      }`,
    );
    return defaultValue;
  }
  return parsed;
}

export function envBool(val: string): boolean {
  // empty env vars like ENABLE_X are still considered true
  if (val === 'true' || val === '' || val === '1') {
    return true;
  }
  if (val === 'false' || val === '0') {
    return false;
  }
  console.error(
    `Invalid environment variable. Expected: boolean string, Actual: ${
      val || 'undefined'
    }`,
  );
  return false;
}
