import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');
const uuidv4 = require('uuid/v4');

import { REVERT_VALUE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';
import {editConfigForm, revertConfigOverride, undoRevertConfig} from '../../actions/NetworkConfigActions.js';
import JSONFieldTooltip from './JSONFieldTooltip.js';

// JSONFormField renders the "leaf" nodes of a JSON form, namely: bool/string/number fields
// a separate component is needed for this to reduce the file size of JSONConfigForm
export default class JSONFormField extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      focus: false,
      hover: false,
    };
  }

  editField = (value) => {
    editConfigForm({
      editPath: this.props.editPath,
      value
    });
  }

  revertField = () => {
    revertConfigOverride({
      editPath: this.props.editPath,
    });
  }

  undoRevert = () => {
    undoRevertConfig({
      editPath: this.props.editPath,
    });
  }

  getClassName = (providedClass, displayIdx, isDraft, isReverted) => {
    let className = {};
    className[providedClass] = true;

    className[CONFIG_CLASSNAMES.MISSING] = displayIdx < 0 && !isDraft;
    className[CONFIG_CLASSNAMES.BASE] = displayIdx === 0 && !isDraft;
    className[CONFIG_CLASSNAMES.NETWORK] = displayIdx === 1 && !isDraft;
    className[CONFIG_CLASSNAMES.NODE] = displayIdx >= 2 && !isDraft;

    className[CONFIG_CLASSNAMES.DRAFT] = isDraft;
    className[CONFIG_CLASSNAMES.REVERT] = isReverted;

    return classNames(className);
  }

  // hack: since we need the htmlFor and an id for the checkbox,
  renderToggle = (displayVal, displayIdx, isDraft, isReverted) => {
    const {focus, hover} = this.state;

    // or we can use a stringified version of the editPath for the id
    const checkboxId = JSON.stringify(this.props.editPath);
    const selectorClass = this.getClassName('nc-slider-option', displayIdx, isDraft, false);

    // style hack because the revert class cannot override the class for the wrapper
    const wrapperStyle = isReverted ? {
      border: '2px solid #000077'
    } : {};

    return (
      <div className='nc-form-input-wrapper'>
        <input
          type='checkbox' className='nc-custom-checkbox' id={checkboxId} checked={displayVal}
          onChange={(event) => this.editField(event.target.checked)}
          onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
        />
        <label className='nc-slider-label' htmlFor={checkboxId} style={{marginBottom: '0px'}}>
          <div className='nc-slider-wrapper' style={wrapperStyle}>
            <div className='nc-slider-options'>
              <div className={selectorClass}>Yes</div>
              <div className='nc-slider-option-selector'></div>
              <div className={selectorClass}>No</div>
            </div>
          </div>
        </label>
        {hover && <JSONFieldTooltip values={this.props.values}/>}
      </div>
    );
  }

  renderInputItem = (displayVal, displayIdx, isDraft, isReverted) => {
    const {focus, hover} = this.state;

    let inputItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    const inputClass = this.getClassName('config-form-input', displayIdx, isDraft, isReverted);
    const checkboxClass = this.getClassName('config-form-checkbox', displayIdx, isDraft, isReverted);
    switch (typeof displayVal) {
      case 'boolean':
        inputItem = this.renderToggle(displayVal, displayIdx, isDraft, isReverted);
        break;
      case 'number':
        inputItem = (
          <div className='nc-form-input-wrapper'>
            <input className={inputClass} type='number' value={displayVal}
              onChange={(event) => this.editField( Number(event.target.value) )}
              onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
            />
            {(focus || hover) && <JSONFieldTooltip values={this.props.values}/>}
          </div>
        );
        break;
      case 'string':
        inputItem = (
          <div className='nc-form-input-wrapper'>
            <input className={inputClass} type='text' value={displayVal}
              onChange={(event) => this.editField(event.target.value)}
              onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
            />
            {(focus || hover) && <JSONFieldTooltip values={this.props.values}/>}
          </div>
        );
        break;
    }
    return inputItem;
  }

  isRevertable = (displayIdx, values) => {
    return displayIdx === values.length - 1;
  }

  render() {
    const {formLabel, displayIdx, values, draftValue, isReverted, isDraft, displayVal} = this.props;
    const {focus, hover} = this.state;

    const formInputElement = this.renderInputItem(displayVal, displayIdx, isDraft, isReverted);

    return (
      <div
        className={classNames('rc-json-form-field', {'json-field-focused': focus || hover})}
        onMouseEnter={() => this.setState({hover: true})}
        onMouseLeave={() => this.setState({hover: false})}
      >
        <label className='nc-form-label'>{formLabel}:</label>

        <div className='nc-form-body'>
          {formInputElement}
          {this.isRevertable(displayIdx, values) && !isDraft &&
            <div className='nc-form-action'>
              <img src='/static/images/undo.png'
                style={{marginLeft: '5px'}}
                onClick={this.revertField}
              />
              <span className='nc-form-action-tooltip'>Remove override value</span>
            </div>
          }
          {(isReverted || isDraft) &&
            <div className='nc-form-action'>
              <img src='/static/images/refresh.png'
                style={{marginLeft: '5px', height: '18px', 'width': '18px'}}
                onClick={this.undoRevert}
              />
              <span className='nc-form-action-tooltip'>Discard unsaved value</span>
            </div>
          }
        </div>
      </div>
    );
  }
}

JSONFormField.propTypes = {
  editPath: React.PropTypes.array.isRequired,

  formLabel: React.PropTypes.string.isRequired,   // the field name for the value we are displaying
  displayIdx: React.PropTypes.number.isRequired,  // the index within values to display if not a draft
  values: React.PropTypes.array.isRequired,
  draftValue: React.PropTypes.any.isRequired,

  isReverted: React.PropTypes.bool.isRequired,
  isDraft: React.PropTypes.bool.isRequired,
  displayVal: React.PropTypes.any.isRequired,
}
