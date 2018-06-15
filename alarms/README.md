# Alarm Generator
This is a standalone Java service that polls for an E2E controller's topology
(via API Service) and sends syslog alarms to an endpoint. The alarm
specifications are not provided here.

## Requirements
* **Running:** *JRE 8*.
* **Building:** *JDK 1.8* and *Apache Maven*.

## Building
Build the JAR:
```
$ mvn package
```
This will generate a runnable JAR located at `target/alarms.jar`.

## Usage
Run the JAR:
```
java -jar alarms.jar {<config_file_path> {<cached_alarm_data_path>}}
```

The program will generate a configuration file, `config.json`, in the current
working directory, or will load this file if it exists. On graceful shutdown,
the current alarm state will be cached to `data.ser`, and this data will be
loaded on startup. The program accepts optional arguments which specify
alternate locations for these two files (which must exist).
