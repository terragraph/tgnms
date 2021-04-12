/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * Since we're using internal mapbox-gl-draw code, these tests ensure that
 * nothing breaks when upgrading.
 */

import {
  MAPBOX_DRAW_DEFAULT_STYLES,
  MAPBOX_DRAW_DEFAULT_STYLE_IDS,
} from '../MapAnnotationConstants';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';

describe('mapbox-draw upgrade tests', () => {
  test('theme structure', () => {
    const expectedIds = objectValuesTypesafe<string>(
      MAPBOX_DRAW_DEFAULT_STYLE_IDS,
    );
    // ensure that no new styles were added
    expect(MAPBOX_DRAW_DEFAULT_STYLES.length).toBe(expectedIds.length);
    // ensure that all the IDs we expect exist
    const defaultIdLookup = MAPBOX_DRAW_DEFAULT_STYLES.reduce(
      (lookup, style) => Object.assign(lookup, {[style.id]: style}),
      {},
    );
    for (const id of expectedIds) {
      const style = defaultIdLookup[id];
      if (!style) {
        console.error(
          `ID not found: ${id.toString()} - has mapbox-gl-draw been upgraded?`,
        );
      }
      expect(style).not.toBeUndefined();
    }
  });
});
