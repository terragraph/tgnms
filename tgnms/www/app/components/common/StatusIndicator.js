/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

const propTypes = {
  online: PropTypes.bool.isRequired,
};

const StatusIndicator = ({online}) => (
  <span
    className={cx({
      'status-indicator': true,
      online,
      offline: !online,
    })}
  />
);

StatusIndicator.propTypes = propTypes;
export default StatusIndicator;
