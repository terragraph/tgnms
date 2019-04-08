/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {withStyles} from '@material-ui/core/styles';

const styles = {
  dragger: {
    backgroundColor: '#f4f7f9',
  },
  horizontal: {
    width: 5,
    height: '100%',
    cursor: 'ew-resize',
    borderLeft: '1px solid #ddd',
  },
  vertical: {
    height: 5,
    width: '100%',
    cursor: 'ns-resize',
    borderTop: '1px solid #ddd',
  },
};

const Direction = Object.freeze({
  horizontal: 'horizontal',
  vertical: 'vertical',
});

class Dragger extends React.Component {
  state = {
    isResizing: false,
  };

  componentDidMount() {
    document.addEventListener('mousemove', this.handleMousemove);
    document.addEventListener('mouseup', this.handleMouseup);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleMousemove);
    document.removeEventListener('mouseup', this.handleMouseup);
  }

  clamp(i, min, max) {
    // Clamp a number between the given bounds
    return Math.min(Math.max(i, min), max);
  }

  handleMousedown = e => {
    // Activate dragging ability when the dragger is clicked on
    this.setState({isResizing: true});

    // Prevent any text from highlighting
    e.preventDefault();
  };

  handleMousemove = e => {
    // Only resize if mouse was clicked on the dragger
    const {direction, minSize, maxSize, onResize} = this.props;
    const {isResizing} = this.state;
    if (!isResizing) {
      return;
    }

    // Prevent any text from highlighting
    e.preventDefault();

    // Compute new offset (and clamp within bounds)
    const offset =
      direction === Direction.horizontal
        ? document.body.offsetWidth - (e.clientX - document.body.offsetLeft)
        : document.body.offsetHeight - (e.clientY - document.body.offsetTop);
    onResize(this.clamp(offset, minSize, maxSize));
  };

  handleMouseup = _e => {
    // Disable resizing after mouse is up
    this.setState({isResizing: false});
  };

  render() {
    const {classes, direction} = this.props;
    return (
      <div
        className={classNames(classes.dragger, classes[direction])}
        onMouseDown={this.handleMousedown}
      />
    );
  }
}

Dragger.propTypes = {
  classes: PropTypes.object.isRequired,
  direction: PropTypes.oneOf(Object.keys(Direction)).isRequired,
  minSize: PropTypes.number.isRequired,
  maxSize: PropTypes.number.isRequired,
  onResize: PropTypes.func,
};

export default withStyles(styles)(Dragger);
