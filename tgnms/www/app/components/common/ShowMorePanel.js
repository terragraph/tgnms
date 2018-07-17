/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import {Glyphicon} from 'react-bootstrap';

export default class ShowMorePanel extends React.Component {
  static propTypes = {
    buttonClass: PropTypes.string,
    lessButtonName: PropTypes.string,
    moreButtonName: PropTypes.string,
  };

  static defaultProps = {
    moreButtonName: 'Show More',
    lessButtonName: 'Show Less',
  };

  state = {
    showMore: false,
  };

  onButtonClick = showMore => {
    this.setState({showMore});
  };

  render() {
    const {buttonClass, children, lessButtonName, moreButtonName} = this.props;
    const {showMore} = this.state;

    return (
      <div>
        {showMore && children}
        <button
          className={buttonClass}
          onClick={() => this.onButtonClick(!showMore)}>
          {showMore ? lessButtonName : moreButtonName}
          <Glyphicon glyph={showMore ? 'chevron-up' : 'chevron-down'} />
        </button>
      </div>
    );
  }
}
