// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { ADD_FIELD_TYPES } from '../../constants/NetworkConfigConstants.js';

export default class NewJSONConfigField extends React.Component {
  constructor(props) {
    super(props);

    let defaultValue = '';
    switch(props.type) {
      case ADD_FIELD_TYPES.BOOLEAN:
        defaultValue = true;
        break;
      case ADD_FIELD_TYPES.NUMBER:
        defaultValue = 0;
        break;
      case ADD_FIELD_TYPES.STRING:
        defaultValue = '';
        break;
      default:
        console.error('Error, invalid type detected for adding a new field');
    }

    this.state = {
      field: '',
      value: defaultValue,
    };
  }

  changeField = (field) => {
    this.setState({field: field});
  }

  changeValue = (value) => {
    this.setState({value: value});
  }

  onSubmitNewField = (event) => {
    const {field, value} = this.state;
    console.log(`submitting: ${field}: ${value}`);
    // TODO: dispatch an action here!
    event.preventDefault();
  }

  onDeleteNewField = () => {
    const {field, value} = this.state;
    console.log(`deleting: ${field}: ${value}`);
  }

  renderToggle = () => {
    // or we can use a stringified version of the editPath for the id
    const checkboxId = JSON.stringify([...this.props.editPath, this.props.key]);

    return (
      <div className='nc-form-input-wrapper'>
        <input
          type='checkbox' className='nc-custom-checkbox' id={checkboxId} checked={this.state.value}
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

  renderInputItem = (type) => {
    const {value} = this.state;
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
    const {key, type} = this.props;
    const {field, value} = this.state;
    const newFieldInput = this.renderInputItem(type);

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
            <img src='/static/images/undo.png'
              style={{marginLeft: '5px'}}
              onClick={this.onDeleteNewField}
            />
            <span className='nc-form-action-tooltip'>Delete New Field</span>
          </div>
        </div>
      </div>
    );
  }
}

NewJSONConfigField.propTypes = {
  editPath: React.PropTypes.array.isRequired,
  key: React.PropTypes.number.isRequired,
  type: React.PropTypes.string.isRequired,
  onDelete: React.PropTypes.func.isRequired,
}
