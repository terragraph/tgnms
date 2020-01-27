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
    /* grant access to default_routes_user user*/
    SELECT 'Creating default_routes_user user account.' AS '';
    CREATE USER IF NOT EXISTS 'default_routes_user'@'%' IDENTIFIED BY 'bj5q4aslzm';
    GRANT ALL PRIVILEGES ON default_routes_service.* TO 'default_routes_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* create new users only if current user is root */
call Create_Default_Route();

/* create history table */
CREATE TABLE IF NOT EXISTS `default_route_history`
(
  `id` int(11) AUTO_INCREMENT,
  `network_name` varchar(100) NOT NULL,
  `node_name` varchar(255) NOT NULL,
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `routes` json NOT NULL,
  `hop_count` int(11) NOT NULL,
  `prev_routes_id` int(11),
  PRIMARY KEY (`id`),
  KEY `network_name` (`network_name`),
  KEY `node_name` (`node_name`),
  KEY `last_updated` (`last_updated`),
  KEY `prev_routes_id` (`prev_routes_id`),
  CONSTRAINT `prev_routes_id`
  FOREIGN KEY (`prev_routes_id`)
  REFERENCES `default_route_history` (`id`)
  ON DELETE SET NULL
);

/* create link CN routes table */
CREATE TABLE IF NOT EXISTS `link_cn_routes`
(
  `id` int(11) AUTO_INCREMENT,
  `network_name` varchar(100) NOT NULL,
  `link_name` varchar(255) NOT NULL,
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cn_routes` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `network_name` (`network_name`),
  KEY `link_name` (`link_name`),
  KEY `last_updated` (`last_updated`)
);
