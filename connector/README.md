# Terragraph Connector Service
Java service that publishes stats and events from Kafka to other systems using
the [Kafka Consumer] API.

## Requirements
* **Running:** JRE 8.
* **Building:** JDK 1.8 and [Apache Maven].

## Building
```
$ mvn package [-DskipTests]
```
This will build a runnable JAR located at `target/tg-connector.jar`.

## Testing
```
$ mvn test
```
Unit tests are written using [JUnit 5].

## Usage
```
$ java -jar tg-connector.jar [-h]
```
The command-line interface is implemented using [picocli].

Example usage:
```
$ java -jar tg-connector.jar generate-config -f config.json -s localhost:9092
$ java -jar tg-connector.jar run -f config.json
```

[Kafka Consumer]: https://kafka.apache.org/documentation/#consumerapi
[Apache Maven]: https://maven.apache.org/
[JUnit 5]: https://junit.org/junit5/
[picocli]: https://picocli.info/
