SELECT 'Running cut edge optimizer mysql init script.' AS '';

/* create cut_edge_optimizer database */
CREATE DATABASE IF NOT EXISTS `cut_edge_optimizer`;
USE cut_edge_optimizer;

DROP PROCEDURE IF EXISTS Create_Cut_Edge_Optimizer ;
DELIMITER $$
CREATE PROCEDURE Create_Cut_Edge_Optimizer ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* grant access to the 'cut_edge_optimizer_user' account */
    SELECT 'Creating cut_edge_optimizer_user account.' AS '';
    CREATE USER IF NOT EXISTS 'cut_edge_optimizer_user'@'%' IDENTIFIED BY '7gd67hslie';
    GRANT ALL PRIVILEGES ON cut_edge_optimizer.* TO 'cut_edge_optimizer_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'cut_edge_optimizer_user' if the current user is root */
call Create_Cut_Edge_Optimizer();



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
