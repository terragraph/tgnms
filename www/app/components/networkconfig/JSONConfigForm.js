// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

// internal config form class that wraps a JSONConfigForm with a label
// mostly used to toggle a form's expandability
class ExpandableConfigForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: true
    };
  }

  toggleExpandConfig = () => {
    this.setState({
      expanded: !this.state.expanded
    });
  }

  render() {
    const {config, formLabel} = this.props;
    const {expanded} = this.state;
    const expandMarker = expanded ?
      '/static/images/down-chevron.png' : '/static/images/right-chevron.png';

    return (
      <div className='rc-expandable-config-form'>
        <img src={expandMarker} className='config-expand-marker' onClick={this.toggleExpandConfig}/>
        <label className='config-form-label' onClick={this.toggleExpandConfig}>{formLabel}:</label>
        {expanded && <JSONConfigForm config={config}/>}
      </div>
    );
  }
}

ExpandableConfigForm.propTypes = {
  config: React.PropTypes.object.isRequired,
  formLabel: React.PropTypes.string.isRequired
}

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);
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
        <input className='config-form-input' type="number" value={value} />
      </li>
    );
  }

  renderTextInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input className='config-form-input' type="text" value={value} />
      </li>
    );
  }

  renderNestedObject = (fieldName, nestedConfig) => {
    return (
      <li>
        <ExpandableConfigForm
          config={nestedConfig}
          formLabel={fieldName}
        />
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
  config: React.PropTypes.object.isRequired
}
