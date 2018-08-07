/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import axios from 'axios';
import PropTypes from 'prop-types';
import React from 'react';
import swal from 'sweetalert';
import Modal from 'react-modal';

const MODAL_STYLE = {
  content: {
    bottom: 'auto',
    display: 'table',
    left: '50%',
    marginRight: '-50%',
    right: 'auto',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px',
  },
};

export default class UserModal extends React.Component {
  state = {
    isSuperUser: false,
  };

  constructor(props) {
    super(props);
    this.emailRef = React.createRef();
    this.passwordRef = React.createRef();
    this.passwordConfirmRef = React.createRef();
  }

  saveUser = () => {
    if (
      this.passwordRef.current.value !== this.passwordConfirmRef.current.value
    ) {
      return swal({
        title: 'Passwords must match',
        type: 'error',
      });
    }

    if (!this.passwordRef.current.value || !this.emailRef.current.value) {
      return swal({
        title: 'Email or password cannot be empty',
        type: 'error',
      });
    }

    axios
      .post('/user', {
        email: this.emailRef.current.value,
        password: this.passwordRef.current.value,
        superUser: this.state.isSuperUser,
      })
      .then(response => this.props.onSave(response.data.user))
      .catch(error => {
        const title = error.response.data && error.response.data.error;
        swal({title: title || 'An error has occured', type: 'error'});
      });
  };

  render() {
    return (
      <Modal style={MODAL_STYLE} isOpen={this.props.shown}>
        <div className="add-user-modal">
          <input ref={this.emailRef} placeholder="email" />
          <input
            ref={this.passwordRef}
            placeholder="password"
            type="password"
          />
          <input
            ref={this.passwordConfirmRef}
            placeholder="confirm password"
            type="password"
          />
        </div>
        <span>Super User?</span>
        <input
          type="checkbox"
          onChange={event => this.setState({isSuperUser: event.target.checked})}
          checked={this.state.isSuperUser}
        />
        <div className="add-user-modal-footer">
          <button className="btn btn-primary" onClick={this.saveUser}>
            Save
          </button>
          <button className="btn" onClick={this.props.onClose}>
            Cancel
          </button>
        </div>
      </Modal>
    );
  }
}

UserModal.propTypes = {
  shown: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
