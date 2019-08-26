-- MySQL dump 10.15  Distrib 10.0.33-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: cxl
-- ------------------------------------------------------
-- Server version	10.0.33-MariaDB-0ubuntu0.16.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `terragraph_network_analyzer`
--

DROP TABLE IF EXISTS `terragraph_network_analyzer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `terragraph_network_analyzer` (
  `A_Z_Avg` bigint(20) DEFAULT NULL,
  `A_Z_STD` bigint(20) DEFAULT NULL,
  `Z_A_Avg` bigint(20) DEFAULT NULL,
  `Z_A_STD` bigint(20) DEFAULT NULL,
  `distance` bigint(20) DEFAULT NULL,
  `foliage_condition` bigint(20) DEFAULT NULL,
  `healthiness` varchar(255) DEFAULT NULL,
  `interference` bigint(20) DEFAULT NULL,
  `iperf_PER_avg` bigint(20) DEFAULT NULL,
  `iperf_avg` bigint(20) DEFAULT NULL,
  `iperf_end` bigint(20) DEFAULT NULL,
  `iperf_max` bigint(20) DEFAULT NULL,
  `iperf_min` bigint(20) DEFAULT NULL,
  `iperf_start` bigint(20) DEFAULT NULL,
  `iperf_std` bigint(20) DEFAULT NULL,
  `iperf_udp_loss` bigint(20) DEFAULT NULL,
  `link_condition` bigint(20) DEFAULT NULL,
  `mcsAvgA` bigint(20) DEFAULT NULL,
  `mcsAvgZ` bigint(20) DEFAULT NULL,
  `mcsAvg_full` bigint(20) DEFAULT NULL,
  `mcsP90A` bigint(20) DEFAULT NULL,
  `mcsP90Z` bigint(20) DEFAULT NULL,
  `mcs_avg` bigint(20) DEFAULT NULL,
  `mcs_max` bigint(20) DEFAULT NULL,
  `mcs_min` bigint(20) DEFAULT NULL,
  `mcs_mismatch` bigint(20) DEFAULT NULL,
  `mcs_p90` bigint(20) DEFAULT NULL,
  `mcs_p90_full` bigint(20) DEFAULT NULL,
  `mcs_std` bigint(20) DEFAULT NULL,
  `pathlossAvg` bigint(20) DEFAULT NULL,
  `pathlossStd` bigint(20) DEFAULT NULL,
  `rssiAvg` bigint(20) DEFAULT NULL,
  `rssiAvgA` bigint(20) DEFAULT NULL,
  `rssiAvgZ` bigint(20) DEFAULT NULL,
  `rssiStd` bigint(20) DEFAULT NULL,
  `rssiStdA` bigint(20) DEFAULT NULL,
  `rssiStdZ` bigint(20) DEFAULT NULL,
  `rxBaAvgA` bigint(20) DEFAULT NULL,
  `rxBaStdA` bigint(20) DEFAULT NULL,
  `rxFailAvgZ` bigint(20) DEFAULT NULL,
  `rxFailStdZ` bigint(20) DEFAULT NULL,
  `rxOkAvgZ` bigint(20) DEFAULT NULL,
  `rxOkStdZ` bigint(20) DEFAULT NULL,
  `rxPlcpFailAvgZ` bigint(20) DEFAULT NULL,
  `rxPlcpFailStdZ` bigint(20) DEFAULT NULL,
  `rxPpduAvgZ` bigint(20) DEFAULT NULL,
  `rxPpduStdZ` bigint(20) DEFAULT NULL,
  `rxTotalAvgZ` bigint(20) DEFAULT NULL,
  `snrAvg` bigint(20) DEFAULT NULL,
  `snrAvgA` bigint(20) DEFAULT NULL,
  `snrAvgZ` bigint(20) DEFAULT NULL,
  `snrStd` bigint(20) DEFAULT NULL,
  `snrStdA` bigint(20) DEFAULT NULL,
  `snrStdZ` bigint(20) DEFAULT NULL,
  `time` bigint(20) DEFAULT NULL,
  `txBaAvgZ` bigint(20) DEFAULT NULL,
  `txBaStdZ` bigint(20) DEFAULT NULL,
  `txFailAvgA` bigint(20) DEFAULT NULL,
  `txFailStdA` bigint(20) DEFAULT NULL,
  `txOkAvgA` bigint(20) DEFAULT NULL,
  `txOkStdA` bigint(20) DEFAULT NULL,
  `txPower` bigint(20) DEFAULT NULL,
  `txPowerAvg` bigint(20) DEFAULT NULL,
  `txPowerAvgA` bigint(20) DEFAULT NULL,
  `txPowerAvgZ` bigint(20) DEFAULT NULL,
  `txPowerStd` bigint(20) DEFAULT NULL,
  `txPowerStdA` bigint(20) DEFAULT NULL,
  `txPowerStdZ` bigint(20) DEFAULT NULL,
  `txPpduAvgA` bigint(20) DEFAULT NULL,
  `txPpduStdA` bigint(20) DEFAULT NULL,
  `txTotalAvgA` bigint(20) DEFAULT NULL,
  `udp_status` bigint(20) DEFAULT NULL,
  `duration` varchar(255) DEFAULT NULL,
  `link` varchar(255) NOT NULL DEFAULT '',
  `rate` varchar(255) DEFAULT NULL,
  `test_tag` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terragraph_network_analyzer`
--

LOCK TABLES `terragraph_network_analyzer` WRITE;
/*!40000 ALTER TABLE `terragraph_network_analyzer` DISABLE KEYS */;
/*!40000 ALTER TABLE `terragraph_network_analyzer` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-01-19 10:12:31
