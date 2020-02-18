-- use dynamic sql so we can pass variables to ddl statements
set @createUserQuery = CONCAT (
  'CREATE USER IF NOT EXISTS "', @keycloak_user, '" IDENTIFIED BY "', @keycloak_password, '";'
);
set @grantPrivilegesQuery = CONCAT (
  'GRANT ALL PRIVILEGES ON keycloak.* TO "', @keycloak_user, '"@"%"'
);
PREPARE createUser FROM @createUserQuery;
PREPARE grantPrivileges from @grantPrivilegesQuery;

CREATE DATABASE IF NOT EXISTS `keycloak`;
EXECUTE createUser;
EXECUTE grantPrivileges;
FLUSH PRIVILEGES;
DEALLOCATE PREPARE createUser;
DEALLOCATE PREPARE grantPrivileges;
