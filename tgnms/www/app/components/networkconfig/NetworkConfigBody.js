// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from "react";
import { render } from "react-dom";

import { toggleExpandAll } from "../../actions/NetworkConfigActions.js";

import CustomToggle from "../common/CustomToggle.js";
import JSONConfigForm from "./JSONConfigForm.js";
import NetworkConfigHeader from "./NetworkConfigHeader.js";
import NetworkConfigFooter from "./NetworkConfigFooter.js";

const uuidv4 = require("uuid/v4");

export default class NetworkConfigBody extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: true,
      viewContext: {
        viewOverridesOnly: false
      }
    };
  }

  onToggleExpandAll = isExpanded => {
    toggleExpandAll({ isExpanded });

    this.setState({
      isExpanded
    });
  };

  render() {
    const {
      configs,
      draftConfig,
      newConfigFields,
      selectedNodes,
      editMode,
      nodesWithDrafts,
      hasUnsavedChanges
    } = this.props;

    const { isExpanded, viewContext } = this.state;

    return (
      <div className="rc-network-config-body">
        <NetworkConfigHeader
          editMode={editMode}
          selectedNodes={selectedNodes}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        <div className="nc-expand-all-wrapper">
          <button
            className="nc-expand-all-btn"
            onClick={() => this.onToggleExpandAll(true)}
          >
            Expand All
          </button>
          <button
            className="nc-expand-all-btn"
            onClick={() => this.onToggleExpandAll(false)}
          >
            Collapse All
          </button>
          <span style={{ marginRight: "5px", marginLeft: "15px" }}>
            View Overrides Only
          </span>
          <CustomToggle
            checkboxId={uuidv4()}
            value={viewContext.viewOverridesOnly}
            onChange={value =>
              this.setState({
                viewContext: {
                  viewOverridesOnly: value
                }
              })
            }
          />
        </div>
        <div className="config-form-root">
          <JSONConfigForm
            configs={configs}
            draftConfig={draftConfig}
            newConfigFields={newConfigFields}
            editPath={[]}
            initExpanded={false}
            viewContext={viewContext}
          />
        </div>
        <NetworkConfigFooter
          newConfigFields={newConfigFields}
          draftConfig={draftConfig}
          editMode={editMode}
          nodesWithDrafts={nodesWithDrafts}
        />
      </div>
    );
  }
}

NetworkConfigBody.propTypes = {
  configs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  draftConfig: React.PropTypes.object.isRequired,
  newConfigFields: React.PropTypes.object.isRequired,
  nodesWithDrafts: React.PropTypes.array.isRequired,

  selectedNodes: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  editMode: React.PropTypes.string.isRequired,

  hasUnsavedChanges: React.PropTypes.bool.isRequired
};
