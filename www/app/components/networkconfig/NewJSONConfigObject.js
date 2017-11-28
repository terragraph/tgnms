// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { editNewField, deleteNewField } from '../../actions/NetworkConfigActions.js';
import { ADD_FIELD_TYPES } from '../../constants/NetworkConfigConstants.js';

import AddJSONConfigField from './AddJSONConfigField.js';
import NewJSONConfigField from './NewJSONConfigField.js';

export default class NewJSONConfigObject extends React.Component {
  constructor(props) {
    super(props);
  }

  changeField = (field) => {
    const {editPath, fieldId, value} = this.props;
    editNewField({
      editPath,
      id: fieldId,
      field,
      value
    });
  }


  onSubmitNewField = (event) => {
    const {editPath, fieldId, field, value} = this.props;

    // do own validation and conversion here

    // then call this.props.onSubmit
    event.preventDefault();
  }

  onDeleteNewField = () => {
    const {editPath, fieldId} = this.props;
    this.props.onDelete(editPath, fieldId);
  }

  renderChildren = (children) => {
    const {editPath, fieldId} = this.props;

    // we know that value is an object
    return Object.keys(children).map((childId) => {
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

      switch (type) {
        case ADD_FIELD_TYPES.BOOLEAN:
        case ADD_FIELD_TYPES.STRING:
        case ADD_FIELD_TYPES.NUMBER:
          return (
            <li className='rc-json-config-input'>
              <NewJSONConfigField
                {...newFieldProps}
              />
            </li>
          );
          break;
        case ADD_FIELD_TYPES.OBJECT:
          return (
            <li className='rc-json-config-input'>
              <NewJSONConfigObject
                {...newFieldProps}
              />
            </li>
          );
          break;
      }

      return (
        <li className='rc-json-config-input'>Invalid type!</li>
      );
    });
  }

  render() {
    const {canSubmit, editPath, fieldId, type, field, value} = this.props;

    const fieldClass = '';
    const nestedNewFields = this.renderChildren(value);

    const addFieldButton = (
      <AddJSONConfigField
        editPath={[...editPath, fieldId, 'value']}
      />
    );

    return (
      <div className='rc-new-json-config-object'>
        <form className='nc-new-field-label' onSubmit={this.onSubmitNewField}>
          <input className={fieldClass} type='text'
            placeholder='Field Name'
            value={field}
            onChange={(event) => this.changeField(event.target.value)}
          />
        </form>
        <ul>{[...nestedNewFields, addFieldButton]}</ul>
      </div>
    );
  }
}

// add is handled by the parent
NewJSONConfigObject.propTypes = {
  canSubmit: React.PropTypes.bool.isRequired,

  fieldId: React.PropTypes.string.isRequired,
  field: React.PropTypes.string.isRequired,
  value: React.PropTypes.any.isRequired,

  editPath: React.PropTypes.array.isRequired,
  onSubmit: React.PropTypes.func,
  onDelete: React.PropTypes.func.isRequired,
}

NewJSONConfigObject.defaultProps = {
  onSubmit: () => {}
}
