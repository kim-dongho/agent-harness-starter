/**
 * @fileoverview Go 스택 보일러플레이트 생성기
 *
 * Gin 및 Echo 프레임워크의 기본 프로젝트 구조를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../../prompts/types.js';

/**
 * Go Gin 프로젝트 보일러플레이트를 생성한다.
 *
 * go.mod, cmd/server/main.go, internal/handler/ 구조를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param _config - 스택 설정 옵션 (현재 미사용)
 */
export async function setupGoGin(dir: string, _config: StackConfig): Promise<void> {
  const modName = `github.com/${path.basename(dir)}`;

  await fs.ensureDir(path.join(dir, 'cmd/server'));
  await fs.ensureDir(path.join(dir, 'internal/handler'));

  await fs.writeFile(path.join(dir, 'go.mod'), `module ${modName}\n\ngo 1.23\n\nrequire github.com/gin-gonic/gin v1.10.0\n`);

  await fs.writeFile(path.join(dir, 'cmd/server/main.go'), `package main

import (
\t"log"

\t"github.com/gin-gonic/gin"
\t"${modName}/internal/handler"
)

func main() {
\tr := gin.Default()
\tr.GET("/health", handler.Health)
\tif err := r.Run(":8080"); err != nil {
\t\tlog.Fatal(err)
\t}
}
`);

  await fs.writeFile(path.join(dir, 'internal/handler/health.go'), `package handler

import (
\t"net/http"
\t"github.com/gin-gonic/gin"
)

func Health(c *gin.Context) {
\tc.JSON(http.StatusOK, gin.H{"status": "ok"})
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'bin/\ntmp/\n.env\n');
}

/**
 * Go Echo 프로젝트 보일러플레이트를 생성한다.
 *
 * go.mod, cmd/server/main.go, internal/handler/ 구조를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param _config - 스택 설정 옵션 (현재 미사용)
 */
export async function setupGoEcho(dir: string, _config: StackConfig): Promise<void> {
  const modName = `github.com/${path.basename(dir)}`;

  await fs.ensureDir(path.join(dir, 'cmd/server'));
  await fs.ensureDir(path.join(dir, 'internal/handler'));

  await fs.writeFile(path.join(dir, 'go.mod'), `module ${modName}\n\ngo 1.23\n\nrequire github.com/labstack/echo/v4 v4.12.0\n`);

  await fs.writeFile(path.join(dir, 'cmd/server/main.go'), `package main

import (
\t"${modName}/internal/handler"
\t"github.com/labstack/echo/v4"
)

func main() {
\te := echo.New()
\te.GET("/health", handler.Health)
\te.Logger.Fatal(e.Start(":8080"))
}
`);

  await fs.writeFile(path.join(dir, 'internal/handler/health.go'), `package handler

import (
\t"net/http"
\t"github.com/labstack/echo/v4"
)

func Health(c echo.Context) error {
\treturn c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'bin/\ntmp/\n.env\n');
}

/**
 * Go Fiber 프로젝트 보일러플레이트를 생성한다.
 *
 * go.mod, cmd/server/main.go, internal/handler/ 구조를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param _config - 스택 설정 옵션 (현재 미사용)
 */
export async function setupGoFiber(dir: string, _config: StackConfig): Promise<void> {
  const modName = `github.com/${path.basename(dir)}`;

  await fs.ensureDir(path.join(dir, 'cmd/server'));
  await fs.ensureDir(path.join(dir, 'internal/handler'));

  await fs.writeFile(path.join(dir, 'go.mod'), `module ${modName}\n\ngo 1.23\n\nrequire github.com/gofiber/fiber/v2 v2.52.0\n`);

  await fs.writeFile(path.join(dir, 'cmd/server/main.go'), `package main

import (
\t"log"

\t"github.com/gofiber/fiber/v2"
\t"${modName}/internal/handler"
)

func main() {
\tapp := fiber.New()
\tapp.Get("/health", handler.Health)
\tif err := app.Listen(":8080"); err != nil {
\t\tlog.Fatal(err)
\t}
}
`);

  await fs.writeFile(path.join(dir, 'internal/handler/health.go'), `package handler

import "github.com/gofiber/fiber/v2"

func Health(c *fiber.Ctx) error {
\treturn c.JSON(fiber.Map{"status": "ok"})
}
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'bin/\ntmp/\n.env\n');
}
