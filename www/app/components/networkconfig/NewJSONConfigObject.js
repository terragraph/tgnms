// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { ADD_FIELD_TYPES } from '../../constants/NetworkConfigConstants.js';

export default class NewJSONConfigObject extends React.Component {
  constructor(props) {
    super(props);
  }

  changeField = (field) => {
    const {editPath, fieldId, value} = this.props;
  }

  changeValue = (value) => {
    const {editPath, fieldId, field} = this.props;
  }

  onSubmitNewField = (event) => {
    const {editPath, fieldId, field, value} = this.props;
    event.preventDefault();
  }

  onDeleteNewField = () => {
    // id
  }

  render() {
    return (
      <div className='rc-new-json-config-object'>
      </div>
    );
  }
}

// add is handled by the parent
NewJSONConfigObject.propTypes = {
}
