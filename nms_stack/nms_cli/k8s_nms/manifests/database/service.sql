-- Copyright (c) Meta Platforms, Inc. and affiliates.
--
-- This source code is licensed under the MIT license found in the
-- LICENSE file in the root directory of this source tree.

-- use dynamic sql so we can pass variables to ddl statements
set @createDatabaseQuery = CONCAT (
  'CREATE DATABASE IF NOT EXISTS `', @db_name, '`;'
);
set @createUserQuery = CONCAT (
  'CREATE USER IF NOT EXISTS "', @db_user, '" IDENTIFIED BY "', @db_password, '";'
);
set @grantPrivilegesQuery = CONCAT (
  'GRANT ALL PRIVILEGES ON ', @db_name, '.* TO "', @db_user, '"@"%";'
);
PREPARE createDatabase from @createDatabaseQuery;
PREPARE createUser FROM @createUserQuery;
PREPARE grantPrivileges from @grantPrivilegesQuery;

EXECUTE createDatabase;
EXECUTE createUser;
EXECUTE grantPrivileges;
FLUSH PRIVILEGES;
DEALLOCATE PREPARE createDatabase;
DEALLOCATE PREPARE createUser;
DEALLOCATE PREPARE grantPrivileges;
