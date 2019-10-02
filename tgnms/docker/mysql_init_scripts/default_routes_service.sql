SELECT 'Running default route service mysql init script.' AS '';

/* create default_route_service database */
CREATE DATABASE IF NOT EXISTS `default_route_service`;
USE default_route_service;

DROP PROCEDURE IF EXISTS Create_Default_Route ;
DELIMITER $$
CREATE PROCEDURE Create_Default_Route ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to default_route_user user*/
    SELECT 'Creating default_route_user user account.' AS '';
    CREATE USER IF NOT EXISTS 'default_route_user'@'%' IDENTIFIED BY 'bj5q4aslzm';
    GRANT ALL PRIVILEGES ON default_route_service.* TO 'default_route_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* create new users only if current user is root */
call Create_Default_Route();

/* create history table */
CREATE TABLE IF NOT EXISTS `default_route_history`
(
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `topology_name` varchar(100) NOT NULL,
  `node_name` varchar(255) NOT NULL,
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `routes` json, `is_ecmp` bool NOT NULL,
  `hop_count` int(11) NOT NULL,
  PRIMARY KEY (`id`)
);

/* create current table */
CREATE TABLE IF NOT EXISTS `default_route_current` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `topology_name` varchar(100) NOT NULL,
  `node_name` varchar(255) NOT NULL,
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `current_route_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `default_route_current_ibfk_1` (`current_route_id`),
  CONSTRAINT `default_route_current_ibfk_1`
  FOREIGN KEY (`current_route_id`)
  REFERENCES `default_route_history` (`id`)
);
