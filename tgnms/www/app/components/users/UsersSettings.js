/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import React from 'react';
import UserModal from './UserModal.js';

export default class UsersSettings extends React.Component {
  state = {
    isSuperUser: false,
    showModal: false,
    users: null,
  };

  componentDidMount() {
    axios
      .get('/user/')
      .then(response => this.setState({users: response.data.users}));
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
          shown={this.state.showModal}
          onClose={() => this.setState({showModal: false})}
          onSave={user =>
            this.setState(state => {
              const users = state.users.slice(0);
              users.push(user);
              return {showModal: false, users};
            })
          }
        />
      </div>
    );
  }
}
