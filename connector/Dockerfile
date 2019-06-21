FROM maven:3-jdk-8 as build
WORKDIR /usr/src/java
COPY . .
RUN mvn clean package

FROM openjdk:8-jre
WORKDIR /usr/src/java
COPY --from=build /usr/src/java/target/tg-connector.jar /usr/local/bin/
RUN ["java", "-jar", "/usr/local/bin/tg-connector.jar", "generate-config", "-f", "config.json"]
ENTRYPOINT ["java", "-jar", "/usr/local/bin/tg-connector.jar", "run", "-f", "config.json"]
