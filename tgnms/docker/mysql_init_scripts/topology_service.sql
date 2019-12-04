SELECT 'Running topology service mysql init script.' AS '';

/* create topology_service database */
CREATE DATABASE IF NOT EXISTS `topology_service`;
USE topology_service;

DROP PROCEDURE IF EXISTS Create_Topology ;
DELIMITER $$
CREATE PROCEDURE Create_Topology ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to topology_user user*/
    SELECT 'Creating topology_user user account.' AS '';
    CREATE USER IF NOT EXISTS 'topology_user'@'%' IDENTIFIED BY 'td7s25hjzmf';
    GRANT ALL PRIVILEGES ON topology_service.* TO 'topology_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* create new users only if current user is root */
call Create_Topology();

/* create topology table */
CREATE TABLE IF NOT EXISTS `topology`
(
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `topology` json,
  `datetime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
