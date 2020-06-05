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

CREATE TABLE IF NOT EXISTS scan_test_schedule (
    id INTEGER NOT NULL AUTO_INCREMENT,
    enabled BOOL NOT NULL,
    cron_expr VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    CHECK (enabled IN (0, 1))
);


CREATE TABLE IF NOT EXISTS scan_test_params (
    id INTEGER NOT NULL AUTO_INCREMENT,
    schedule_id INTEGER,
    network_name VARCHAR(255) NOT NULL,
    type ENUM(
      'IM'
    ) NOT NULL,
    mode ENUM(
      'COARSE',
      'FINE',
      'SELECTIVE',
      'RELATIVE'
    ) NOT NULL,
    options JSON NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(schedule_id) REFERENCES scan_test_schedule (id) ON DELETE SET NULL
);
CREATE INDEX ix_scan_test_params_network_name ON scan_test_params (network_name);


CREATE TABLE IF NOT EXISTS scan_test_execution (
    id INTEGER NOT NULL AUTO_INCREMENT,
    params_id INTEGER NOT NULL,
    start_dt DATETIME NOT NULL DEFAULT now(),
    end_dt DATETIME,
    status ENUM(
      'QUEUED',
      'RUNNING',
      'FINISHED',
      'FAILED'
    ) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(params_id) REFERENCES scan_test_params (id)
);
CREATE INDEX ix_scan_test_execution_status ON scan_test_execution (status);


CREATE TABLE IF NOT EXISTS scan_results (
    id INTEGER NOT NULL AUTO_INCREMENT,
    execution_id INTEGER NOT NULL,
    network_name VARCHAR(255) NOT NULL,
    tx_node VARCHAR(255),
    group_id INTEGER,
    type ENUM('IM') NOT NULL,
    mode ENUM('COARSE','FINE','SELECTIVE','RELATIVE') NOT NULL,
    results_path VARCHAR(255),
    resp_id INTEGER,
    subtype ENUM(
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
    start_bwgd BIGINT,
    token INTEGER NOT NULL,
    tx_power INTEGER,
    tx_status ENUM(
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
    ),
    rx_statuses JSON,
    n_responses_waiting INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY(execution_id) REFERENCES scan_test_execution (id)
);
CREATE INDEX ix_scan_results_token ON scan_results (token);


CREATE TABLE IF NOT EXISTS connectivity_results (
    id INTEGER NOT NULL AUTO_INCREMENT,
    execution_id INTEGER NOT NULL,
    network_name VARCHAR(255) NOT NULL,
    group_id INTEGER,
    token INTEGER NOT NULL,
    tx_node VARCHAR(255) NOT NULL,
    rx_node VARCHAR(255) NOT NULL,
    routes JSON NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(execution_id) REFERENCES scan_test_execution (id)
);


CREATE TABLE IF NOT EXISTS interference_results (
    id INTEGER NOT NULL AUTO_INCREMENT,
    execution_id INTEGER NOT NULL,
    network_name VARCHAR(255) NOT NULL,
    group_id INTEGER,
    token INTEGER NOT NULL,
    tx_node VARCHAR(255) NOT NULL,
    tx_to_node VARCHAR(255) NOT NULL,
    tx_power_idx INTEGER DEFAULT NULL,
    rx_node VARCHAR(255) NOT NULL,
    rx_from_node VARCHAR(255) NOT NULL,
    inr_curr_power JSON NOT NULL,
    inr_max_power JSON NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(execution_id) REFERENCES scan_test_execution (id)
);
