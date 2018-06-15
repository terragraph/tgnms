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
java -jar alarms.jar {<config_file_path>}
```

The program will generate a configuration file, `config.json`, in the current
working directory, or will load this file if it exists. The program accepts an
optional argument which specifies an alternate location for the configuration
file (which must exist).
