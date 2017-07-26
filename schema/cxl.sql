-- MySQL dump 10.14  Distrib 5.5.52-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: cxl
-- ------------------------------------------------------
-- Server version	5.5.52-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerts` (
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
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=latin1
/*!50100 PARTITION BY RANGE ( UNIX_TIMESTAMP(timestamp))
(PARTITION d_2017_03_24 VALUES LESS THAN (1490338800) ENGINE = InnoDB,
 PARTITION d_2017_03_25 VALUES LESS THAN (1490425200) ENGINE = InnoDB,
 PARTITION d_2017_03_26 VALUES LESS THAN (1490511600) ENGINE = InnoDB,
 PARTITION d_2017_03_27 VALUES LESS THAN (1490598000) ENGINE = InnoDB,
 PARTITION d_2017_03_28 VALUES LESS THAN (1490684400) ENGINE = InnoDB,
 PARTITION d_2017_03_29 VALUES LESS THAN (1490770800) ENGINE = InnoDB,
 PARTITION d_2017_03_30 VALUES LESS THAN (1490857200) ENGINE = InnoDB,
 PARTITION d_2017_03_31 VALUES LESS THAN (1490943600) ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_categories`
--

DROP TABLE IF EXISTS `event_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`node_id`,`category`),
  KEY `id` (`id`),
  KEY `node_id` (`node_id`),
  KEY `category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sample` text NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_id` int(11) NOT NULL,
  KEY `id` (`id`),
  KEY `timestamp` (`timestamp`),
  KEY `category_id` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=488317 DEFAULT CHARSET=latin1
/*!50100 PARTITION BY RANGE ( UNIX_TIMESTAMP(timestamp))
(PARTITION d_2017_03_22 VALUES LESS THAN (1490166000) ENGINE = InnoDB,
 PARTITION d_2017_03_23 VALUES LESS THAN (1490252400) ENGINE = InnoDB,
 PARTITION d_2017_03_24 VALUES LESS THAN (1490338800) ENGINE = InnoDB,
 PARTITION d_2017_03_25 VALUES LESS THAN (1490425200) ENGINE = InnoDB,
 PARTITION d_2017_03_26 VALUES LESS THAN (1490511600) ENGINE = InnoDB,
 PARTITION d_2017_03_27 VALUES LESS THAN (1490598000) ENGINE = InnoDB,
 PARTITION d_2017_03_28 VALUES LESS THAN (1490684400) ENGINE = InnoDB,
 PARTITION d_2017_03_29 VALUES LESS THAN (1490770800) ENGINE = InnoDB,
 PARTITION d_2017_03_30 VALUES LESS THAN (1490857200) ENGINE = InnoDB,
 PARTITION d_2017_03_31 VALUES LESS THAN (1490943600) ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_sources`
--

DROP TABLE IF EXISTS `log_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log_sources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `filename` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`node_id`,`filename`),
  KEY `id` (`id`),
  KEY `node_id` (`node_id`),
  KEY `filename` (`filename`)
) ENGINE=InnoDB AUTO_INCREMENT=189 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nodes`
--

DROP TABLE IF EXISTS `nodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node` varchar(100) NOT NULL,
  `mac` varchar(100) DEFAULT NULL,
  `network` varchar(100) DEFAULT NULL,
  `site` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mac` (`mac`),
  KEY `node` (`node`),
  KEY `site` (`site`)
) ENGINE=InnoDB AUTO_INCREMENT=365420 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

CREATE TABLE `scan_results` (
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
);

--
-- Table structure for table `sys_logs`
--

DROP TABLE IF EXISTS `sys_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sys_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `log` varchar(255) NOT NULL DEFAULT '',
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source_id` int(11) NOT NULL,
  KEY `id` (`id`),
  KEY `timestamp` (`timestamp`),
  KEY `source_id` (`source_id`)
) ENGINE=InnoDB AUTO_INCREMENT=76387655 DEFAULT CHARSET=latin1
/*!50100 PARTITION BY RANGE ( UNIX_TIMESTAMP(timestamp))
(PARTITION d_2017_03_21 VALUES LESS THAN (1490079600) ENGINE = InnoDB,
 PARTITION d_2017_03_22 VALUES LESS THAN (1490166000) ENGINE = InnoDB,
 PARTITION d_2017_03_23 VALUES LESS THAN (1490252400) ENGINE = InnoDB,
 PARTITION d_2017_03_24 VALUES LESS THAN (1490338800) ENGINE = InnoDB,
 PARTITION d_2017_03_25 VALUES LESS THAN (1490425200) ENGINE = InnoDB,
 PARTITION d_2017_03_26 VALUES LESS THAN (1490511600) ENGINE = InnoDB,
 PARTITION d_2017_03_27 VALUES LESS THAN (1490598000) ENGINE = InnoDB,
 PARTITION d_2017_03_28 VALUES LESS THAN (1490684400) ENGINE = InnoDB,
 PARTITION d_2017_03_29 VALUES LESS THAN (1490770800) ENGINE = InnoDB,
 PARTITION d_2017_03_30 VALUES LESS THAN (1490857200) ENGINE = InnoDB,
 PARTITION d_2017_03_31 VALUES LESS THAN (1490943600) ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tg_stats`
--

DROP TABLE IF EXISTS `tg_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tg_stats` (
  `row_id` int(11) NOT NULL AUTO_INCREMENT,
  `network` varchar(100) DEFAULT NULL,
  `node` varchar(100) DEFAULT NULL,
  `mac` varchar(100) NOT NULL,
  `site` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `time` timestamp(2) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `value` double DEFAULT NULL,
  PRIMARY KEY (`row_id`),
  KEY `mac` (`mac`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ts_key`
--

DROP TABLE IF EXISTS `ts_key`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ts_key` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `node_id` int(11) NOT NULL,
  `key` varchar(100) NOT NULL DEFAULT '',
  PRIMARY KEY (`node_id`,`key`),
  KEY `id` (`id`),
  KEY `node_id` (`node_id`),
  KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=97528 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ts_key_dropped`
--

DROP TABLE IF EXISTS `ts_key_dropped`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ts_key_dropped` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `first_seen` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=808 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ts_time`
--

DROP TABLE IF EXISTS `ts_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ts_time` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `time` datetime(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `time` (`time`)
) ENGINE=InnoDB AUTO_INCREMENT=2661470 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ts_value`
--

DROP TABLE IF EXISTS `ts_value`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ts_value` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `time_id` int(11) NOT NULL,
  `key_id` int(11) NOT NULL,
  `value` double DEFAULT NULL,
  KEY `id` (`id`),
  KEY `time_id` (`time_id`),
  KEY `key_id` (`key_id`)
) ENGINE=InnoDB AUTO_INCREMENT=226113120 DEFAULT CHARSET=latin1
/*!50100 PARTITION BY RANGE (time_id)
(PARTITION hourly_2017_03_21_18 VALUES LESS THAN (2569834) ENGINE = InnoDB,
 PARTITION hourly_2017_03_21_19 VALUES LESS THAN (2572486) ENGINE = InnoDB,
 PARTITION hourly_2017_03_21_20 VALUES LESS THAN (2574586) ENGINE = InnoDB,
 PARTITION hourly_2017_03_21_21 VALUES LESS THAN (2576506) ENGINE = InnoDB,
 PARTITION hourly_2017_03_21_22 VALUES LESS THAN (2578418) ENGINE = InnoDB,
 PARTITION hourly_2017_03_21_23 VALUES LESS THAN (2580338) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_0 VALUES LESS THAN (2582270) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_1 VALUES LESS THAN (2584194) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_2 VALUES LESS THAN (2586122) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_3 VALUES LESS THAN (2588018) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_4 VALUES LESS THAN (2589938) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_5 VALUES LESS THAN (2591866) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_6 VALUES LESS THAN (2593794) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_7 VALUES LESS THAN (2595690) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_8 VALUES LESS THAN (2597618) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_9 VALUES LESS THAN (2599554) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_10 VALUES LESS THAN (2601454) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_11 VALUES LESS THAN (2603382) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_12 VALUES LESS THAN (2605282) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_13 VALUES LESS THAN (2607226) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_14 VALUES LESS THAN (2609058) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_15 VALUES LESS THAN (2611030) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_16 VALUES LESS THAN (2612958) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_17 VALUES LESS THAN (2614822) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_18 VALUES LESS THAN (2616534) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_19 VALUES LESS THAN (2618586) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_20 VALUES LESS THAN (2620558) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_21 VALUES LESS THAN (2622454) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_22 VALUES LESS THAN (2624382) ENGINE = InnoDB,
 PARTITION hourly_2017_03_22_23 VALUES LESS THAN (2626306) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_0 VALUES LESS THAN (2628210) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_1 VALUES LESS THAN (2630142) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_2 VALUES LESS THAN (2632070) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_3 VALUES LESS THAN (2633998) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_4 VALUES LESS THAN (2635898) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_5 VALUES LESS THAN (2637790) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_6 VALUES LESS THAN (2639758) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_7 VALUES LESS THAN (2641650) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_8 VALUES LESS THAN (2643582) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_9 VALUES LESS THAN (2645514) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_10 VALUES LESS THAN (2647374) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_11 VALUES LESS THAN (2649342) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_12 VALUES LESS THAN (2651338) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_13 VALUES LESS THAN (2654650) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_14 VALUES LESS THAN (2656510) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_15 VALUES LESS THAN (2659234) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_16 VALUES LESS THAN (2661654) ENGINE = InnoDB,
 PARTITION hourly_2017_03_23_17 VALUES LESS THAN (2663878) ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-03-23 15:59:46
