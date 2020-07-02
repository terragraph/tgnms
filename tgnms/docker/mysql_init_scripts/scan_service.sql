SELECT 'Running scan service mysql init script.' AS '';

/* create scan_service database */
CREATE DATABASE IF NOT EXISTS `scan_service`;
USE scan_service;

DROP PROCEDURE IF EXISTS Create_Scan_Service ;
DELIMITER $$
CREATE PROCEDURE Create_Scan_Service ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to the 'scan_service_user' account */
    SELECT 'Creating scan_service_user account.' AS '';
    CREATE USER IF NOT EXISTS 'scan_service_user'@'%' IDENTIFIED BY 'yu35ixjw7s';
    GRANT ALL PRIVILEGES ON scan_service.* TO 'scan_service_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'scan_service_user' if the current user is root */
call Create_Scan_Service();
