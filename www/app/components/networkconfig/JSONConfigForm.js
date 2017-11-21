// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';
const classNames = require('classnames');
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import { NetworkConfigActions, editConfigForm } from '../../actions/NetworkConfigActions.js';

import { REVERT_VALUE, ADD_FIELD_TYPES } from '../../constants/NetworkConfigConstants.js';
import JSONFormField from './JSONFormField.js';
import AddJSONConfigField from './AddJSONConfigField.js';
import NewJSONConfigField from './NewJSONConfigField.js';

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
      expanded: true,
    };
  }

  componentWillUnmount = () => {
    Dispatcher.unregister(this.dispatchToken);
  }

  handleExpandAll(payload) {
    switch(payload.actionType) {
      case NetworkConfigActions.TOGGLE_EXPAND_ALL:
        this.setState({
          expanded: payload.isExpanded
        });

        break;
    }
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
  editPath: React.PropTypes.array.isRequired,
}

const emptyFieldAlertProps = {
  title: 'Field Name Cannot be Empty',
  text: `Configuration field names cannot be empty, please rename your field and try again`,
  type: 'error',
};

const duplicateFieldAlertProps = (duplicateField) => ({
  title: 'Duplicate Field Name Detected',
  text: `There exists another field ${duplicateField} in the configuration, please rename your field and try again`,
  type: 'error',
});

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newFieldKey: 0,
      newFieldsByKey: {},
    };
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
      formFieldArgs.displayVal = this.isDraft(draftValue) ? draftValue : PLACEHOLDER_VALUE;
      childItem = this.renderFormField(formFieldArgs);
    }

    return (
      <li className='rc-json-config-input'>{childItem}</li>
    );
  }

  addField = (type) => {
    const {newFieldKey, newFieldsByKey} = this.state;

    let newFieldEntry = {};
    newFieldEntry[newFieldKey] = {
      key: newFieldKey,
      fieldType: type,
    }

    // copy the old state and add the new entry
    const updatedNewFieldsByKey = Object.assign({},
      newFieldsByKey,
      newFieldEntry
    );

    // yodate the state
    this.setState({
      newFieldKey: newFieldKey + 1,
      newFieldsByKey: updatedNewFieldsByKey,
    });
  }

  submitNewField = (key, field, value) => {
    const {configs, draftConfig, editPath} = this.props;

    // retrieve the union of fields for all json objects in the array
    const configFields = new Set(this.getStackedFields([...configs, draftConfig]));

    // swal if field is empty or it conflicts with the current layer
    // or we can just submit the config FOR THIS FIELD
    if (field === '') {
      swal(emptyFieldAlertProps);
      return;
    } else if (configFields.has(field)) {
      swal(duplicateFieldAlertProps(field));
      return;
    }

    this.onDeleteNewField(key);

    // field is valid so we add it to the override
    editConfigForm({
      editPath: [...editPath, field],
      value
    });
  }

  onDeleteNewField = (key) => {
    let updatedNewFieldsByKey = Object.assign({}, this.state.newFieldsByKey);
    delete updatedNewFieldsByKey[key];
    this.setState({
      newFieldsByKey: updatedNewFieldsByKey
    });
  }

  renderNewField = (field) => {
    return (
      <li className='rc-json-config-input'>
        <NewJSONConfigField
          fieldId={field.key}
          type={field.fieldType}
          editPath={this.props.editPath}
          onSubmit={this.submitNewField}
          onDelete={this.onDeleteNewField}
        />
      </li>
    );
  }

  // TODO: think of the case where something exists in draftConfig but not configs
  render() {
    const {
      configs,
      draftConfig,
      editPath
    } = this.props;

    const {newFieldsByKey} = this.state;

    // retrieve the union of fields for all json objects in the array
    const configFields = this.getStackedFields([...configs, draftConfig]);
    let childItems = configFields.map((field) => {
      const draftValue = draftConfig[field];
      const configValues = configs.map(config => config[field]);

      return this.renderChildItem({
        values: configValues,
        draftValue: draftValue,
        fieldName: field,
        editPath: editPath.concat(field),
      });
    });

    const addField = (
      <AddJSONConfigField
        onAddField={(type) => {this.addField(type)}}
      />
    );

    const newFields = Object.keys(newFieldsByKey).map((id) => {
      const field = newFieldsByKey[id];
      return this.renderNewField(field);
    });

    return (
      <div className='rc-json-config-form'>
        <ul>{[...childItems, newFields, addField]}</ul>
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
}
