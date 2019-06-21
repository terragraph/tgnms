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
The following HTTP endpoints are exposed via a [Spark] server. The HTTP server
can be disabled by setting the flag `--disable-http-server`.

> `GET /alarms`
>
> Return an array of all active alarms.

> `GET /rules`
>
> Return an array of all alarm rules.

> `POST /add_rule` - with alarm rule as POST data (refer to `AlarmRule.java`)
>
> Add a new alarm rule.

> `GET /del_rule` - with query parameter `?name=rule_name`
>
> Delete an existing alarm rule.

> `POST /events_writer` - with events as POST data (refer to `EventWriterRequest.java`)
>
> Process a list of input events (not integrated with Kafka).
> Only enabled if the `--enable-events-writer` flag is set.

[Kafka Streams]: https://kafka.apache.org/documentation/streams/
[Apache Maven]: https://maven.apache.org/
[JUnit 5]: https://junit.org/junit5/
[picocli]: https://picocli.info/
[Spark]: http://sparkjava.com/
