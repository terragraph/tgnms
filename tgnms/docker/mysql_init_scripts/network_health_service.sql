SELECT 'Running network health service mysql init script.' AS '';

/* create network_health_service database */
CREATE DATABASE IF NOT EXISTS `network_health_service`;
USE network_health_service;

DROP PROCEDURE IF EXISTS Create_Network_Health_Service ;
DELIMITER $$
CREATE PROCEDURE Create_Network_Health_Service ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to the 'network_health_service_user' account */
    SELECT 'Creating network_health_service_user account.' AS '';
    CREATE USER IF NOT EXISTS 'network_health_service_user'@'%' IDENTIFIED BY 'jjg68nhsyt';
    GRANT ALL PRIVILEGES ON network_health_service.* TO 'network_health_service_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'network_health_service_user' if the current user is root */
call Create_Network_Health_Service();


/* Create 'network_health_service' tables */

CREATE TABLE IF NOT EXISTS network_stats_health (
    id INTEGER NOT NULL AUTO_INCREMENT,
    network_name VARCHAR(255) NOT NULL,
    link_name VARCHAR(255),
    node_name VARCHAR(255),
    last_updated DATETIME NOT NULL DEFAULT now(),
    stats_health JSON,
    PRIMARY KEY (id)
);
CREATE INDEX ix_network_stats_health_network_name ON network_stats_health (network_name);
