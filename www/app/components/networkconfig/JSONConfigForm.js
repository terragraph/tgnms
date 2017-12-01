// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');

import Dispatcher from '../../NetworkDispatcher.js';
import { NetworkConfigActions } from '../../actions/NetworkConfigActions.js';

import { REVERT_VALUE } from '../../constants/NetworkConfigConstants.js';
import JSONFormField from './JSONFormField.js';

const PLACEHOLDER_VALUE = 'base value for field not set';

// internal config form class that wraps a JSONConfigForm with a label
// mostly used to toggle a form's expandability
class ExpandableConfigForm extends React.Component {
  constructor(props) {
    super(props);

    // quick fix but it's hacky: have all expandable components listen for the action to expand all
    // an alternative solution (keeping this as a single state) will be investigated soon
    this.dispatchToken = Dispatcher.register(
      this.handleExpandAll.bind(this)
    );

    this.state = {
      // expanded: true
      expanded: props.initExpanded,
      expandChildren: props.initExpanded,
    };
  }

  componentWillUnmount = () => {
    Dispatcher.unregister(this.dispatchToken);
  }

  handleExpandAll(payload) {
    switch(payload.actionType) {
      case NetworkConfigActions.TOGGLE_EXPAND_ALL:
        this.setState({
          expanded: payload.isExpanded,
          expandChildren: true,
        });

        break;
    }
  }

  toggleExpandConfig = () => {
    // children not expanded by default
    this.setState({
      expanded: !this.state.expanded,
      expandChildren: false,
    });
  }

  render() {
    const {configs, draftConfig, formLabel, editPath} = this.props;
    const {expanded} = this.state;
    const expandMarker = expanded ?
      '/static/images/down-chevron.png' : '/static/images/right-chevron.png';

    const configForm = (
      <JSONConfigForm
        configs={configs}
        draftConfig={draftConfig}
        editPath={editPath}
        initExpanded={this.state.expandChildren}
      />
    );

    return (
      <div className='rc-expandable-config-form'>
        <img src={expandMarker} className='config-expand-marker' onClick={this.toggleExpandConfig}/>
        <label className='config-form-label' onClick={this.toggleExpandConfig}>{formLabel}:</label>
        {expanded && configForm}
      </div>
    );
  }
}

ExpandableConfigForm.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  formLabel: React.PropTypes.string.isRequired,
  editPath: React.PropTypes.array.isRequired,
  initExpanded: React.PropTypes.bool.isRequired,
}

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);
  }

  isReverted = (draftValue) => {
    return draftValue === REVERT_VALUE;
  }

  isDraft = (draftValue) => {
    return draftValue !== undefined && !this.isReverted(draftValue);
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

  getDisplayIdx = (configVals) => {
    // traverse the array backwards and stop at the first value that is not undefined
    // this lets us get the "highest" override for a value, aka what to display
    for (var idx = configVals.length - 1; idx >= 0; idx --) {
      if (configVals[idx] !== undefined && configVals[idx] !== null) {
        return idx; // field exists
      }
    }
    return -1;
  }

  renderNestedObject = ({configs, draftConfig, fieldName, editPath}) => {
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

        initExpanded={this.props.initExpanded}
      />
    );
  }

  renderFormField = ({values, draftValue, displayIdx, fieldName, editPath, displayVal}) => {
    return (
      <JSONFormField
        editPath={editPath}
        formLabel={fieldName}
        displayIdx={displayIdx}
        values={values}
        draftValue={draftValue}
        isReverted={this.isReverted(draftValue)}
        isDraft={this.isDraft(draftValue)}
        displayVal={displayVal}
      />
    );
  }

  renderChildItem = ({values, draftValue, fieldName, editPath}) => {
    // disregard the highest level of override if we have decided to revert the value (to display)
    const displayIdx = this.getDisplayIdx(this.isReverted(draftValue) ?
      values.slice(0, values.length - 1) : values
    );

    if (displayIdx === -1) {
      console.warn('base not found for field', fieldName, 'in path', editPath);
    }

    const displayVal = this.isDraft(draftValue) ? draftValue : values[displayIdx];
    let childItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    const formFieldArgs = {values, draftValue, displayIdx, fieldName, editPath};
    if (displayIdx >= 0) {
      // value is found in a config
      switch (typeof displayVal) {
        case 'boolean':
        case 'number':
        case 'string':
          formFieldArgs.displayVal = displayVal;
          childItem = this.renderFormField(formFieldArgs);
          break;
        case 'object':
          childItem = this.renderNestedObject({
            configs: values,
            draftConfig: draftValue,
            fieldName: fieldName,
            editPath: editPath,
          });
          break;
      }
    } else {
      formFieldArgs.displayVal = PLACEHOLDER_VALUE;
      childItem = this.renderFormField(formFieldArgs);
    }

    return (
      <li className='rc-json-config-input'>{childItem}</li>
    );
  }

  render() {
    const {
      configs,
      draftConfig,
      editPath
    } = this.props;

    // retrieve the union of fields for all json objects in the array
    const configFields = this.getStackedFields(configs);
    const childItems = configFields.map((field) => {
      const draftValue = draftConfig[field];
      const configValues = configs.map(config => config[field]);

      return this.renderChildItem({
        values: configValues,
        draftValue: draftValue,
        fieldName: field,
        editPath: editPath.concat(field),
      });
    });

    return (
      <div className='rc-json-config-form'>
        <ul>{childItems}</ul>
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
  editPath: React.PropTypes.array.isRequired,

  // is the component initially expanded? only using this to pass to children
  initExpanded: React.PropTypes.bool.isRequired,
}

JSONConfigForm.defaultProps = {
  initExpanded: true,
}
