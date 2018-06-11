/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

//

import PropTypes from 'prop-types';
import React from 'react';

export default class JSONEditPanel extends React.PureComponent {
  static propTypes = {
    isJSONText: PropTypes.bool.isRequired,
    onEdit: PropTypes.func.isRequired,
    onFinishEdit: PropTypes.func.isRequired,
  };

  render() {
    const {isJSONText, onEdit, onFinishEdit} = this.props;

    if (!isJSONText) {
      return (
        <button className="nc-expand-all-btn" onClick={onEdit}>
          Edit as JSON
        </button>
      );
    } else {
      return (
        <div>
          <button
            className="nc-expand-all-btn"
            onClick={() => onFinishEdit(false)}>
            Cancel
          </button>
          <button
            className="nc-expand-all-btn"
            onClick={() => onFinishEdit(true)}>
            Done
          </button>
        </div>
      );
    }
  }
}
