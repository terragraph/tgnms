import React from 'react';
import { render } from 'react-dom';

// because it takes less time for me to write this than to upgrade sweetalert to version 2
export default class CustomAlert extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div></div>
    );
  }
}

CustomAlert.propTypes = {
  title: React.PropTypes.string.isRequired,
  text: React.PropTypes.string.isRequired,
  options: React.PropTypes.shape({
    optionText: React.PropTypes.string,
    value: React.PropTypes.string,
    style: React.PropTypes.object
  }).isRequired,

  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
}
