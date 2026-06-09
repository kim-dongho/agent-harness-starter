/**
 * @fileoverview Kotlin 스택 보일러플레이트 생성기
 *
 * Ktor 프레임워크의 기본 프로젝트 구조를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';

/**
 * Kotlin Ktor 프로젝트 보일러플레이트를 생성한다.
 *
 * build.gradle.kts, Application.kt, Routing.kt, .gitignore를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupKotlinKtor(dir: string): Promise<void> {
  const appDir = path.join(dir, 'src/main/kotlin/com/example');
  const pluginsDir = path.join(appDir, 'plugins');

  await fs.ensureDir(pluginsDir);

  await fs.writeFile(path.join(dir, 'build.gradle.kts'), `plugins {
    kotlin("jvm") version "2.0.21"
    id("io.ktor.plugin") version "3.0.3"
    kotlin("plugin.serialization") version "2.0.21"
}

group = "com.example"
version = "0.1.0"

application {
    mainClass.set("com.example.ApplicationKt")
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    implementation("ch.qos.logback:logback-classic:1.5.12")
    testImplementation("io.ktor:ktor-server-test-host")
    testImplementation("org.jetbrains.kotlin:kotlin-test")
}
`);

  await fs.writeFile(path.join(dir, 'settings.gradle.kts'), `rootProject.name = "${path.basename(dir)}"
`);

  await fs.writeFile(path.join(appDir, 'Application.kt'), `package com.example

import com.example.plugins.configureRouting
import com.example.plugins.configureSerialization
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*

fun main() {
    embeddedServer(Netty, port = 8080, module = Application::module).start(wait = true)
}

fun Application.module() {
    configureSerialization()
    configureRouting()
}
`);

  await fs.writeFile(path.join(pluginsDir, 'Serialization.kt'), `package com.example.plugins

import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*

fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json()
    }
}
`);

  await fs.writeFile(path.join(pluginsDir, 'Routing.kt'), `package com.example.plugins

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    routing {
        get("/health") {
            call.respond(mapOf("status" to "ok"))
        }
    }
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'build/\n.gradle/\n.idea/\n.env\n');
}
