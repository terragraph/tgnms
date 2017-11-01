import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');

import {editConfigForm, revertConfigOverride} from '../../actions/NetworkConfigActions.js';

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
    // TODO
    console.log('reverting field: ', this.props.editPath);
    revertConfigOverride({
      editPath: this.props.editPath,
    });
  }

  // throwaway bg color function since I'm lazy
  getBackgroundColor = (displayIdx, isDraft) => {
    var backgroundColor = '#fff';
    if (isDraft) {
      // RED
      backgroundColor = '#ffaaaa';
    } else if (displayIdx === 1) {
      // BLUE
      backgroundColor = 'rgb(183,210,255)';
    } else if (displayIdx >= 2) {
      // GREEN
      backgroundColor = '#aaffaa';
    }
    return backgroundColor;
  }

  renderInputItem = (displayVal, displayIdx, isDraft) => {
    let inputItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    switch (typeof displayVal) {
      case 'boolean':
        inputItem = (
          <input type='checkbox' checked={displayVal}
            style={{backgroundColor: this.getBackgroundColor(displayIdx, isDraft), display: 'table-cell'}}
            onChange={(event) => this.editField(event.target.checked)}
          />
        );
        break;
      case 'number':
        inputItem = (
          <input className='config-form-input' type='number'
            value={displayVal}
            style={{backgroundColor: this.getBackgroundColor(displayIdx, isDraft), display: 'table-cell'}}
            onChange={(event) => this.editField( Number(event.target.value) )}
            onFocus={() => this.setState({focus: true})}
            onBlur={() => this.setState({focus: false})}
          />
        );
        break;
      case 'string':
        inputItem = (
          <input className='config-form-input' type='text'
            value={displayVal}
            style={{backgroundColor: this.getBackgroundColor(displayIdx, isDraft), display: 'table-cell'}}
            onChange={(event) => this.editField(event.target.value)}
            onFocus={() => this.setState({focus: true})}
            onBlur={() => this.setState({focus: false})}
          />
        );
        break;
    }
    return inputItem;
  }

  render() {
    const {
      formLabel,
      displayIdx,
      values,
      draftValue,
    } = this.props;
    const {focus} = this.state;

    const isDraft = draftValue !== undefined;
    const displayVal = isDraft ? draftValue : values[displayIdx]

    const formInputElement = this.renderInputItem(
      displayVal, displayIdx, isDraft
    );

    return (
      <div className={classNames({'rc-json-form-field': true, 'json-field-focused': focus})}>
        <label className='config-form-label'>
          {formLabel}:
        </label>
        {formInputElement}
        <img src='/static/images/undo.png'
          style={{marginLeft: '5px'}}
          onClick={this.revertField}
          title='Remove override value'
        />
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
}
