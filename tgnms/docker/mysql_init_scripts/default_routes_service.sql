SELECT 'Running default routes service mysql init script.' AS '';

/* create default_routes_service database */
CREATE DATABASE IF NOT EXISTS `default_routes_service`;
USE default_routes_service;

DROP PROCEDURE IF EXISTS Create_Default_Route ;
DELIMITER $$
CREATE PROCEDURE Create_Default_Route ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to the 'default_routes_user' account */
    SELECT 'Creating default_routes_service_user account.' AS '';
    CREATE USER IF NOT EXISTS 'default_routes_service_user'@'%' IDENTIFIED BY 'bj5q4aslzm';
    GRANT ALL PRIVILEGES ON default_routes_service.* TO 'default_routes_service_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'default_routes_service_user' if the current user is root */
call Create_Default_Route();
