/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as hwprofile from '../hwprofile';
import Ajv from 'ajv';
import type {ValidateFunction} from 'ajv';

expect.extend({
  async toMatchJsonSchema(received: Object, validator: ValidateFunction) {
    const isValid = await validator(received);
    const errors = validator.errors ?? [];
    return {
      message: () => {
        const errMsgs = errors.map(e => `${e.schemaPath}: ${e.message ?? ''}`);
        return `JSON Schema Error (${
          received?.hwBoardId ?? ''
        }):  ${errMsgs.join('\n')}`;
      },
      pass: isValid,
    };
  },
});

describe('Hardware profiles JSON Schema', () => {
  test('JSON Schema is valid', () => {
    const ajv = new Ajv();
    const schema = hwprofile.getSchema();
    ajv.compile(schema);
  });
  test('Default hardware profiles all match the JSON Schema', async () => {
    const ajv = new Ajv();
    const schema = hwprofile.getSchema();
    const validate = ajv.compile(schema);
    const profiles = await hwprofile.loadProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      await (expect(p): any).toMatchJsonSchema(validate);
    }
    expect.assertions(profiles.length + 1);
  });
});
