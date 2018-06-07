SELECT 'Running mysql init script.' AS '';

CREATE DATABASE IF NOT EXISTS `cxl`;
USE cxl;

SELECT 'Creating nms user account.' AS '';
CREATE USER 'nms'@'%' IDENTIFIED BY 'o0Oe8G0UrBrT';
GRANT ALL PRIVILEGES ON cxl.* TO 'nms'@'%';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS `agg_key` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `topology_id` int(11) NOT NULL,
  `key` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_name` (`topology_id`,`key`),
  KEY `topology_id` (`topology_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000000000 DEFAULT CHARSET=latin1;

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

CREATE TABLE IF NOT EXISTS `event_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`node_id`,`category`),
  KEY `id` (`id`),
  KEY `node_id` (`node_id`),
  KEY `category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sample` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_id` int(11) NOT NULL,
  KEY `id` (`id`),
  KEY `timestamp` (`timestamp`),
  KEY `category_id` (`category_id`)
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

CREATE TABLE IF NOT EXISTS `scan_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` int,
  `tx_node_id` int,
  `start_bwgd` bigint,
  `rx_node_id` int,
  `superframe_num` bigint,
  `tx_beam` int,
  `rx_beam` int,
  `rssi` float,
  `snr_est` float,
  `post_snr` float,
  `rx_start` int,
  `packet_idx` smallint,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;

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

SELECT 'Done initializing DB.' AS '';
