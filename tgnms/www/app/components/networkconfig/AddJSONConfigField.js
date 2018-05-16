/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import PropTypes from 'prop-types';

import React from "react";
import { render } from "react-dom";
import onClickOutside from "react-onclickoutside";
import { ADD_FIELD_TYPES } from "../../constants/NetworkConfigConstants.js";
import { addNewField } from "../../actions/NetworkConfigActions.js";

const classNames = require("classnames");

class AddJSONConfigField extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: false
    };
  }

  handleClickOutside = event => {
    if (this.state.expanded) {
      this.setState({ expanded: false });
    }
  };

  selectAddOption = type => {
    addNewField({
      editPath: this.props.editPath,
      type: type
    });
    this.setState({ expanded: false });
  };

  render() {
    const {} = this.props;

    return (
      <div className="rc-add-json-config-field">
        <div
          className="nc-add-new-field"
          onClick={() => this.setState({ expanded: true })}
        >
          Add New Field
        </div>
        <div
          className={classNames("rc-add-field-dropdown", {
            "rc-add-field-dropdown-hidden": !this.state.expanded
          })}
        >
          <span>Select Field Type</span>
          <span onClick={() => this.selectAddOption(ADD_FIELD_TYPES.BOOLEAN)}>
            Toggle (Yes/No)
          </span>
          <span onClick={() => this.selectAddOption(ADD_FIELD_TYPES.NUMBER)}>
            Number
          </span>
          <span onClick={() => this.selectAddOption(ADD_FIELD_TYPES.STRING)}>
            Text
          </span>
          <span onClick={() => this.selectAddOption(ADD_FIELD_TYPES.OBJECT)}>
            Nested Field (Object)
          </span>
        </div>
      </div>
    );
  }
}

AddJSONConfigField.propTypes = {
  editPath: PropTypes.array.isRequired
};

// needed so we can collapse the drop down when a click happens outside this component
export default onClickOutside(AddJSONConfigField);
