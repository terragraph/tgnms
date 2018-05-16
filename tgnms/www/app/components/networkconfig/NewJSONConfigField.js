/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import PropTypes from 'prop-types';

import React from "react";
import { render } from "react-dom";

import { editNewField } from "../../actions/NetworkConfigActions.js";
import { ADD_FIELD_TYPES } from "../../constants/NetworkConfigConstants.js";
import CustomToggle from "../common/CustomToggle.js";

const classNames = require("classnames");

export default class NewJSONConfigField extends React.Component {
  constructor(props) {
    super(props);
  }

  changeField = field => {
    const { editPath, fieldId, value } = this.props;
    editNewField({
      editPath,
      id: fieldId,
      field,
      value
    });
  };

  changeValue = value => {
    const { editPath, fieldId, field } = this.props;
    editNewField({
      editPath,
      id: fieldId,
      field,
      value
    });
  };

  onSubmitNewField = event => {
    const { editPath, fieldId, field, value } = this.props;
    this.props.onSubmit(editPath, fieldId, field, value);
    event.preventDefault();
  };

  onDeleteNewField = () => {
    const { editPath, fieldId } = this.props;
    this.props.onDelete(editPath, fieldId);
  };

  renderToggle = () => {
    const { editPath, fieldId, value } = this.props;
    const checkboxId = JSON.stringify([...editPath, fieldId]);

    return (
      <CustomToggle
        checkboxId={checkboxId}
        value={value}
        onChange={value => this.changeValue(value)}
      />
    );
  };

  renderInputItem = (type, value) => {
    let inputItem = <span>Invalid Type!</span>;

    switch (type) {
      case ADD_FIELD_TYPES.BOOLEAN:
        inputItem = this.renderToggle();
        break;
      case ADD_FIELD_TYPES.NUMBER:
        inputItem = (
          <form
            className="nc-form-input-wrapper"
            onSubmit={this.onSubmitNewField}
          >
            <input
              className="config-form-input"
              type="number"
              value={value}
              onChange={event => this.changeValue(Number(event.target.value))}
            />
          </form>
        );
        break;
      case ADD_FIELD_TYPES.STRING:
        inputItem = (
          <form
            className="nc-form-input-wrapper"
            onSubmit={this.onSubmitNewField}
          >
            <input
              className="config-form-input"
              type="text"
              value={value}
              placeholder="Enter a value for the new field"
              onChange={event => this.changeValue(event.target.value)}
            />
          </form>
        );
        break;
    }

    return inputItem;
  };

  render() {
    const { canSubmit, fieldId, type, field, value } = this.props;
    const newFieldInput = this.renderInputItem(type, value);

    const fieldClass = "";

    return (
      <div className="rc-new-json-config-field">
        <form className="nc-new-field-label" onSubmit={this.onSubmitNewField}>
          <input
            className={fieldClass}
            type="text"
            placeholder="Field Name"
            value={field}
            onChange={event => this.changeField(event.target.value)}
          />
        </form>
        <div className="nc-form-body">
          {newFieldInput}

          {canSubmit && (
            <div className="nc-form-action">
              <img
                src="/static/images/check.png"
                style={{ marginLeft: "5px" }}
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
              style={{ marginLeft: "5px", height: "19px" }}
              onClick={this.onDeleteNewField}
            />
            <span className="nc-form-action-tooltip">Delete new field</span>
          </div>
        </div>
      </div>
    );
  }
}

// add is handled by the parent
NewJSONConfigField.propTypes = {
  canSubmit: PropTypes.bool.isRequired,

  fieldId: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,

  editPath: PropTypes.array.isRequired,
  onSubmit: PropTypes.func,
  onDelete: PropTypes.func.isRequired
};

NewJSONConfigField.defaultProps = {
  onSubmit: () => {}
};
