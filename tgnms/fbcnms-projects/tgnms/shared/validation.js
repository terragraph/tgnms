/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export class ValidationResult {
  errors: Array<ValidationError>;
  hasErrors = () =>
    typeof this.errors !== 'undefined' && this.errors.length > 0;
}

export class ValidationError {
  /**
   * a programmatically stable identifier to
   * identify which property or predicate failed
   */
  type: string;
  // human readable error message
  message: string;
}
