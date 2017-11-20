// JSONConfigForm.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';
import onClickOutside from 'react-onclickoutside';

const classNames = require('classnames');

class AddJSONConfigField extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: false,
    };
  }

  handleClickOutside = (event) => {
    if (this.state.expanded) {
      this.setState({expanded: false});
    }
  }

  selectAddOption = (type) => {
    this.props.onAddField(type);
    this.setState({expanded: false});
  }

  render() {
    const {} = this.props;

    return (
      <div className='rc-add-json-config-field'>
        <div
          className='nc-add-new-field'
          onClick={() => this.setState({expanded: true})}
        >
          Add New Field
        </div>
        <div className={classNames('rc-add-field-dropdown', {'rc-add-field-dropdown-hidden': !this.state.expanded})}>
          <span>Select Field Type</span>
          <span onClick={() => this.selectAddOption('boolean')}>Toggle (Yes/No)</span>
          <span onClick={() => this.selectAddOption('number')}>Number</span>
          <span onClick={() => this.selectAddOption('string')}>Text</span>
        </div>
      </div>
    );
  }
}

AddJSONConfigField.propTypes = {
  onAddField: React.PropTypes.func.isRequired,
}

export default onClickOutside(AddJSONConfigField);
