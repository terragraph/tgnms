// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);

    //
    this.state = {
      expanded: true
    };
  }

  // helper methods to render each field
  // assume no arrays

  // TODO: onchange for everything!

  renderBooleanInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input type="checkbox" checked={value} />
      </li>
    );
  }

  renderNumericInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input type="number" value={value} />
      </li>
    );
  }

  renderTextInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input type="text" value={value} />
      </li>
    );
  }

  renderNestedObject = (fieldName, nestedConfig) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <JSONConfigForm config={nestedConfig}/>
      </li>
    );
  }

  renderChildItems = (config) => {
    return Object.keys(config).map((field) => {
      const configVal = config[field];
      let childItem = (
        <li>
          <label className='config-form-label'>{field}:</label>
        </li>
      );

      // string, number, boolean, object
      switch (typeof configVal) {
        case 'boolean':
          childItem = this.renderBooleanInput(field, configVal);
          break;
        case 'number':
          childItem = this.renderNumericInput(field, configVal);
          break;
        case 'string':
          childItem = this.renderTextInput(field, configVal);
          break;
        case 'object':
          childItem = this.renderNestedObject(field, configVal);
          break;
      }

      return childItem;
    });
  }

  render() {
    const childItems = this.renderChildItems(this.props.config);

    return (
      <div className='rc-json-config-form'>
        <ul>
          {childItems}
        </ul>
      </div>
    );
  }
}

JSONConfigForm.propTypes = {
  config: React.PropTypes.object.isRequired,
  canExpand: React.PropTypes.bool.isRequired,
}
