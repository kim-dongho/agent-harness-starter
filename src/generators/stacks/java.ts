/**
 * @fileoverview Java Spring Boot 스택 보일러플레이트 생성기
 *
 * Spring Boot 프로젝트의 기본 구조(Application, HealthController, 빌드 설정)를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../../prompts/types.js';

/**
 * Java Spring Boot 프로젝트 보일러플레이트를 생성한다.
 *
 * Gradle(Kotlin DSL) 또는 Maven 빌드 설정과 기본 소스 구조를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션 (buildTool 필드 사용)
 */
export async function setupJavaSpring(dir: string, config: StackConfig): Promise<void> {
  const isGradle = config.buildTool !== 'maven';
  const pkg = 'com.example.app';
  const pkgPath = 'com/example/app';

  await fs.ensureDir(path.join(dir, `src/main/java/${pkgPath}`));
  await fs.ensureDir(path.join(dir, 'src/main/resources'));
  await fs.ensureDir(path.join(dir, `src/test/java/${pkgPath}`));

  await fs.writeFile(path.join(dir, `src/main/java/${pkgPath}/Application.java`), `package ${pkg};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`);

  await fs.writeFile(path.join(dir, `src/main/java/${pkgPath}/HealthController.java`), `package ${pkg};

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
`);

  await fs.writeFile(path.join(dir, 'src/main/resources/application.yml'), `server:\n  port: 8080\n\nspring:\n  application:\n    name: ${path.basename(dir)}\n`);

  if (isGradle) {
    await fs.writeFile(path.join(dir, 'build.gradle.kts'), `plugins {
    java
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
}

group = "com.example"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
`);
  } else {
    await fs.writeFile(path.join(dir, 'pom.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>${path.basename(dir)}</artifactId>
    <version>0.1.0</version>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`);
  }

  await fs.writeFile(path.join(dir, '.gitignore'), 'build/\ntarget/\n.gradle/\n*.class\n.env\n');
}
