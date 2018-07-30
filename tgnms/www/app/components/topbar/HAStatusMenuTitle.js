/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import StatusIndicator from '../common/StatusIndicator';
import {
  getStatusIndicatorColor,
  getActivePeerString,
} from '../../helpers/HighAvailabilityHelpers';
import {HighAvailability} from '../../constants/NetworkConstants';
import {BinaryStarFsmState} from '../../../thrift/gen-nodejs/Controller_types';

const possibleStates = [
  ...Object.values(HighAvailability),
  ...Object.values(BinaryStarFsmState),
];

const propTypes = {
  primary: PropTypes.oneOf(possibleStates),
  backup: PropTypes.oneOf(possibleStates),
};

const HAStatusMenuTitle = ({primary, backup}) => {
  return (
    <span>
      <StatusIndicator color={getStatusIndicatorColor(primary, backup)} />
      <span className="controller-status">
        {'E2E '}
        <span className="peer-type">
          {getActivePeerString(primary, backup)}
        </span>
      </span>
    </span>
  );
};

HAStatusMenuTitle.propTypes = propTypes;
export default HAStatusMenuTitle;
