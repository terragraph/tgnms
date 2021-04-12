/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {DATATYPE} from '@fbcnms/tg-nms/shared/dto/Settings';

export type SecretToggleState = {|
  // If the value is a secret and not visible, use this to show/hide values
  isHidden: boolean,
  /*
   * The value is a secret and should be hidden by default. Use this for
   * showing the toggle button.
   */
  isSecret: boolean,
  /*
   * If the state is currently set to visible. Use this to show the "Show" or
   * "Hide" toggle button text.
   */
  isSecretVisible: boolean,
  toggleSecret: () => void,
|};

export function useSecretToggle(
  dataType: $Values<typeof DATATYPE>,
): SecretToggleState {
  const isSecret = dataType === DATATYPE.SECRET_STRING;
  const [showSecret, setShowSecret] = React.useState(false);
  const toggleShow = React.useCallback(() => setShowSecret(val => !val), [
    setShowSecret,
  ]);
  return {
    isSecret,
    isHidden: isSecret && !showSecret,
    isSecretVisible: showSecret,
    toggleSecret: toggleShow,
  };
}
