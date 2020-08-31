/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

// convert degrees to radians
export const degToRad = a => (Math.PI / 180) * a;
// convert radians to degrees
export const radToDeg = a => (180 / Math.PI) * a;

/**
 * Input and ouput is in DEGREES.
 * Averages angles in degrees into a circular average using the unit circle.
 */
export function averageAngles(anglesDegrees: Array<number>): number {
  let [x, y] = [0, 0];
  for (const a of anglesDegrees) {
    const rad = degToRad(a);
    x += Math.cos(rad);
    y += Math.sin(rad);
  }
  x /= anglesDegrees.length;
  y /= anglesDegrees.length;

  return radToDeg(Math.atan2(y, x));
}
