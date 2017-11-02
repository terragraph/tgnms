import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');

import { REVERT_VALUE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';
import {editConfigForm, revertConfigOverride, undoRevertConfig} from '../../actions/NetworkConfigActions.js';
import JSONFieldTooltip from './JSONFieldTooltip.js';

// JSONFormField renders the "leaf" nodes of a JSON form, namely: bool/string/number fields
// a separate component is needed for this to reduce the file size of JSONConfigForm
export default class JSONFormField extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      focus: false
    };
  }

  editField = (value) => {
    // console.log('edit value', value, typeof value);
    editConfigForm({
      editPath: this.props.editPath,
      value
    });
  }

  revertField = () => {
    console.log('reverting field: ', this.props.editPath);
    revertConfigOverride({
      editPath: this.props.editPath,
    });
  }

  undoRevert = () => {
    console.log('undoing revert: ', this.props.editPath);
    undoRevertConfig({
      editPath: this.props.editPath,
    });
  }

  getClassName = (providedClass, displayIdx, isDraft, isReverted) => {
    let className = {};
    className[providedClass] = true;

    className[CONFIG_CLASSNAMES.BASE] = displayIdx <= 0 && !isDraft;
    className[CONFIG_CLASSNAMES.NETWORK] = displayIdx === 1 && !isDraft;
    className[CONFIG_CLASSNAMES.NODE] = displayIdx >= 2 && !isDraft;

    className[CONFIG_CLASSNAMES.DRAFT] = isDraft;
    className[CONFIG_CLASSNAMES.REVERT] = isReverted;

    return classNames(className);
  }

  getCheckboxStyle = (displayIdx, isDraft, isReverted) => {

  }

  renderInputItem = (displayVal, displayIdx, isDraft, isReverted) => {
    let inputItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    const inputClass = this.getClassName('config-form-input', displayIdx, isDraft, isReverted);

    switch (typeof displayVal) {
      case 'boolean':
        inputItem = (
          <input type='checkbox' checked={displayVal}
            onChange={(event) => this.editField(event.target.checked)}
          />
        );
        break;
      case 'number':
        inputItem = (
          <input className={inputClass} type='number'
            value={displayVal}
            onChange={(event) => this.editField( Number(event.target.value) )}
            onFocus={() => this.setState({focus: true})}
            onBlur={() => this.setState({focus: false})}
          />
        );
        break;
      case 'string':
        inputItem = (
          <input className={inputClass} type='text'
            value={displayVal}
            onChange={(event) => this.editField(event.target.value)}
            onFocus={() => this.setState({focus: true})}
            onBlur={() => this.setState({focus: false})}
          />
        );
        break;
    }
    return inputItem;
  }

  isRevertable = (displayIdx, values) => {
    return displayIdx === values.length - 1;
  }

  render() {
    const {
      formLabel,
      displayIdx,
      values,
      draftValue,

      isReverted,
      isDraft,
      displayVal,
    } = this.props;
    const {focus} = this.state;

    const formInputElement = this.renderInputItem(displayVal, displayIdx, isDraft, isReverted);

    return (
      <div className={classNames({'rc-json-form-field': true, 'json-field-focused': focus})}>
        <label className='config-form-label'>{formLabel}:</label>

        <div style={{display: 'inline', position: 'relative'}}>
          {formInputElement}
          {focus && <JSONFieldTooltip values={values}/>}
        </div>

        {this.isRevertable(displayIdx, values) &&
          <img src='/static/images/undo.png'
            style={{marginLeft: '5px'}}
            onClick={this.revertField}
            title='Remove override value'
          />
        }
        {isReverted &&
          <img src='/static/images/refresh.png'
            style={{marginLeft: '5px', height: '18px', 'width': '18px'}}
            onClick={this.undoRevert}
            title='Undo revert override'
          />
        }
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
