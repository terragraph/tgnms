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

/* Create 'topology_history' table */
CREATE TABLE IF NOT EXISTS `topology_history`
(
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `network_name` varchar(255) NOT NULL,
  `topology` json NOT NULL,
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `network_name` (`network_name`),
  KEY `last_updated` (`last_updated`)
);
