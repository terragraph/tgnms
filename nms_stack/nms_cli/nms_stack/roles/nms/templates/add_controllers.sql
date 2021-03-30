-- Copyright (c) 2014-present, Facebook, Inc.
DROP PROCEDURE IF EXISTS Add_e2e_controller ;
DELIMITER $$
CREATE PROCEDURE Add_e2e_controller (
  IN sanitized_name VARCHAR(89),
  IN ctrlr_name varchar(255),
  IN app_port int(11))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM topology WHERE name = ctrlr_name) then
    INSERT INTO controller (api_ip, e2e_ip, e2e_port, api_port) VALUES (CONCAT("api_service-", sanitized_name), CONCAT("e2e_controller-", sanitized_name), app_port, 8080);
    SET @primary_controller_id = LAST_INSERT_ID();
    INSERT INTO controller (api_ip, e2e_ip, e2e_port, api_port) VALUES (CONCAT("api_service-", sanitized_name), CONCAT("e2e_controller-", sanitized_name), app_port, 8080);
    INSERT INTO topology (name, primary_controller, backup_controller) VALUES (ctrlr_name, @primary_controller_id, LAST_INSERT_ID());
  END IF ;
END; $$
DELIMITER ;

{% for ctrlr in controllers_list %}
{% set sanitized_name = ctrlr.name | trim | replace(' ', '_') | lower %}
  CALL Add_e2e_controller("{{ sanitized_name }}", "{{ ctrlr.name }}", "{{ ctrlr.app_port }}");
{% endfor %}
