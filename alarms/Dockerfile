FROM maven:3-jdk-8 as build
WORKDIR /usr/src/java
COPY . .
RUN mvn clean package

FROM openjdk:8-jre
WORKDIR /usr/src/java
COPY --from=build /usr/src/java/target/tg-alarms.jar /usr/local/bin/
ENTRYPOINT ["java", "-jar", "/usr/local/bin/tg-alarms.jar", "-r", "rules.json"]
