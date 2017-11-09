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
      focus: false,
      hover: false,
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
    // console.log('reverting field: ', this.props.editPath);
    revertConfigOverride({
      editPath: this.props.editPath,
    });
  }

  undoRevert = () => {
    // console.log('undoing revert: ', this.props.editPath);
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

  renderInputItem = (displayVal, displayIdx, isDraft, isReverted) => {
    const {focus, hover} = this.state;

    let inputItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    const inputClass = this.getClassName('config-form-input', displayIdx, isDraft, isReverted);
    const checkboxClass = this.getClassName('config-form-checkbox', displayIdx, isDraft, isReverted);
    switch (typeof displayVal) {
      case 'boolean':
        // hack: clicking the checkbox focuses it
        inputItem = (
          <div className={checkboxClass}>
            <input type='checkbox' checked={displayVal}
              onChange={(event) => this.editField(event.target.checked)}
              onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
              onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})}
            />
            {(hover) && <JSONFieldTooltip values={this.props.values}/>}
          </div>
        );
        break;
      case 'number':
        inputItem = (
          <div style={{display: 'inline', position: 'relative'}}>
            <input className={inputClass} type='number' value={displayVal}
              onChange={(event) => this.editField( Number(event.target.value) )}
              onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
              onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})}
            />
            {(focus || hover) && <JSONFieldTooltip values={this.props.values}/>}
          </div>
        );
        break;
      case 'string':
        inputItem = (
          <div style={{display: 'inline', position: 'relative'}}>
            <input className={inputClass} type='text' value={displayVal}
              onChange={(event) => this.editField(event.target.value)}
              onFocus={() => this.setState({focus: true})} onBlur={() => this.setState({focus: false})}
              onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})}
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
      <div className={classNames({'rc-json-form-field': true, 'json-field-focused': focus || hover})}>
        <label className='config-form-label'>{formLabel}:</label>
        {formInputElement}

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
