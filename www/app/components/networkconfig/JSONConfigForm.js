// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');

import { REVERT_VALUE } from '../../constants/NetworkConfigConstants.js';
import JSONFormField from './JSONFormField.js';

const isReverted = (draftValue) => {
  return draftValue === REVERT_VALUE;
}

const PLACEHOLDER_VALUE = 'base value for field not set';

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
    const {configs, draftConfig, formLabel, editPath} = this.props;
    const {expanded} = this.state;
    const expandMarker = expanded ?
      '/static/images/down-chevron.png' : '/static/images/right-chevron.png';

    return (
      <div className='rc-expandable-config-form'>
        <img src={expandMarker} className='config-expand-marker' onClick={this.toggleExpandConfig}/>
        <label className='config-form-label' onClick={this.toggleExpandConfig}>{formLabel}:</label>
        {expanded && <JSONConfigForm
          configs={configs}
          draftConfig={draftConfig}
          editPath={editPath}
        />}
      </div>
    );
  }
}

ExpandableConfigForm.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  formLabel: React.PropTypes.string.isRequired,
  editPath: React.PropTypes.array.isRequired
}

class JSONConfigInput extends React.Component {
  constructor(props) {
    super(props);
  }

  renderNestedObject = (fieldName, editPath, configs, draftConfig) => {
    const processedConfigs = configs.map((config) => {
      return config === undefined ? {} : config;
    });

    const processedDraftConfig = draftConfig === undefined ? {} : draftConfig;

    return (
      <ExpandableConfigForm
        configs={processedConfigs}
        draftConfig={processedDraftConfig}
        formLabel={fieldName}
        editPath={editPath}
      />
    );
  }

  renderFormField = (isReverted, isDraft, displayVal) => {
    const {values, draftValue, displayIdx, fieldName, editPath} = this.props;
    return (
      <JSONFormField
        editPath={editPath}
        formLabel={fieldName}
        displayIdx={displayIdx}
        values={values}
        draftValue={draftValue}
        isReverted={isReverted}
        isDraft={isDraft}
        displayVal={displayVal}
      />
    );
  }

  renderInputItem = (isReverted, isDraft, displayVal) => {
    const {values, draftValue, displayIdx, fieldName, editPath} = this.props;

    let childItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    if (displayIdx >= 0) {
      // value is found in a config
      switch (typeof displayVal) {
        case 'boolean':
        case 'number':
        case 'string':
          childItem = this.renderFormField(isReverted, isDraft, displayVal);
          break;
        case 'object':
          childItem = this.renderNestedObject(fieldName, editPath, values, draftValue);
          break;
      }
    } else {
      childItem = this.renderFormField(isReverted, isDraft, PLACEHOLDER_VALUE);
    }

    return childItem;
  }

  render() {
    const {values, draftValue, displayIdx, fieldName, editPath} = this.props;

    // some values are undefined
    const isFieldReverted = isReverted(draftValue);
    const isDraft = draftValue !== undefined && !isFieldReverted;

    const displayVal = isDraft ? draftValue : values[displayIdx];
    const inputItem = this.renderInputItem(isFieldReverted, isDraft, displayVal);

    return (
      <div className='rc-json-config-input'>
        <li>{inputItem}</li>
      </div>
    );
  }
}

JSONConfigInput.propTypes = {
  values: React.PropTypes.array.isRequired,
  draftValue: React.PropTypes.any.isRequired,
  displayIdx: React.PropTypes.number.isRequired,

  fieldName: React.PropTypes.string.isRequired,
  editPath: React.PropTypes.array.isRequired,
}

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);
  }

  getStackedFields(configs) {
    // aggregate all config fields
    const stackedFields = configs.reduce((stacked, config) => {
      return [...stacked, ...Object.keys(config)];
    }, []);

    // now dedupe the fields by adding to a set
    const dedupedFields = new Set(stackedFields);
    return [...dedupedFields];
  }

  getDisplayIdx = (configVals, isReverted) => {
    // traverse the array backwards and stop at the first value that is not undefined
    // this lets us get the "highest" override for a value, aka what to display
    for (var idx = configVals.length - 1; idx >= 0; idx --) {
      if (configVals[idx] !== undefined && configVals[idx] !== null) {
        return idx; // field exists
      }
    }
    return -1;
  }

  render() {
    const {
      configs,
      draftConfig,
      editPath
    } = this.props;

    // TODO: ASSUMPTION: configs are all JSON objects, so is draftConfig
    // ASSUMPTION: draftConfig does not change types for fields or introduce new fields

    // retrieve the union of fields for all json objects in the array
    const configFields = this.getStackedFields(configs);

    const childItems = configFields.map((field) => {
      const draftValue = draftConfig[field];
      const configVals = configs.map(config => config[field]);

      // disregard the highest level of override if we have decided to revert the value
      const displayIdx = this.getDisplayIdx(
        isReverted(draftValue) ? configVals.slice(0, configVals.length - 1) : configVals
      );

      if (displayIdx === -1) {
        console.warn('base not found for field', field, 'in path', editPath);
      }

      return (
        <JSONConfigInput
          values={configVals}
          draftValue={draftConfig[field]}
          displayIdx={displayIdx}

          fieldName={field}
          editPath={editPath.concat(field)}
        />
      );
    });

    return (
      <div className={
        classNames({'config-form-root': editPath.length === 0, 'rc-json-config-form': true})
      }>
        <ul className={classNames({'config-form-root': editPath.length === 0})}>{childItems}</ul>
      </div>
    );
  }
}

JSONConfigForm.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,

  // the "path" of keys that identifies the root of the component's config
  // vs the entire config object
  // useful for nested config components
  editPath: React.PropTypes.array.isRequired
}
