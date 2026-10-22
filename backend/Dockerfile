# syntax=docker/dockerfile:1
FROM maven:3.10-eclipse-temurin-25-alpine AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:25-jre-noble
ARG WITH_LIBREOFFICE=false
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && if [ "$WITH_LIBREOFFICE" = "true" ]; then \
         apt-get install -y --no-install-recommends libreoffice-writer fonts-dejavu-core; \
       fi \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 homeofficeexpenses \
    && useradd --uid 10001 --gid homeofficeexpenses --create-home --shell /usr/sbin/nologin homeofficeexpenses \
    && mkdir -p /app/data \
    && chown -R homeofficeexpenses:homeofficeexpenses /app

WORKDIR /app
COPY --from=build --chown=homeofficeexpenses:homeofficeexpenses /build/target/homeofficeexpenses-backend-*.jar /app/app.jar

ENV APP_DATA_DIR=/app/data
EXPOSE 8080
USER homeofficeexpenses
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
