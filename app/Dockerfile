# Сборка приложения
FROM maven:3.9.6-eclipse-temurin-25-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY app/pom.xml app/
COPY mvnw .
COPY .mvn .mvn
COPY app/src app/src
RUN ./mvnw clean package -pl app -am -DskipTests

# Запуск приложения
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /app/app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
