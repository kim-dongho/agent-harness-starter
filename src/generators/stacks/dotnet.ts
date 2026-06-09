/**
 * @fileoverview .NET 스택 보일러플레이트 생성기
 *
 * ASP.NET Core Minimal API 프로젝트의 기본 구조를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';

/**
 * .NET 프로젝트 보일러플레이트를 생성한다.
 *
 * .csproj, Program.cs, .gitignore를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 */
export async function setupDotnet(dir: string): Promise<void> {
  const name = path.basename(dir).replace(/-/g, '_');

  await fs.writeFile(path.join(dir, `${name}.csproj`), `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AssemblyName>app</AssemblyName>
  </PropertyGroup>

</Project>
`);

  await fs.writeFile(path.join(dir, 'Program.cs'), `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Json(new { status = "ok" }));

app.Run("http://0.0.0.0:8080");
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'bin/\nobj/\n.env\n');
}
