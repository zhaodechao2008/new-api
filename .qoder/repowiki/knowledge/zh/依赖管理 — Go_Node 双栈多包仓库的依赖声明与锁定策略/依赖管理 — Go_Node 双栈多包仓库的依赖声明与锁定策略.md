---
kind: dependency_management
name: 依赖管理 — Go/Node 双栈多包仓库的依赖声明与锁定策略
category: dependency_management
scope:
    - '**'
source_files:
    - go.mod
    - go.sum
    - web/package.json
    - web/bun.lock
    - web/.npmrc
    - electron/package.json
    - electron/package-lock.json
---

本仓库采用 Go + Node.js 双栈架构，分别通过 go.mod/go.sum 与 npm/Bun 进行第三方依赖管理，并在 Electron 子工程中独立维护桌面端依赖。

1. Go 后端依赖管理
- 模块定义：根目录 go.mod 声明 module github.com/QuantumNous/new-api，Go 版本为 1.25.1，所有直接依赖集中在 require 块中，间接依赖由 go.sum 锁定。
- 依赖范围：核心依赖涵盖 Gin Web 框架、GORM 多数据库驱动（MySQL/PostgreSQL/SQLite/ClickHouse）、Redis 客户端、JWT、OAuth、AWS SDK v2、Stripe/Waffo 支付、i18n、限流、性能分析等；测试依赖（如 testify、miniredis）与生产依赖分离在独立的 require 块中。
- 版本锁定：go.sum 完整记录每个依赖的 go.mod 与哈希校验，确保构建可重现；未发现 vendor 目录，依赖通过 Go Modules 缓存下载。
- 私有源/代理：未配置 GOPRIVATE、GONOSUMDB、GONOPROXY 或 go mod proxy 替换规则，默认使用官方 Go 模块代理与 GitHub 源。

2. Web 前端依赖管理
- 包管理器：web/package.json 声明 React/TanStack Router/Rsbuild/Tailwind 等依赖，开发脚本包含 rsbuild dev/build、oxlint、knip 等工具链。
- 锁定文件：web/bun.lock 使用 Bun lockfile v1 格式，精确锁定所有包的版本与 sha512 校验和，保证跨环境一致安装。
- 依赖覆盖：package.json 中 overrides 字段强制覆盖 brace-expansion、dompurify、fast-uri、hono、ip-address、js-cookie、mermaid、minimist、postcss、qs、uuid 等存在安全漏洞或冲突的传递依赖至指定版本。
- 注册表：web/.npmrc 显式设置 registry=https://registry.npmjs.org/，使用官方 npm 源。

3. Electron 桌面端依赖管理
- 独立工程：electron/package.json 仅声明 cross-env、electron、electron-builder 三个 devDependencies，用于打包 Go 二进制为跨平台桌面应用。
- 锁定文件：electron/package-lock.json 使用 npm lockfile v3，精确锁定 electron-builder 及其依赖树。
- 资源嵌入：electron-builder 配置将编译后的 new-api 二进制及许可证文件作为 extraResources 嵌入安装包。

4. 约束与约定
- Go 依赖通过 go.mod 集中声明、go.sum 锁定，无 vendoring，无私有模块代理配置。
- Web 依赖通过 package.json + bun.lock 双重锁定，并使用 overrides 强制修复已知漏洞依赖。
- Electron 依赖最小化，仅保留打包所需工具链，实际业务代码由 Go 后端提供。
- 未发现私有 npm 镜像或 Go 私有仓库配置，所有依赖均从公开源获取。