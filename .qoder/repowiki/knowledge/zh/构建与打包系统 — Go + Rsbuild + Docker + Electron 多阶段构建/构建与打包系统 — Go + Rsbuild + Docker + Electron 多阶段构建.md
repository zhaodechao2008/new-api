---
kind: build_system
name: 构建与打包系统 — Go + Rsbuild + Docker + Electron 多阶段构建
category: build_system
scope:
    - '**'
source_files:
    - makefile
    - Dockerfile
    - Dockerfile.dev
    - docker-compose.yml
    - docker-compose.dev.yml
    - go.mod
    - web/package.json
    - electron/build.sh
    - VERSION
---

## 1. 使用的系统与工具链
- **Go 后端**：模块路径 `github.com/QuantumNous/new-api`，Go 版本 1.25.1（go.mod 声明），使用 `go build` 编译单二进制，CGO 默认关闭（Dockerfile 中 `CGO_ENABLED=0`）。
- **前端构建**：基于 Rsbuild（`@rsbuild/core`）+ React + TypeScript，包管理器为 Bun（`bun install --frozen-lockfile`、`bun run build`）。
- **容器化**：多阶段 Docker 构建，第一阶段用 `oven/bun:1` 构建前端静态资源，第二阶段用 `golang:1.26.1-alpine` 编译 Go 二进制，最终产物放入 `debian:bookworm-slim` 运行镜像。
- **桌面客户端**：Electron 应用通过 `electron/build.sh` 脚本依次构建前端、Go 后端，再调用 npm 的 `build:mac / build:linux / build:win` 打包各平台安装包。
- **开发编排**：`docker-compose.yml`（生产/通用）与 `docker-compose.dev.yml`（开发，挂载源码并跳过前端构建）提供一键启动 API、PostgreSQL、Redis（可选 MySQL/ClickHouse）。
- **Makefile 统一入口**：根目录 `makefile` 封装了 `build-web`、`start-api`、`dev`、`dev-api`、`reset-setup` 等常用操作。

## 2. 关键文件与位置
- `makefile` — 开发/构建的统一 Make 目标
- `Dockerfile` — 生产多阶段构建（Bun → Go → Slim 运行镜像）
- `Dockerfile.dev` — 开发专用镜像（跳过前端构建，注入占位 HTML）
- `docker-compose.yml` / `docker-compose.dev.yml` — 服务编排与环境变量配置
- `go.mod` / `go.sum` — Go 依赖管理
- `web/package.json` — 前端脚本（dev/build/lint/typecheck/i18n 同步等）
- `electron/build.sh` — Electron 桌面端跨平台打包脚本
- `VERSION` — 版本号来源（被 `VITE_REACT_APP_VERSION` 和 Go `-X` ldflags 注入）

## 3. 架构与约定
- **多阶段构建分离关注点**：前端静态资源与 Go 二进制分别在不同阶段构建，最终运行时镜像仅包含编译产物与必要证书/时区数据，体积最小化。
- **版本注入约定**：`VERSION` 文件内容在两个层面被注入——前端通过环境变量 `VITE_REACT_APP_VERSION`，后端通过 `go build -ldflags "-X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'"` 编译期常量注入。
- **开发/生产双镜像**：`Dockerfile.dev` 通过创建空 `web/dist/index.html` 绕过 `//go:embed web/dist` 嵌入要求，使后端可在不构建前端的情况下独立运行，配合 `make dev-web` 的 Rsbuild 热更新。
- **数据库可插拔**：`docker-compose.yml` 默认启用 PostgreSQL，注释切换即可改用 MySQL 或 ClickHouse（用于日志），并通过 `SQL_DSN` / `LOG_SQL_DSN` 环境变量控制。
- **Electron 打包按 OS 分支**：`electron/build.sh` 根据 `$OSTYPE` 判断 macOS/Linux/Windows，分别执行对应的 `npm run build:*` 命令。

## 4. 约定与约束
- **Go 构建必须禁用 CGO**：Dockerfile 显式设置 `CGO_ENABLED=0`，确保生成纯 Go 静态二进制，便于在多架构镜像中分发。
- **前端依赖锁定**：所有 `bun install` 均使用 `--frozen-lockfile`，保证构建可重现。
- **ESLint 插件禁用**：构建前端时设置 `DISABLE_ESLINT_PLUGIN='true'`，避免 lint 检查阻塞构建流程。
- **端口暴露固定为 3000**：Dockerfile 与 compose 文件统一暴露 `EXPOSE 3000`，API 监听端口约定为 3000。
- **工作目录约定**：生产镜像将工作目录设为 `/data`，用于持久化数据库与日志；开发镜像通过 volume 挂载 `./data:/data`。
- **健康检查与依赖顺序**：compose 中对 postgres 使用 `pg_isready` 健康检查，new-api 服务通过 `depends_on` 与 `condition: service_healthy` 确保依赖就绪后再启动。
- **安全警告**：compose 文件中多处标注 `⚠️ IMPORTANT: Change all default passwords before deploying to production!`，强调默认密码不可用于生产。

## 5. CI/流水线
仓库未包含 `.github/workflows` 下的 CI 配置文件，当前构建主要依赖本地 `makefile`、`Dockerfile` 与 `electron/build.sh` 手动触发。