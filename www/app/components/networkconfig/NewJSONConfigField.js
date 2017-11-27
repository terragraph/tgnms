// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { ADD_FIELD_TYPES } from '../../constants/NetworkConfigConstants.js';

export default class NewJSONConfigField extends React.Component {
  constructor(props) {
    super(props);
  }

  changeField = (field) => {
    const {editPath, fieldId, value} = this.props;
    this.props.onEdit(editPath, fieldId, field, value);
  }

  changeValue = (value) => {
    const {editPath, fieldId, field} = this.props;
    this.props.onEdit(editPath, fieldId, field, value);
  }

  onSubmitNewField = (event) => {
    const {editPath, fieldId, field, value} = this.props;
    this.props.onSubmit(editPath, fieldId, field, value);
    event.preventDefault();
  }

  onDeleteNewField = () => {
    this.props.onDelete(this.props.fieldId);
  }

  renderToggle = () => {
    const {editPath, fieldId, value} = this.props;
    const checkboxId = JSON.stringify([...editPath, fieldId]);

    return (
      <div className='nc-form-input-wrapper'>
        <input
          type='checkbox' className='nc-custom-checkbox' id={checkboxId} checked={value}
          onChange={(event) => this.changeValue(event.target.checked)}
        />
        <label className='nc-slider-label' htmlFor={checkboxId} style={{marginBottom: '0px'}}>
          <div className='nc-slider-wrapper'>
            <div className='nc-slider-options'>
              <div className='nc-slider-option'>Yes</div>
              <div className='nc-slider-option-selector'></div>
              <div className='nc-slider-option'>No</div>
            </div>
          </div>
        </label>
      </div>
    );
  }

  renderInputItem = (type, value) => {
    let inputItem = (
      <span>Invalid Type!</span>
    );

    switch(type) {
      case ADD_FIELD_TYPES.BOOLEAN:
        inputItem = this.renderToggle();
        break;
      case ADD_FIELD_TYPES.NUMBER:
        inputItem = (
          <form className='nc-form-input-wrapper' onSubmit={this.onSubmitNewField}>
            <input className='config-form-input' type='number' value={value}
              onChange={(event) => this.changeValue( Number(event.target.value) )}
            />
          </form>
        );
        break;
      case ADD_FIELD_TYPES.STRING:
        inputItem = (
          <form className='nc-form-input-wrapper' onSubmit={this.onSubmitNewField}>
            <input className='config-form-input' type='text' value={value}
              placeholder='Enter a value for the new field'
              onChange={(event) => this.changeValue(event.target.value)}
            />
          </form>
        );
        break;
    }

    return inputItem;
  }

  render() {
    const {fieldId, type, field, value} = this.props;
    const newFieldInput = this.renderInputItem(type, value);

    const fieldClass = '';

    return (
      <div className='rc-new-json-config-field'>
        <form className='nc-new-field-label' onSubmit={this.onSubmitNewField}>
          <input className={fieldClass} type='text'
            placeholder='Field Name'
            value={field}
            onChange={(event) => this.changeField(event.target.value)}
          />
        </form>
        <div className='nc-form-body'>
          {newFieldInput}
          <div className='nc-form-action'>
            <img src='/static/images/check.png'
              style={{marginLeft: '5px'}}
              onClick={this.onSubmitNewField}
            />
            <span className='nc-form-action-tooltip'>Add new field to override</span>
          </div>
          <div className='nc-form-action'>
            <img src='/static/images/delete.png'
              style={{marginLeft: '5px', height: '19px'}}
              onClick={this.onDeleteNewField}
            />
            <span className='nc-form-action-tooltip'>Delete new field</span>
          </div>
        </div>
      </div>
    );
  }
}

// add is handled by the parent
NewJSONConfigField.propTypes = {
  fieldId: React.PropTypes.string.isRequired,
  type: React.PropTypes.string.isRequired,
  field: React.PropTypes.string.isRequired,
  value: React.PropTypes.any.isRequired,

  editPath: React.PropTypes.array.isRequired,
  onEdit: React.PropTypes.func.isRequired,
  onSubmit: React.PropTypes.func.isRequired,
  onDelete: React.PropTypes.func.isRequired,
}
