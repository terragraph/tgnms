SELECT 'Running the network test MySQL init script.' AS '';

/* Create 'network_test' db */
CREATE DATABASE IF NOT EXISTS `network_test`;
USE network_test;

DROP PROCEDURE IF EXISTS Create_Network_Test ;
DELIMITER $$
CREATE PROCEDURE Create_Network_Test ()
BEGIN
  DECLARE usr VARCHAR(100)  DEFAULT "";
  SET usr = (SELECT CURRENT_USER);
  IF usr LIKE 'root%'  then
    /* Grant db access to the 'network_test_user' account */
    SELECT 'Creating network_test_user account.' AS '';
    CREATE USER IF NOT EXISTS 'network_test_user'@'%' IDENTIFIED BY 'WmTz5Ej52t';
    GRANT ALL PRIVILEGES ON network_test.* TO 'network_test_user'@'%';
    FLUSH PRIVILEGES;
  end if ;
END; $$
DELIMITER ;

/* Create 'network_test_user' if the current user is root */
call Create_Network_Test();
