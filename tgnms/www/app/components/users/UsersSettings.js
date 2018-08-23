/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import React from 'react';
import swal from 'sweetalert';
import UserModal from './UserModal.js';

export default class UsersSettings extends React.Component {
  state = {
    editingUser: null,
    isSuperUser: false,
    showModal: false,
    users: null,
  };

  componentDidMount() {
    axios
      .get('/user/')
      .then(response => this.setState({users: response.data.users}));
  }

  deleteUser(user) {
    swal(
      {
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes!',
        showCancelButton: true,
        text: 'You are about to delete ' + user.email,
        title: 'Are you sure?',
        type: 'warning',
      },
      () => {
        axios.delete('/user/' + user.id).then(response =>
          this.setState({
            users: this.state.users.filter(u => u.id != user.id),
          }),
        );
      },
    );
  }

  render() {
    if (this.state.users === null) {
      return (
        <div className="loading-spinner-wrapper">
          <div className="loading-spinner">
            <img src="/static/images/loading-graphs.gif" />
          </div>
        </div>
      );
    }

    const usersTable = (
      <BootstrapTable data={this.state.users || []} striped={true} hover={true}>
        <TableHeaderColumn
          isKey={true}
          dataField="email"
          dataSort={true}
          editable={false}>
          Email
        </TableHeaderColumn>
        <TableHeaderColumn
          dataField="role"
          dataSort={true}
          editable={false}
          dataFormat={(cell, row) => (cell == 0 ? 'User' : 'Super User')}>
          Role
        </TableHeaderColumn>
        <TableHeaderColumn
          dataField=""
          editable={false}
          dataFormat={(cell, row) => {
            return (
              <span>
                <a
                  role="link"
                  tabindex="0"
                  onClick={() => this.deleteUser(row)}>
                  Delete
                </a>
                |
                <a
                  role="link"
                  tabindex="0"
                  onClick={() =>
                    this.setState({editingUser: row, showModal: true})
                  }>
                  Edit
                </a>
              </span>
            );
          }}
        />
      </BootstrapTable>
    );

    return (
      <div>
        <h3 className="add-user-header">
          Users
          <button
            className="btn btn-primary"
            onClick={() => this.setState({showModal: true})}>
            Add User
          </button>
        </h3>
        {usersTable}
        <UserModal
          key={this.state.editingUser ? this.state.editingUser.id : 'new_user'}
          shown={this.state.showModal}
          editingUser={this.state.editingUser}
          onClose={() => this.setState({editingUser: null, showModal: false})}
          onSave={user =>
            this.setState(state => {
              const users = state.users.slice(0);
              if (state.editingUser) {
                const index = users.indexOf(state.editingUser);
                users[index] = user;
              } else {
                users.push(user);
              }
              return {editingUser: null, showModal: false, users};
            })
          }
        />
      </div>
    );
  }
}
