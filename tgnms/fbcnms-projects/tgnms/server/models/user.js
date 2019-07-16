/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import _ from 'lodash';
import {SUPERUSER, USER} from '../user/accessRoles';

export default function(sequelize, DataTypes) {
  const User = sequelize.define(
    'User',
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.INTEGER,
        defaultValue: USER,
        validate: {
          isIn: [[USER, SUPERUSER]],
        },
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW(),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW(),
      },
    },
    {
      scopes: {
        superuser: {
          where: {
            role: SUPERUSER,
          },
        },
      },
    },
  );

  User.prototype.toJSON = function() {
    return _.omit(this.get(), 'password');
  };

  return User;
}
