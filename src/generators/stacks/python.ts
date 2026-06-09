/**
 * @fileoverview Python 스택 보일러플레이트 생성기
 *
 * FastAPI 및 Django 프로젝트의 기본 구조와 패키지 매니저별 의존성 파일을 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../../prompts/types.js';

/**
 * Python FastAPI 프로젝트 보일러플레이트를 생성한다.
 *
 * app/ 디렉토리, main.py, 패키지 매니저별 의존성 파일을 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션 (pythonPackageManager 필드 사용)
 */
export async function setupPythonFastAPI(dir: string, config: StackConfig): Promise<void> {
  await fs.ensureDir(path.join(dir, 'app'));
  await fs.writeFile(path.join(dir, 'app/__init__.py'), '');

  await fs.writeFile(path.join(dir, 'app/main.py'), `from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
`);

  await writePythonDeps(dir, config, ['fastapi>=0.115.0', 'uvicorn[standard]>=0.30.0'], ['pytest>=8.0.0', 'httpx>=0.27.0']);
  await fs.writeFile(path.join(dir, '.gitignore'), '__pycache__/\n*.pyc\n.venv/\n.env\n');
}

/**
 * Python Django 프로젝트 보일러플레이트를 생성한다.
 *
 * 패키지 매니저별 의존성 파일과 .gitignore를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션 (pythonPackageManager 필드 사용)
 */
export async function setupPythonDjango(dir: string, config: StackConfig): Promise<void> {
  const projectName = path.basename(dir).replace(/-/g, '_');
  await fs.ensureDir(path.join(dir, projectName));

  await fs.writeFile(path.join(dir, 'manage.py'), `#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "${projectName}.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
`);

  await fs.writeFile(path.join(dir, `${projectName}/__init__.py`), '');
  await fs.writeFile(path.join(dir, `${projectName}/settings.py`), `import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
]

ROOT_URLCONF = "${projectName}.urls"

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

DATABASES = {}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
`);

  await fs.writeFile(path.join(dir, `${projectName}/urls.py`), `from django.http import JsonResponse
from django.urls import path


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health", health),
]
`);

  await fs.writeFile(path.join(dir, `${projectName}/wsgi.py`), `import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "${projectName}.settings")
application = get_wsgi_application()
`);

  await writePythonDeps(dir, config, ['django>=5.1'], ['pytest>=8.0.0', 'pytest-django>=4.8.0']);
  await fs.writeFile(path.join(dir, '.gitignore'), '__pycache__/\n*.pyc\n.venv/\n.env\ndb.sqlite3\n');
}

/**
 * Python Flask 프로젝트 보일러플레이트를 생성한다.
 *
 * app/ 디렉토리, __init__.py(Flask app factory), 패키지 매니저별 의존성 파일을 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션 (pythonPackageManager 필드 사용)
 */
export async function setupPythonFlask(dir: string, config: StackConfig): Promise<void> {
  await fs.ensureDir(path.join(dir, 'app'));

  await fs.writeFile(path.join(dir, 'app/__init__.py'), `from flask import Flask


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
`);

  await writePythonDeps(dir, config, ['flask>=3.1.0'], ['pytest>=8.0.0']);
  await fs.writeFile(path.join(dir, '.gitignore'), '__pycache__/\n*.pyc\n.venv/\n.env\n');
}

async function writePythonDeps(dir: string, config: StackConfig, deps: string[], devDeps: string[]): Promise<void> {
  const name = path.basename(dir);

  if (config.pythonPackageManager === 'uv') {
    await fs.writeFile(path.join(dir, 'pyproject.toml'), `[project]
name = "${name}"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
${deps.map((d) => `    "${d}",`).join('\n')}
]

[tool.uv]
dev-dependencies = [
${devDeps.map((d) => `    "${d}",`).join('\n')}
]
`);
  } else if (config.pythonPackageManager === 'poetry') {
    const fmtDep = (d: string) => {
      // Handle extras like uvicorn[standard]>=0.30.0
      const match = d.match(/^([a-zA-Z0-9_-]+)(?:\[([^\]]+)\])?>=(.+)$/);
      if (!match) return `${d} = "*"`;
      const [, pkg, extras, ver] = match;
      if (extras) {
        return `${pkg} = {version = ">=${ver}", extras = ["${extras}"]}`;
      }
      return `${pkg} = ">=${ver}"`;
    };
    await fs.writeFile(path.join(dir, 'pyproject.toml'), `[tool.poetry]
name = "${name}"
version = "0.1.0"
description = ""

[tool.poetry.dependencies]
python = "^3.12"
${deps.map(fmtDep).join('\n')}

[tool.poetry.group.dev.dependencies]
${devDeps.map(fmtDep).join('\n')}

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
`);
  } else {
    await fs.writeFile(path.join(dir, 'requirements.txt'), deps.join('\n') + '\n');
    await fs.writeFile(path.join(dir, 'requirements-dev.txt'), devDeps.join('\n') + '\n');
  }
}
