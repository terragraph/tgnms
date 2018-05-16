/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
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
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  options: PropTypes.shape({
    optionText: PropTypes.string,
    value: PropTypes.string,
    style: PropTypes.object
  }).isRequired,

  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
