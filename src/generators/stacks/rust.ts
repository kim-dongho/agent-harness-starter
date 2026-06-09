/**
 * @fileoverview Rust 스택 보일러플레이트 생성기
 *
 * Axum 및 Actix Web 프레임워크의 기본 프로젝트 구조를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';

/**
 * Rust Axum 프로젝트 보일러플레이트를 생성한다.
 *
 * Cargo.toml, src/main.rs, .gitignore를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupRustAxum(dir: string): Promise<void> {
  const name = path.basename(dir);

  await fs.ensureDir(path.join(dir, 'src'));

  await fs.writeFile(path.join(dir, 'Cargo.toml'), `[package]
name = "${name}"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
`);

  await fs.writeFile(path.join(dir, 'src/main.rs'), `use axum::{routing::get, Json, Router};
use serde::Serialize;

#[derive(Serialize)]
struct Health {
    status: String,
}

async fn health() -> Json<Health> {
    Json(Health {
        status: "ok".to_string(),
    })
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/health", get(health));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), '/target\n.env\n');
}

/**
 * Rust Actix Web 프로젝트 보일러플레이트를 생성한다.
 *
 * Cargo.toml, src/main.rs, .gitignore를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupRustActix(dir: string): Promise<void> {
  const name = path.basename(dir);

  await fs.ensureDir(path.join(dir, 'src'));

  await fs.writeFile(path.join(dir, 'Cargo.toml'), `[package]
name = "${name}"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
`);

  await fs.writeFile(path.join(dir, 'src/main.rs'), `use actix_web::{get, web, App, HttpServer, Responder};
use serde::Serialize;

#[derive(Serialize)]
struct Health {
    status: String,
}

#[get("/health")]
async fn health() -> impl Responder {
    web::Json(Health {
        status: "ok".to_string(),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(health))
        .bind("0.0.0.0:8080")?
        .run()
        .await
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), '/target\n.env\n');
}
