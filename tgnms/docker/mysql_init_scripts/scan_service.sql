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

CREATE TABLE IF NOT EXISTS `tx_scan_response` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scan_resp_path` varchar(255) DEFAULT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `network_name` varchar(255) DEFAULT NULL,
  `scan_group_id` int(11) DEFAULT NULL,
  `tx_node_name` varchar(255) DEFAULT NULL,
  `token` int(11) DEFAULT NULL,
  `resp_id` int(11) DEFAULT NULL,
  `start_bwgd` bigint(20) DEFAULT NULL,
  `scan_type` enum(
      'PBF',
      'IM',
      'RTCAL',
      'CBF_TX',
      'CBF_RX',
      'TOPO',
      'TEST_UPD_AWV'
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
  `scan_mode` enum(
      'COARSE',
      'FINE',
      'SELECTIVE',
      'RELATIVE'
    ) DEFAULT NULL,
  `apply` tinyint(1) DEFAULT NULL,
  `status` enum(
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
    ) DEFAULT NULL,
  `tx_power` int(11) DEFAULT NULL,
  `n_responses_waiting` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `rx_scan_response` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scan_resp_path` varchar(255) DEFAULT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `rx_node_name` varchar(255) DEFAULT NULL,
  `status` enum(
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
    ) DEFAULT NULL,
  `new_beam_flag` int(11) DEFAULT NULL,
  `tx_scan_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tx_scan_id` (`tx_scan_id`),
  CONSTRAINT `rx_scan_response_ibfk_1` 
  FOREIGN KEY (`tx_scan_id`) 
  REFERENCES `tx_scan_response` (`id`)
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
