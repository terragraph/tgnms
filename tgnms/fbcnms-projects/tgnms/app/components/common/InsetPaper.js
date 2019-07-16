/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import warning from 'warning';
import {withStyles} from '@material-ui/core/styles';

/* Inspired by: https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/Paper/Paper.js */

const styles = theme => {
  const depressions = {};
  theme.shadows.forEach((_, index) => {
    depressions[`depression${index}`] = {
      boxShadow: `inset 0 ${index}px ${2 *
        index}px rgba(0,0,0,.39), 0 -1px 1px #fff, 0 1px 0 #fff`,
    };
  });

  return {
    root: {
      border: '1px solid transparent',
      borderBottom: '1px solid #ddd',
      borderTop: 'none',
    },
    rounded: {
      borderRadius: theme.shape.borderRadius,
    },
    ...depressions,
  };
};

class InsetPaper extends React.Component {
  static defaultProps = {
    component: 'div',
    depression: 2,
    rounded: false,
  };

  render() {
    const {
      classes,
      className: classNameProp,
      component: Component,
      depression,
      rounded,
      ...other
    } = this.props;

    warning(
      depression >= 0 && depression < 25,
      `InsetPaper: This depression \`${depression}\` is not implemented.`,
    );

    const className = classNames(
      classes.root,
      classes[`depression${depression}`],
      {[classes.rounded]: rounded},
      classNameProp,
    );

    return <Component className={className} {...other} />;
  }
}

InsetPaper.propTypes = {
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  component: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  depression: PropTypes.number,
  rounded: PropTypes.bool,
};

export default withStyles(styles)(InsetPaper);
