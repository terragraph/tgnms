/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {HighAvailability} from '../constants/NetworkConstants';
import {BinaryStarFsmState} from '../../thrift/gen-nodejs/Controller_types';

// Check if the primary and backup controller are in stateA and stateB
// without loss of generality
function isPairEquivalent(primary, backup, stateA, stateB) {
  return (
    (primary === stateA && backup === stateB) ||
    (primary === stateB && backup === stateA)
  );
}

export function inErrorState(primary, backup) {
  return (
    primary === backup ||
    isPairEquivalent(
      primary,
      backup,
      BinaryStarFsmState.STATE_BACKUP,
      BinaryStarFsmState.STATE_PASSIVE,
    ) ||
    isPairEquivalent(
      primary,
      backup,
      BinaryStarFsmState.STATE_BACKUP,
      HighAvailability.OFFLINE,
    ) ||
    isPairEquivalent(
      primary,
      backup,
      BinaryStarFsmState.STATE_PASSIVE,
      HighAvailability.OFFLINE,
    )
  );
}

export function getActivePeerString(primary, backup) {
  if (inErrorState(primary, backup)) {
    return 'Error';
  } else if (primary === BinaryStarFsmState.STATE_ACTIVE) {
    return 'Primary';
  } else if (backup === BinaryStarFsmState.STATE_ACTIVE) {
    return 'Backup';
  }

  return null;
}

export function getStatusIndicatorColor(primary, backup) {
  if (
    isPairEquivalent(
      primary,
      backup,
      BinaryStarFsmState.STATE_ACTIVE,
      BinaryStarFsmState.STATE_PASSIVE,
    )
  ) {
    // If one controller is active and one is passive, then it's green
    return 'green';
  } else if (inErrorState(primary, backup)) {
    // Error if both controllers have the same state
    return 'red';
  } else {
    // Warn otherwise
    return 'yellow';
  }
}

export default {
  inErrorState,
  getActivePeerString,
  getStatusIndicatorColor,
};
