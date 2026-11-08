FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY pom.xml .
COPY app/pom.xml app/
COPY mvnw .
COPY .mvn .mvn
COPY app/src app/src
RUN ./mvnw clean package -pl app -am -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
