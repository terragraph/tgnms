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


SELECT 'Creating scan_service tables.' AS '';

CREATE TABLE scan_results (                                                                                                                                                                     
    id INTEGER NOT NULL AUTO_INCREMENT,                                                                                                                                                         
    group_id INTEGER,                                                                                                                                                                           
    n_responses_waiting INTEGER,                                                                                                                                                                
    network_name VARCHAR(255) NOT NULL,                                                                                                                                                         
    resp_id INTEGER NOT NULL,                                                                                                                                                                   
    scan_mode ENUM(
      'COARSE',
      'FINE',
      'SELECTIVE',
      'RELATIVE'
    ) NOT NULL,                                                                                                                            
    scan_result_path VARCHAR(255),                                                                                                                                                              
    scan_sub_type ENUM(
      'NO_CAL',
      'TOP_RX_CAL',
      'TOP_TX_CAL',
      'BOT_RX_CAL',
      'BOT_TX_CAL',
      'VBS_RX_CAL',
      'VBS_TX_CAL',
      'RX_CBF_AGGRESSOR',
      'RX_CBF_VICTIM',
      'TX_CBF_AGGRESSOR',
      'TX_CBF_VICTIM'
    ),           
    scan_type ENUM(
      'PBF',
      'IM',
      'RTCAL',
      'CBF_TX',
      'CBF_RX',
      'TOPO',
      'TEST_UPD_AWV'
    ) NOT NULL,                                                                                                        
    start_bwgd BIGINT NOT NULL,                                                                                                                                                                 
    status ENUM(
      'COMPLETE',
      'INVALID_TYPE',
      'INVALID_START_TSF',
      'INVALID_STA',
      'AWV_IN_PROG',
      'STA_NOT_ASSOC',
      'REQ_BUFFER_FULL',
      'LINK_SHUT_DOWN',
      'UNSPECIFIED_ERROR',
      'UNEXPECTED_ERROR',
      'EXPIRED_TSF',
      'INCOMPL_RTCAL_BEAMS_FOR_VBS'
    ) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT now(),                                                                                                                                                  
    token INTEGER NOT NULL,                                                                                                                                                                     
    tx_node_name VARCHAR(255) NOT NULL,                                                                                                                                                         
    tx_power INTEGER,                                                                                                                                                                           
    PRIMARY KEY (id)                                                                                                                                                                            
); 

CREATE TABLE IF NOT EXISTS `scan_response_rate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `network_name` varchar(255) DEFAULT NULL,
  `scan_group_id` int(11) DEFAULT NULL,
  `scan_type` enum(
      'PBF',
      'IM',
      'RTCAL',
      'CBF_TX',
      'CBF_RX',
      'TOPO',
      'TEST_UPD_AWV'
    ) DEFAULT NULL,
  `scan_mode` enum(
      'COARSE',
      'FINE',
      'SELECTIVE',
      'RELATIVE'
    ) DEFAULT NULL,
  `scan_sub_type` enum(
      'NO_CAL',
      'TOP_RX_CAL',
      'TOP_TX_CAL',
      'BOT_RX_CAL',
      'BOT_TX_CAL',
      'VBS_RX_CAL',
      'VBS_TX_CAL',
      'RX_CBF_AGGRESSOR',
      'RX_CBF_VICTIM',
      'TX_CBF_AGGRESSOR',
      'TX_CBF_VICTIM'
    ) DEFAULT NULL,
  `start_bwgd` bigint(20) DEFAULT NULL,
  `end_bwgd` bigint(20) DEFAULT NULL,
  `n_scans` int(11) DEFAULT NULL,
  `n_valid_scans` int(11) DEFAULT NULL,
  `n_invalid_scans` int(11) DEFAULT NULL,
  `n_incomplete_scans` int(11) DEFAULT NULL,
  `total_tx_resp` int(11) DEFAULT NULL,
  `invalid_tx_resp` int(11) DEFAULT NULL,
  `tx_errors` json DEFAULT NULL,
  `total_rx_resp` int(11) DEFAULT NULL,
  `rx_errors` json DEFAULT NULL,
  PRIMARY KEY (`id`)
);
