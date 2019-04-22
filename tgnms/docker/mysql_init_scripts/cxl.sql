SELECT 'Running mysql init script.' AS '';

CREATE DATABASE IF NOT EXISTS `cxl`;
USE cxl;

DROP PROCEDURE IF EXISTS Create_Nms_User ;
DELIMITER $$
CREATE PROCEDURE Create_Nms_User ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
     SELECT 'Creating nms user account.' AS '';
     CREATE USER IF NOT EXISTS 'nms'@'%' IDENTIFIED BY 'o0Oe8G0UrBrT';
     GRANT ALL PRIVILEGES ON cxl.* TO 'nms'@'%';
     FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

DROP PROCEDURE IF EXISTS Create_Grafana_Database ;
DELIMITER $$
CREATE PROCEDURE Create_Grafana_Database ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
     SELECT 'Creating grafanaWriter user account.' AS '';
     CREATE USER IF NOT EXISTS 'grafanaWriter'@'%' IDENTIFIED BY 'guHXwEDduo78';
     CREATE DATABASE IF NOT EXISTS `grafana`;
     GRANT ALL PRIVILEGES ON grafana.* TO 'grafanaWriter'@'%';
     FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

DROP PROCEDURE IF EXISTS Create_Grafana_Reader ;
DELIMITER $$
CREATE PROCEDURE Create_Grafana_Reader ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
     SELECT 'Creating grafanaReader user account.' AS '';
     CREATE USER IF NOT EXISTS 'grafanaReader' IDENTIFIED BY 'uMDC36aagIUR';
     GRANT SELECT ON cxl.* TO 'grafanaReader'@'%';
     FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

DROP PROCEDURE IF EXISTS Create_Network_Test ;
DELIMITER $$
CREATE PROCEDURE Create_Network_Test ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
     CREATE DATABASE IF NOT EXISTS `network_test`;
     GRANT SELECT ON network_test.* TO 'grafanaReader'@'%';
     GRANT ALL PRIVILEGES ON network_test.* TO 'nms'@'%';
     FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* create new users only if current user is root */
call Create_Nms_User();
call Create_Grafana_Database();
call Create_Grafana_Reader();
call Create_Network_Test();

/* procedure to_add a column if it doesn't exist or modify it if it does */
DROP PROCEDURE IF EXISTS Add_Modify_Column;
DELIMITER $$
CREATE PROCEDURE Add_Modify_Column(IN tableName varchar(100), IN columnName varchar(100), IN varType varchar(100))
BEGIN
    DECLARE _count INT;
    SET _count = (  SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE   TABLE_NAME = tableName AND
                            COLUMN_NAME = columnName);
    IF _count = 0 THEN /* if column does not exist */
	SET @s=CONCAT('ALTER TABLE ', tableName,' ADD COLUMN `', columnName, '` ', varType);
        PREPARE addcmd FROM @s;
	EXECUTE addcmd;
	DEALLOCATE PREPARE addcmd;
    ELSE
	SET @s=CONCAT('ALTER TABLE ', tableName, ' MODIFY COLUMN `', columnName, '` ', varType);
        PREPARE addcmd FROM @s;
	EXECUTE addcmd;
	DEALLOCATE PREPARE addcmd;

    END IF;
END $$
DELIMITER ;

DROP PROCEDURE IF EXISTS Adjust_Agg_Key_Auto;
DELIMITER $$
CREATE PROCEDURE Adjust_Agg_Key_Auto ()
BEGIN
  DECLARE incr_val INT  DEFAULT 0;
  SET incr_val = (SELECT `AUTO_INCREMENT` FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'cxl' AND TABLE_NAME = 'agg_key');
  IF incr_val < 1000000000  then
        ALTER TABLE `agg_key` AUTO_INCREMENT=1000000000;
  end if ;
END; $$
DELIMITER ;

CREATE TABLE IF NOT EXISTS `agg_key` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `topology_id` int(11) NOT NULL COMMENT 'References topologies.id',
  `key` varchar(100) NOT NULL COMMENT 'Metric/key name',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`topology_id`,`key`),
  KEY `topology_id` (`topology_id`)
) ENGINE=InnoDB
/* ts_key uses the same key space, separate by 1B until we have
 * key prefixes
 */
AUTO_INCREMENT=1000000000
DEFAULT CHARSET=latin1;

/* for reasons unknown, on initial startup, AUTO_INCREMENT value in the
   CREATE TABLE is not set properly; this function sets is again */
CALL Adjust_Agg_Key_Auto;

CREATE TABLE IF NOT EXISTS `alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `alert_id` varchar(255) NOT NULL DEFAULT '',
  `alert_regex` varchar(255) NOT NULL DEFAULT '',
  `alert_threshold` double DEFAULT NULL,
  `alert_comparator` varchar(255) NOT NULL DEFAULT '',
  `alert_level` varchar(255) NOT NULL DEFAULT '',
  `trigger_key` varchar(255) NOT NULL DEFAULT '',
  `trigger_value` double DEFAULT NULL,
  KEY `id` (`id`),
  KEY `timestamp` (`timestamp`),
  KEY `node_id` (`node_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `log_sources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `filename` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`node_id`,`filename`),
  KEY `id` (`id`),
  KEY `node_id` (`node_id`),
  KEY `filename` (`filename`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `nodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node` varchar(100) NOT NULL,
  `mac` varchar(100) DEFAULT NULL,
  `network` varchar(100) DEFAULT NULL,
  `site` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mac` (`mac`),
  KEY `node` (`node`),
  KEY `site` (`site`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

/* scan_results table is no longer used, replaced by tx_scan_results and
   rx_scan_results - added July 2018 */
DROP TABLE IF EXISTS scan_results;

DROP TABLE IF EXISTS event_categories;
DROP TABLE IF EXISTS events;

CREATE TABLE IF NOT EXISTS `rx_scan_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scan_resp` blob,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `rx_node_id` int,
  `status` int,
  `tx_id` int,
  `new_beam_flag` tinyint,
  `rx_node_name` varchar(100) DEFAULT NULL,
  KEY `rx_node_id` (`rx_node_id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS `tx_scan_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scan_resp` blob,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `token` int unsigned,
  `tx_node_id` int,
  `start_bwgd` bigint,
  `scan_type` tinyint,
  `scan_sub_type` tinyint,
  `scan_mode` tinyint,
  `apply_flag` tinyint,
  `status` int,
  `tx_power` tinyint,
  `resp_id` int,
  `combined_status` int,
  `tx_node_name` varchar(100) DEFAULT NULL,
  `network` varchar(100) DEFAULT NULL,
  CONSTRAINT unique_token UNIQUE(start_bwgd,token,network),
  KEY `tx_node_id` (`tx_node_id`),
  KEY `network` (`network`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

/* these can be deleted once all DBs are updated */
CALL Add_Modify_Column('tx_scan_results','combined_status','int'); /* added July 2018 */
CALL Add_Modify_Column('tx_scan_results','token','int unsigned');  /* added July 2018 */
CALL Add_Modify_Column('tx_scan_results', 'n_responses_waiting', 'int unsigned'); /* added March 2019 */

CREATE TABLE IF NOT EXISTS `sys_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `log` varchar(255) NOT NULL DEFAULT '',
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source_id` int(11) NOT NULL,
  KEY `id` (`id`),
  KEY `timestamp` (`timestamp`),
  KEY `source_id` (`source_id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `topologies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `initial_latitude` double NOT NULL,
  `initial_longitude` double NOT NULL,
  `initial_zoom_level` double NOT NULL,
  `e2e_ip` varchar(100) NOT NULL,
  `e2e_port` int(11) NOT NULL,
  `api_ip` varchar(100) NOT NULL,
  `api_port` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `ts_key` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `key` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`node_id`,`key`),
  KEY `id` (`id`),
  KEY `node_id` (`node_id`),
  KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `scan_response_rate` (
  `id` int NOT NULL AUTO_INCREMENT,
  `network_id` int(11),
  `scan_type` tinyint,
  `scan_mode` tinyint,
  `scan_sub_type` tinyint,
  `n_scans` int,
  `n_valid_scans` int,
  `n_invalid_scans` int,
  `n_incomplete_scans` int,
  `start_time` timestamp DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp DEFAULT CURRENT_TIMESTAMP,
  `total_tx_resp` int,
  `invalid_tx_resp` int,
  `tx_errors` json,
  `total_rx_resp` int,
  `invalid_rx_resp` int,
  `rx_errors` json,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`network_id`) REFERENCES topology(`id`)
) ENGINE=InnoDB;

SELECT 'Done initializing DB.' AS '';
