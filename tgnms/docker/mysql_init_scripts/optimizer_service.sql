SELECT 'Running cut edge optimizer mysql init script.' AS '';

/* create optimizer_service database */
CREATE DATABASE IF NOT EXISTS `optimizer_service`;
USE optimizer_service;

DROP PROCEDURE IF EXISTS Create_Optimizer_Service ;
DELIMITER $$
CREATE PROCEDURE Create_Optimizer_Service ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to the 'optimizer_service_user' account */
    SELECT 'Creating optimizer_service_user account.' AS '';
    CREATE USER IF NOT EXISTS 'optimizer_service_user'@'%' IDENTIFIED BY '7gd67hslie';
    GRANT ALL PRIVILEGES ON optimizer_service.* TO 'optimizer_service_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'optimizer_service_user' if the current user is root */
call Create_Optimizer_Service();



# Create cut edge optimizer service tables
CREATE TABLE cut_edge_overrides_config (
    id INTEGER NOT NULL AUTO_INCREMENT,
    network_name VARCHAR(255) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    link_flap_backoff_ms VARCHAR(255),
    link_impairment_detection INTEGER,
    PRIMARY KEY (id)
);
CREATE INDEX ix_cut_edge_overrides_config_network_name
  ON cut_edge_overrides_config (network_name);
CREATE INDEX ix_cut_edge_overrides_config_node_name
  ON cut_edge_overrides_config (node_name);
