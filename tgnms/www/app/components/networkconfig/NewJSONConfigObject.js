/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import 'sweetalert/dist/sweetalert.css';

import {
  editNewField,
  deleteNewField,
} from '../../actions/NetworkConfigActions.js';
import {ADD_FIELD_TYPES} from '../../constants/NetworkConfigConstants.js';
import {convertAndValidateNewConfigObject} from '../../helpers/NetworkConfigHelpers.js';
import AddJSONConfigField from './AddJSONConfigField.js';
import NewJSONConfigField from './NewJSONConfigField.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';
import swal from 'sweetalert';

const validationAlertProps = validationMsg => ({
  title: 'Submit failed: validation errors',
  text: validationMsg,
  type: 'error',
});

export default class NewJSONConfigObject extends React.Component {
  constructor(props) {
    super(props);
  }

  changeField(field) {
    const {editPath, fieldId, value} = this.props;
    editNewField({
      editPath,
      id: fieldId,
      field,
      value,
    });
  }

  // X on the left
  onSubmitNewField = event => {
    const {editPath, fieldId, field, value} = this.props;
    const configToSubmit = convertAndValidateNewConfigObject(value);

    // config, validationMsg
    if (configToSubmit.config === undefined) {
      swal(validationAlertProps(configToSubmit.validationMsg));
    } else {
      // valid config to submit
      this.props.onSubmit(editPath, fieldId, field, configToSubmit.config);
    }

    event.preventDefault();
  };

  onDeleteNewField = () => {
    const {editPath, fieldId} = this.props;
    this.props.onDelete(editPath, fieldId);
  };

  renderChildren(children) {
    const {editPath, fieldId} = this.props;

    // we know that value is an object
    return Object.keys(children).map(childId => {
      const {id, type, field, value} = children[childId];
      const newEditPath = [...editPath, fieldId, 'value'];

      const newFieldProps = {
        canSubmit: false,
        fieldId: id,
        type: type,
        field: field,
        value: value,
        editPath: newEditPath,
        onDelete: (ep, fi) => deleteNewField({editPath: ep, id: fi}),
      };

      let childItem = <span>Invalid type!</span>;

      switch (type) {
        case ADD_FIELD_TYPES.BOOLEAN:
        case ADD_FIELD_TYPES.STRING:
        case ADD_FIELD_TYPES.NUMBER:
          childItem = <NewJSONConfigField {...newFieldProps} />;
          break;
        case ADD_FIELD_TYPES.OBJECT:
          childItem = <NewJSONConfigObject {...newFieldProps} />;
          break;
      }

      return <li className="rc-json-config-input">{childItem}</li>;
    });
  }

  render() {
    const {canSubmit, editPath, fieldId, type, field, value} = this.props;
    const fieldClass = '';
    const nestedNewFields = this.renderChildren(value);

    const addFieldButton = (
      <AddJSONConfigField editPath={[...editPath, fieldId, 'value']} />
    );

    return (
      <div className="rc-new-json-config-object">
        <form
          className="nc-object-field-label"
          onSubmit={this.onSubmitNewField}>
          <input
            className={fieldClass}
            type="text"
            placeholder="Field Name"
            value={field}
            onChange={event => this.changeField(event.target.value)}
          />
        </form>
        <div className="nc-object-field-body">
          {canSubmit && (
            <div className="nc-form-action">
              <img
                src="/static/images/check.png"
                style={{marginLeft: '5px'}}
                onClick={this.onSubmitNewField}
              />
              <span className="nc-form-action-tooltip">
                Add new field to override
              </span>
            </div>
          )}

          <div className="nc-form-action">
            <img
              src="/static/images/delete.png"
              style={{marginLeft: '5px', height: '19px'}}
              onClick={this.onDeleteNewField}
            />
            <span className="nc-form-action-tooltip">Delete new field</span>
          </div>
        </div>

        <ul>{[...nestedNewFields, addFieldButton]}</ul>
      </div>
    );
  }
}

// add is handled by the parent
NewJSONConfigObject.propTypes = {
  canSubmit: PropTypes.bool.isRequired,

  fieldId: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,

  editPath: PropTypes.array.isRequired,
  onSubmit: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
};

NewJSONConfigObject.defaultProps = {
  onSubmit: () => {},
};
