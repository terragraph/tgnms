/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

const propTypes = {
  online: PropTypes.bool,
  color: PropTypes.string,
};

const StatusIndicator = ({online, color}) => {
  let extraClasses;
  if (online !== undefined && online !== null) {
    extraClasses = {
      online,
      offline: !online,
    };
  } else if (color !== undefined && color !== null) {
    extraClasses = {
      [color]: true,
    };
  }

  return (
    <span
      className={cx({
        'status-indicator': true,
        ...extraClasses,
      })}
    />
  );
};

StatusIndicator.propTypes = propTypes;
export default StatusIndicator;
