// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');

import {editConfigForm} from '../../actions/NetworkConfigActions.js';

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
    const {config, formLabel, editPath} = this.props;
    const {expanded} = this.state;
    const expandMarker = expanded ?
      '/static/images/down-chevron.png' : '/static/images/right-chevron.png';

    return (
      <div className='rc-expandable-config-form'>
        <img src={expandMarker} className='config-expand-marker' onClick={this.toggleExpandConfig}/>
        <label className='config-form-label' onClick={this.toggleExpandConfig}>{formLabel}:</label>
        {expanded && <JSONConfigForm
          config={config}
          editPath={editPath}
        />}
      </div>
    );
  }
}

ExpandableConfigForm.propTypes = {
  config: React.PropTypes.object.isRequired,
  formLabel: React.PropTypes.string.isRequired,
  editPath: React.PropTypes.array.isRequired
}

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);
  }

  editField = (fieldName, value) => {
    const {editPath} = this.props;

    editConfigForm({
      editPath: editPath.concat(fieldName),
      value
    });
  }

  // helper methods to render each field
  // assume no arrays

  // TODO: onchange for everything!
  renderBooleanInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input
          type='checkbox'
          checked={value}
          onChange={(event) => this.editField(fieldName, event.target.checked)}
        />
      </li>
    );
  }

  renderNumericInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input
          className='config-form-input'
          type='number'
          value={value}
          onChange={(event) => this.editField(fieldName, event.target.value)}
        />
      </li>
    );
  }

  renderTextInput = (fieldName, value) => {
    return (
      <li>
        <label className='config-form-label'>{fieldName}:</label>
        <input
          className='config-form-input'
          type='text'
          value={value}
          onChange={(event) => this.editField(fieldName, event.target.value)}
        />
      </li>
    );
  }

  renderNestedObject = (fieldName, nestedConfig) => {
    const {editPath} = this.props;
    // keep track of the edit path in relation to the root config object

    return (
      <li>
        <ExpandableConfigForm
          config={nestedConfig}
          formLabel={fieldName}
          editPath={editPath.concat(fieldName)}
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
    const {config, editPath} = this.props;
    const childItems = this.renderChildItems(config);

    return (
      <div className='rc-json-config-form'>
        <ul className={classNames({'config-form-root': editPath.length === 0})}>
          {childItems}
        </ul>
      </div>
    );
  }
}

JSONConfigForm.propTypes = {
  config: React.PropTypes.object.isRequired,

  // the "path" of keys that identifies the root of the component's config
  // vs the entire config object
  // useful for nested config components
  editPath: React.PropTypes.array.isRequired
}
