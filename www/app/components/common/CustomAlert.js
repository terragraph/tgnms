import React from "react";
import { render } from "react-dom";

// custom alert component with more features than our current version of sweetalert (1.3)
// to be implemented for phase 2
export default class CustomAlert extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div />;
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
  onClose: React.PropTypes.func.isRequired
};
