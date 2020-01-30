SELECT 'Running the topology service MySQL init script.' AS '';

/* Create 'topology_service' db */
CREATE DATABASE IF NOT EXISTS `topology_service`;
USE topology_service;

DROP PROCEDURE IF EXISTS Create_Topology ;
DELIMITER $$
CREATE PROCEDURE Create_Topology ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* Grant db access to 'topology_user' */
    SELECT 'Creating topology_user user account.' AS '';
    CREATE USER IF NOT EXISTS 'topology_user'@'%' IDENTIFIED BY 'td7s25hjzmf';
    GRANT ALL PRIVILEGES ON topology_service.* TO 'topology_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'topology_user' if the current user is root */
call Create_Topology();
