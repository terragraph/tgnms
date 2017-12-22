// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from "react";
import { render } from "react-dom";
const classNames = require("classnames");
var _ = require("lodash");

import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

import Dispatcher from "../../NetworkDispatcher.js";
import {
  NetworkConfigActions,
  editConfigForm,
  submitNewField,
  deleteNewField
} from "../../actions/NetworkConfigActions.js";

import {
  REVERT_VALUE,
  ADD_FIELD_TYPES
} from "../../constants/NetworkConfigConstants.js";
import { getStackedFields } from "../../helpers/NetworkConfigHelpers.js";

import JSONFormField from "./JSONFormField.js";
import AddJSONConfigField from "./AddJSONConfigField.js";
import NewJSONConfigField from "./NewJSONConfigField.js";
import NewJSONConfigObject from "./NewJSONConfigObject.js";

const PLACEHOLDER_VALUE = "base value for field not set";

// internal config form class that wraps a JSONConfigForm with a label
// mostly used to toggle a form's expandability
class ExpandableConfigForm extends React.Component {
  constructor(props) {
    super(props);

    // quick fix but it's hacky: have all expandable components listen for the action to expand all
    // an alternative solution (keeping this as a single state) will be investigated soon
    this.dispatchToken = Dispatcher.register(this.handleExpandAll.bind(this));

    this.state = {
      // expanded: true
      expanded: props.initExpanded,
      expandChildren: props.initExpanded
    };
  }

  componentWillUnmount = () => {
    Dispatcher.unregister(this.dispatchToken);
  };

  handleExpandAll(payload) {
    switch (payload.actionType) {
      case NetworkConfigActions.TOGGLE_EXPAND_ALL:
        this.setState({
          expanded: payload.isExpanded,
          expandChildren: true
        });

        break;
    }
  }

  toggleExpandConfig = () => {
    // children not expanded by default
    this.setState({
      expanded: !this.state.expanded,
      expandChildren: false
    });
  };

  render() {
    const {
      configs,
      draftConfig,
      newConfigFields,
      formLabel,
      editPath,
      viewContext
    } = this.props;
    const { expanded } = this.state;
    const expandMarker = expanded
      ? "/static/images/down-chevron.png"
      : "/static/images/right-chevron.png";

    const configForm = (
      <JSONConfigForm
        configs={configs}
        draftConfig={draftConfig}
        editPath={editPath}
        newConfigFields={newConfigFields}
        initExpanded={this.state.expandChildren}
        viewContext={viewContext}
      />
    );

    const hasNodeOverride =
      configs[2] &&
      _.isPlainObject(configs[2]) &&
      Object.keys(configs[2]).length > 0;
    const hasNetworkOverride =
      configs[1] &&
      _.isPlainObject(configs[1]) &&
      Object.keys(configs[1]).length > 0;
    const hasDraft =
      draftConfig &&
      _.isPlainObject(draftConfig) &&
      Object.keys(draftConfig).length > 0;

    let hasOverrideText = "";
    if (hasNodeOverride && hasNetworkOverride) {
      hasOverrideText = (
        <span className="nc-override-indicator">
          (has network and node override)
        </span>
      );
    } else if (hasNodeOverride) {
      hasOverrideText = (
        <span className="nc-override-indicator">(has node override)</span>
      );
    } else if (hasNetworkOverride) {
      hasOverrideText = (
        <span className="nc-override-indicator">(has network override)</span>
      );
    }

    const expandableConfigForm = (
      <div className="rc-expandable-config-form">
        <img
          src={expandMarker}
          className="config-expand-marker"
          onClick={this.toggleExpandConfig}
        />
        <label className="config-form-label" onClick={this.toggleExpandConfig}>
          {formLabel}
          {hasOverrideText}:
        </label>
        {expanded && configForm}
      </div>
    );

    // don't show if only viewing overrides, and there are no drafts or overrides
    return viewContext.viewOverridesOnly &&
      !hasDraft &&
      !hasNodeOverride &&
      !hasNetworkOverride ? (
      <div />
    ) : (
      expandableConfigForm
    );
    // return expandableConfigForm;
  }
}

ExpandableConfigForm.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  newConfigFields: React.PropTypes.object.isRequired,
  formLabel: React.PropTypes.string.isRequired,
  editPath: React.PropTypes.array.isRequired,
  initExpanded: React.PropTypes.bool.isRequired,

  viewContext: React.PropTypes.shape({
    viewOverridesOnly: React.PropTypes.bool.isRequired
  }).isRequired
};

const emptyFieldAlertProps = {
  title: "Field Name Cannot be Empty",
  text: `Configuration field names cannot be empty, please rename your field and try again`,
  type: "error"
};

const duplicateFieldAlertProps = duplicateField => ({
  title: "Duplicate Field Name Detected",
  text: `There exists another field ${duplicateField} in the configuration, please rename your field and try again`,
  type: "error"
});

export default class JSONConfigForm extends React.Component {
  constructor(props) {
    super(props);
  }

  isReverted = draftValue => {
    return draftValue === REVERT_VALUE;
  };

  isDraft = draftValue => {
    return draftValue !== undefined && !this.isReverted(draftValue);
  };

  getDisplayIdx = configVals => {
    // traverse the array backwards and stop at the first value that is not undefined
    // this lets us get the "highest" override for a value, aka what to display
    for (var idx = configVals.length - 1; idx >= 0; idx--) {
      if (configVals[idx] !== undefined && configVals[idx] !== null) {
        return idx; // field exists
      }
    }
    return -1;
  };

  renderNestedObject = ({
    configs,
    draftConfig,
    newConfigFields,
    fieldName,
    editPath,
    viewContext
  }) => {
    const processedConfigs = configs.map(config => {
      return config === undefined ? {} : config;
    });
    const processedDraftConfig = draftConfig === undefined ? {} : draftConfig;
    const processedNewConfigFields =
      newConfigFields === undefined ? {} : newConfigFields;

    return (
      <ExpandableConfigForm
        configs={processedConfigs}
        draftConfig={processedDraftConfig}
        newConfigFields={processedNewConfigFields}
        formLabel={fieldName}
        editPath={editPath}
        initExpanded={this.props.initExpanded}
        viewContext={viewContext}
      />
    );
  };

  renderFormField = ({
    values,
    draftValue,
    displayIdx,
    fieldName,
    editPath,
    displayVal,
    viewContext
  }) => {
    // if there are no drafts and no overrides and we only show overrides, hide field
    if (
      viewContext.viewOverridesOnly &&
      displayIdx <= 0 &&
      !this.isDraft(draftValue) &&
      !this.isReverted(draftValue)
    ) {
      return <div />;
    }

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
  };

  renderChildItem = ({ values, draftValue, newField, fieldName, editPath }) => {
    // disregard the highest level of override if we have decided to revert the value (to display)
    const displayIdx = this.getDisplayIdx(
      this.isReverted(draftValue) ? values.slice(0, values.length - 1) : values
    );

    const displayVal = this.isDraft(draftValue)
      ? draftValue
      : values[displayIdx];

    let childItem = (
      <span>Error: unable to render child val of {displayVal}</span>
    );

    const formFieldArgs = {
      values,
      draftValue,
      displayIdx,
      fieldName,
      editPath,
      viewContext: this.props.viewContext
    };
    if (displayIdx >= 0) {
      // value is found in a config
      switch (typeof displayVal) {
        case "boolean":
        case "number":
        case "string":
          formFieldArgs.displayVal = displayVal;
          childItem = this.renderFormField(formFieldArgs);
          break;
        case "object":
          childItem = this.renderNestedObject({
            configs: values,
            draftConfig: draftValue,
            newConfigFields: newField,
            fieldName: fieldName,
            editPath: editPath,
            viewContext: this.props.viewContext
          });
          break;
      }
    } else {
      // here we know that there is only a draft, or something marked to be reverted
      // if it's reverted then we can display a placeholder
      formFieldArgs.displayVal = this.isDraft(draftValue)
        ? draftValue
        : PLACEHOLDER_VALUE;

      // we display a nested object for the case where a user adds a nested object and submits it as a draft
      if (_.isPlainObject(draftValue)) {
        childItem = this.renderNestedObject({
          configs: values,
          draftConfig: draftValue,
          newConfigFields: newField,
          fieldName: fieldName,
          editPath: editPath,
          viewContext: this.props.viewContext
        });
      } else {
        childItem = this.renderFormField(formFieldArgs);
      }
    }

    return <li className="rc-json-config-input">{childItem}</li>;
  };

  onSubmitNewField = (editPath, id, field, value) => {
    const { configs, draftConfig } = this.props;

    // retrieve the union of fields for all json objects in the array
    const configFields = new Set(getStackedFields([...configs, draftConfig]));

    // swal if field is empty or it conflicts with the current layer
    if (field === "") {
      swal(emptyFieldAlertProps);
      return;
    } else if (configFields.has(field)) {
      swal(duplicateFieldAlertProps(field));
      return;
    }

    this.onDeleteNewField(editPath, id);

    editConfigForm({
      editPath: [...editPath, field],
      value
    });
  };

  onDeleteNewField = (editPath, id) => {
    deleteNewField({
      editPath,
      id
    });
  };

  renderNewField = (id, type, field, value) => {
    // switch on type for object class
    const newFieldProps = {
      canSubmit: true,
      fieldId: id,
      type: type,
      field: field,
      value: value,
      editPath: this.props.editPath,
      onSubmit: this.onSubmitNewField,
      onDelete: this.onDeleteNewField,
      viewContext: this.props.viewContext
    };

    switch (type) {
      case ADD_FIELD_TYPES.BOOLEAN:
      case ADD_FIELD_TYPES.STRING:
      case ADD_FIELD_TYPES.NUMBER:
        return (
          <li className="rc-json-config-input">
            <NewJSONConfigField {...newFieldProps} />
          </li>
        );
        break;
      case ADD_FIELD_TYPES.OBJECT:
        return (
          <li className="rc-json-config-input">
            <NewJSONConfigObject {...newFieldProps} />
          </li>
        );
        break;
    }

    return <li className="rc-json-config-input">Invalid type!</li>;
  };

  render() {
    const { configs, draftConfig, newConfigFields, editPath } = this.props;

    // retrieve the union of fields for all json objects in the array
    const configFields = getStackedFields([...configs, draftConfig]);
    const childItems = configFields.map(field => {
      const draftValue = draftConfig[field];
      const configValues = configs.map(config => config[field]);
      const newField = newConfigFields[field];

      return this.renderChildItem({
        values: configValues,
        draftValue: draftValue,
        newField: newField,
        fieldName: field,
        editPath: editPath.concat(field)
      });
    });

    const addFieldButton = <AddJSONConfigField editPath={editPath} />;

    const newFields = Object.keys(newConfigFields)
      .filter(id => {
        const newField = newConfigFields[id];
        // newField must have an id that is not a plain object
        return newField.hasOwnProperty("id") && !_.isPlainObject(newField.id);
      })
      .map(id => {
        const newField = newConfigFields[id];
        return this.renderNewField(
          id,
          newField.type,
          newField.field,
          newField.value
        );
      });

    return (
      <div className="rc-json-config-form">
        <ul>{[...childItems, ...newFields, addFieldButton]}</ul>
      </div>
    );
  }
}

JSONConfigForm.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  newConfigFields: React.PropTypes.object.isRequired,

  // the "path" of keys that identifies the root of the component's config
  // vs the entire config object
  // useful for nested config components
  editPath: React.PropTypes.array.isRequired,

  // is the component initially expanded? only using this to pass to children
  initExpanded: React.PropTypes.bool.isRequired,

  viewContext: React.PropTypes.shape({
    viewOverridesOnly: React.PropTypes.bool.isRequired
  }).isRequired
};

JSONConfigForm.defaultProps = {
  initExpanded: true
};
