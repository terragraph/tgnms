# Alarm Service
Java service that consumes events and generates alarms based on user-configured
alarm rules. Integrated with [Kafka Streams] for input/output and exactly-once
semantics. Contains an HTTP interface for managing alarms and rules.

## Requirements
* **Running:** JRE 8.
* **Building:** JDK 1.8 and [Apache Maven].

## Building
```
$ mvn package [-DskipTests]
```
This will build a runnable JAR located at `target/tg-alarms.jar`.

## Testing
```
$ mvn test
```
Unit tests are written using [JUnit 5].

## Usage
```
$ java -jar tg-alarms.jar [-h]
```
The command-line interface is implemented using [picocli].

## HTTP Interface
The service exposes HTTP endpoints via a [Spark] server (unless the
`--disable-http-server` flag is set). API documentation is available at `/docs`
(in OpenAPI 3.0 format).

[Kafka Streams]: https://kafka.apache.org/documentation/streams/
[Apache Maven]: https://maven.apache.org/
[JUnit 5]: https://junit.org/junit5/
[picocli]: https://picocli.info/
[Spark]: http://sparkjava.com/
