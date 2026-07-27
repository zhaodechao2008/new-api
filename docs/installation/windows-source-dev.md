# Windows 源码开发环境搭建

> 适用于 **Windows 10/11 + Go 1.22+ + Bun 1.3+ + PostgreSQL + Redis** 的纯源码开发模式,
> 不依赖 Docker / `docker-compose.dev.yml`。
>
> 优点: 后端改 Go 即热重载 (Go 进程直接 `go run`),前端改 TS 即 HMR,无需重建镜像。

## 1. 前置依赖

| 工具 | 推荐版本 | 验证 | 备注 |
|---|---|---|---|
| Go | 1.22+ (实测 1.26.5) | `go version` | 不在默认 PATH 需手动加 |
| Bun | 1.3+ (实测 1.3.14) | `bun --version` | Windows 安装方式见 §1.2 |
| Node.js | 20+ (实测 22.22) | `node --version` | npm 10.x 备用 |
| PostgreSQL | 13+ | `psql -c "SELECT 1"` | 可用本地或远端 |
| Redis | 6+ | `redis-cli ping` | 可用本地或远端 |

### 1.1 PATH 注入

大多数 Windows 工具(Go、Bun)默认不会写入用户 PATH,需要每次新 shell 显式注入:

```bash
export PATH="/c/Program Files/Go/bin:/c/Users/Administrator/.bun/bin:$PATH"
```

### 1.2 安装 Bun

GitHub 直连在某些网络下不稳定,推荐 PowerShell 脚本:

```powershell
irm bun.sh/install.ps1 | iex
```

如果脚本因为 GitHub release 拉链失败而只创建 `bunx.exe`,可以用 `bunx.exe` 直接当 bun 用:

```bash
cp C:/Users/Administrator/.bun/bin/bunx.exe C:/Users/Administrator/.bun/bin/bun.exe
```

`bunx.exe` 是 bun 工具链的单二进制多入口,所有 `bun` 子命令都可用。

### 1.3 Go 镜像代理

部分网络下 `proxy.golang.org` 解析到 IPv6 后 connect 超时,需强制 IPv4 镜像:

```bash
export GOPROXY="https://goproxy.cn,direct"
export GOSUMDB="sum.golang.google.cn"
```

否则 `go run` / `go mod` 任何命令都会卡在下载阶段。

## 2. 配置文件 `.env`

仓库根目录没有 `.env` 时,会回退到 SQLite + 内存缓存。要切到 PostgreSQL + Redis,
**自己创建** `d:\workspace\github\new-api\.env`:

```env
# PostgreSQL
SQL_DSN=postgres://user:password@host:5432/dbname?sslmode=disable&TimeZone=Asia/Shanghai

# Redis
REDIS_CONN_STRING=redis://:password@host:6379/0

TZ=Asia/Shanghai
PORT=3000

# Rsbuild dev 服务器代理 :5173 -> :3000,关闭 Secure Cookie
SESSION_COOKIE_SECURE=false

DEBUG=true
MEMORY_CACHE_ENABLED=true
BATCH_UPDATE_ENABLED=true
```

DSN 同时支持 `postgres://` URL 和 `key=value` 两种形式;Redis 通过 `redis.ParseURL` 解析,
密码必须在 `//:` 之后(授权段)。

## 3. 占位 `web/dist`

`main.go` 用 `//go:embed web/dist` 嵌入前端静态目录。**源码启动后端前** 必须先有占位文件:

```bash
mkdir -p web/dist
echo '<!doctype html><html><head><title>dev</title></head><body>use http://localhost:5173</body></html>' > web/dist/index.html
```

前端 dev server 启动后,这个文件会被 Rsbuild 的实际产物覆盖/无视。

## 4. 前端依赖 `web/`

### 4.1 跨工具协作 (重要)

`AGENTS.md` 推荐 `bun install`,但 Windows + bun 1.3.14 有 3 个已知坑:

1. **不会生成 `node_modules/.bin/`** — `bun run dev` 找不到 `rsbuild` 命令。

   **绕过**: 手动 `node node_modules/@rsbuild/core/bin/rsbuild.js dev` 启动,或在被 npm 重建过的 `.bin` 上跑 `bun run dev`。

2. **默认不装 `optionalDependencies`** — `@rspack/binding-win32-x64-msvc` 在 `package.json` 里是 `optionalDependencies`,Rsbuild 跑起来会报:

   ```
   Cannot find module './rspack.win32-x64-msvc.node'
   ```

   **绕过**: 单独 `npm install @rspack/binding-win32-x64-msvc@<匹配版本> --no-save`,该包会被装入 `node_modules/@rspack/binding-win32-x64-msvc/rspack.win32-x64-msvc.node`。**不要**用 `bun install --trust`(会给所有包跑 postinstall,安全风险)。

3. **在已有 700+ 目录的 `node_modules` 上跑 `bun install` 会卡死** — bun 闭链时内部会 hang(0 字节 output, 内存不变)。**绕过**: 第一次跑之前先 `rm -rf node_modules package-lock.json`,让 bun 从干净状态装。

4. **稀疏目录 bug** — bun 在 Windows 解压某些纯 ESM 包(如 `@hugeicons/core-free-icons`)只挂空目录节点,`package.json` 缺失,Rsbuild 报 `Module not found`。**绕过**: 该包单独 `npm install @hugeicons/core-free-icons@<匹配版本> --no-save`。

### 4.2 推荐首次安装流程

```bash
cd web
rm -rf node_modules package-lock.json        # 避免 bun 增量卡死
export PATH="/c/Users/Administrator/.bun/bin:$PATH"
bun install                                  # ~3 分钟,一次性

# 补装 bun 跳过的 optional dep
npm install @rspack/binding-win32-x64-msvc@2.1.4 --no-save
# 补装 bun 漏解压的 ESM 包(具体版本以 bun.lock 为准)
npm install @hugeicons/core-free-icons@4.2.2 --no-save
```

可选: 在 `package.json` 加 `trustedDependencies`,让 `bun install` 看到白名单后能跑这些包的 postinstall,但仍**不会主动把 optional dep 装上**,所以单装这步不可省。

### 4.3 启动 dev server

```bash
bun run dev --host 0.0.0.0 --port 5173
# 或备选
node node_modules/@rsbuild/core/bin/rsbuild.js dev --host 0.0.0.0 --port 5173
```

启动成功标志:

```
Rsbuild v2.x.y
➜  Local:    http://localhost:5173/
ready   built in 17.4s
```

## 5. 后端 `main.go`

### 5.1 正确启动命令

```bash
export PATH="/c/Program Files/Go/bin:$PATH"
export GOPROXY="https://goproxy.cn,direct"
export GOSUMDB="sum.golang.google.cn"

cd /d/workspace/github/new-api
go run .                                # ✅ 编译整个根包
```

### 5.2 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `configureTrustedProxies undefined` | 用 `go run main.go` 只编译单个文件 | 改 `go run .` |
| `pattern web/dist: no matching files found` | `web/dist` 缺失 | 见 §3 |
| `web/proxy.golang.org: dial tcp [::1]:443 ...` | IPv6 路径阻塞 | 设 `GOPROXY=goproxy.cn` |
| 根目录遗留 `probe.go` 等一次性探测文件 | 调试时残留,`go run .` 会把同包所有 .go 一起编译 | 删掉即可 |

## 6. 完整启动流程

```bash
# 一次性环境准备
export PATH="/c/Program Files/Go/bin:/c/Users/Administrator/.bun/bin:$PATH"
export GOPROXY="https://goproxy.cn,direct"
export GOSUMDB="sum.golang.google.cn"

# 后端
cd /d/workspace/github/new-api
go run . &
# 等待出现 "server started" / "Start server" 类日志,以及 :3000 监听

# 前端 (另开 shell,同一 PATH)
cd /d/workspace/github/new-api/web
bun run dev --host 0.0.0.0 --port 5173
```

## 7. 详细启动过程 (从零到 first request)

下面是一份按序执行的工作流,假设你刚 clone 仓库、第一次启动。每步后都附验证点。

### 7.1 步骤检查表

```
[ ] 1. 工具确认 (Go / Bun / Node / Redis / PG)
[ ] 2. 写 .env (PG + Redis)
[ ] 3. 创建 web/dist/index.html (go:embed 占位)
[ ] 4. 清理 web/node_modules 残留
[ ] 5. bun install 装前端主依赖
[ ] 6. 补装 @rspack/binding-win32-x64-msvc
[ ] 7. 补装 @hugeicons/core-free-icons (如遇 Module not found)
[ ] 8. 启动后端 go run .
[ ] 9. 启动前端 dev server
[ ] 10. 验证 5173 → 3000 代理
[ ] 11. 浏览器走设置向导
```

### 7.2 步骤 1: 工具确认

```bash
# 注入 PATH (新 shell 每次)
export PATH="/c/Program Files/Go/bin:/c/Users/Administrator/.bun/bin:$PATH"

# 验证
go version       # → go1.26.5 windows/amd64
bun --version    # → 1.3.14
node --version   # → v22.22.1

# 验证 PG/Redis 可达(可选,但省得后端跑起来才发现)
nc -zv 117.72.106.64 5432   # PG TCP
nc -zv 117.72.106.64 6379   # Redis TCP
```

`nc` 不可用时可用 Go 探活:

```bash
mkdir -p /tmp/probe && cd /tmp/probe
cat > main.go <<'EOF'
package main
import ("fmt"; "net"; "time")
func main() {
  for _, a := range []string{"117.72.106.64:5432", "117.72.106.64:6379"} {
    c, err := net.DialTimeout("tcp", a, 5*time.Second)
    if err != nil { fmt.Println(a, "FAIL", err); continue }
    c.Close()
    fmt.Println(a, "OK")
  }
}
EOF
go run main.go
```

### 7.3 步骤 2: 写 `.env`

仓库根目录 `.env` 不会被创建,从 [`.env.example`](../..)复制并改写:

```bash
cd /d/workspace/github/new-api
cp .env.example .env
# 在编辑器里改 SQL_DSN / REDIS_CONN_STRING / TZ
```

模板:

```env
SQL_DSN=postgres://root:123456@117.72.106.64:5432/new-api-ops?sslmode=disable&TimeZone=Asia/Shanghai
REDIS_CONN_STRING=redis://:Wj1SKIZLb@117.72.106.64:6379/0
TZ=Asia/Shanghai
PORT=3000
SESSION_COOKIE_SECURE=false
DEBUG=true
MEMORY_CACHE_ENABLED=true
BATCH_UPDATE_ENABLED=true
```

### 7.4 步骤 3: 占位 `web/dist/index.html`

```bash
cd /d/workspace/github/new-api
mkdir -p web/dist
echo '<!doctype html><html><head><title>dev</title></head><body>use http://localhost:5173</body></html>' > web/dist/index.html
```

这一步**必须在 `go run .` 之前**。否则编译失败:

```
pattern web/dist: no matching files found
```

### 7.5 步骤 4: 清理旧 `node_modules` (如有)

```bash
cd /d/workspace/github/new-api/web
ls node_modules 2>/dev/null && rm -rf node_modules package-lock.json
```

如果 `node_modules` 已有 700+ 目录,`bun install` 会在增量对齐时 hang(实测 0 字节 output, 内存不变)。先清后装能避开。

### 7.6 步骤 5: `bun install`

```bash
export PATH="/c/Users/Administrator/.bun/bin:$PATH"
bun install
```

**预期耗时**: 3-5 分钟。**预期输出**: 1-2 行 `bun install v1.x.y (sha)` 然后退出 0。

如果 5 分钟后仍无响应(或 task 状态是 running 但 output 0 字节、内存不变),`TaskStop` 后回到 §7.5 重新清理。

### 7.7 步骤 6: 补装 RSPack native binding

```bash
cd /d/workspace/github/new-api/web
npm install @rspack/binding-win32-x64-msvc@2.1.4 --no-save --no-audit --no-fund
ls node_modules/@rspack/binding-win32-x64-msvc/rspack.win32-x64-msvc.node
# → 必须能看到 .node 文件
```

成功标志: 文件存在。如果报 `E404`,看 `node_modules/@rspack/binding/package.json` 里的 `optionalDependencies` 段,装对应版本。

### 7.8 步骤 7: 补装 hugeicons (如遇 Module not found)

只有 `bun run dev` 报

```
Module not found: Can't resolve '@hugeicons/core-free-icons'
```

时才需要:

```bash
cd /d/workspace/github/new-api/web
npm install @hugeicons/core-free-icons@4.2.2 --no-save --no-audit --no-fund
ls node_modules/@hugeicons/core-free-icons/package.json
# → 必须存在
```

如果这种 sparse-dir 漏装出现在其他包上,规律一样: `npm install <pkg>@<version> --no-save` 单装。

### 7.9 步骤 8: 启动后端

```bash
export PATH="/c/Program Files/Go/bin:$PATH"
export GOPROXY="https://goproxy.cn,direct"
export GOSUMDB="sum.golang.google.cn"

cd /d/workspace/github/new-api
go run .        # 注意是 `go run .` 不是 `go run main.go`
```

**首次启动会跑 GORM AutoMigrate**,耗时视 PG 网络延迟,通常 30-60 秒。

成功标志:

```
# 关键日志行
using PostgreSQL as database
Start server on port 3000
```

进程在后台运行后:

```bash
curl -s http://localhost:3000/api/status | head -c 200
# → {"data":{"setup":true,...}, "success":true}
```

### 7.10 步骤 9: 启动前端 dev server

**另开 shell**,同样注入 PATH:

```bash
export PATH="/c/Users/Administrator/.bun/bin:$PATH"
cd /d/workspace/github/new-api/web
bun run dev --host 0.0.0.0 --port 5173
```

**首次启动 Rsbuild 编译需要 16-20 秒**。

成功标志:

```
Rsbuild v2.1.6
➜  Local:    http://localhost:5173/
ready   built in 17.4s
```

如果 5173 被占,Rsbuild 会自动 fallback 到 5174 / 5175 等。

### 7.11 步骤 10: 验证代理

```bash
# 直连后端
curl -s http://localhost:3000/api/status | head -c 100

# 经前端 dev proxy
curl -s http://localhost:5173/api/status | head -c 100
# 两个 response 应一致
```

dev proxy 范围(`/api`、`/mj`、`/pg`),源在 `web/rsbuild.config.ts`。

### 7.12 步骤 11: 浏览器走设置向导

打开 `http://localhost:5173`,系统检测到 `setup: true` 会自动跳转设置向导:

1. 创建 root 管理员账号
2. 选择是否启用自用模式 / 演示站点
3. 进入主控制台

之后所有"用户/渠道/模型/账单"配置都在 Web UI 完成。

### 7.13 完整流程 (一段串讲)

```bash
# === Shell A 或后台 ===
export PATH="/c/Program Files/Go/bin:/c/Users/Administrator/.bun/bin:$PATH"
export GOPROXY="https://goproxy.cn,direct"
export GOSUMDB="sum.golang.google.cn"

# 准备
cd /d/workspace/github/new-api
cp .env.example .env       # 改 SQL_DSN / REDIS_CONN_STRING
mkdir -p web/dist
echo '<!doctype html><html><head><title>dev</title></head><body>use 5173</body></html>' > web/dist/index.html

# 后端
go run .                  # 阻塞在前台

# === Shell B (前端) ===
export PATH="/c/Users/Administrator/.bun/bin:$PATH"
cd /d/workspace/github/new-api/web
ls node_modules 2>/dev/null && rm -rf node_modules package-lock.json
bun install
npm install @rspack/binding-win32-x64-msvc@2.1.4 --no-save
bun run dev --host 0.0.0.0 --port 5173

# === 验证 (任意 shell) ===
curl -s http://localhost:3000/api/status | head -c 100
curl -s http://localhost:5173/api/status | head -c 100
# 浏览器打开 http://localhost:5173
```

## 8. 验证清单

```bash
# 后端直连
curl -s http://localhost:3000/api/status | head -c 200

# 前端 dev proxy 转发
curl -s http://localhost:5173/api/status | head -c 200
# 两个 response 应该一致,setup: true 表示首次启动需要走设置向导

# Rsbuild HMR 客户端存在
curl -s http://localhost:5173/ | grep -E "rsbuild|hmr|hot"
```

## 9. 常见排错

- **修改 Go 代码后没生效** — `go run .` 监听文件变化会自动重启,无需手动重启。
- **前端改 .tsx 不 HMR** — Rsbuild 的 Rspack binding 没装上 (§4.1.2),重启 dev server。
- **5173 端口被占** — 杀掉占用 PID(可能是残留进程),或换端口 `--port 5174`。
- **Bun 进程残留** — `taskkill //F //IM bun.exe`。
- **Redis 拒绝连接** — `REDIS_CONN_STRING` 密码格式必须是 `redis://:password@host:port/0`(注意 `//` 和 `:` 之间是空用户,密码直接接 `:`);如果密码含特殊字符需 URL-encode。

## 10. 与 Docker 方式的对比

| 维度 | 源码 (本文) | Docker (`docker-compose.dev.yml`) |
|---|---|---|
| 启动反馈 | 即时 | 容器构建 1-3 分钟 |
| 后端改 Go | `go run .` 自动重载 | 需 `docker compose up -d --build` |
| 前端改 TS | Rsbuild HMR 立即 | Rsbuild HMR 立即(同本文) |
| 数据库 | 远端 PG/Redis 或本地 | 容器内 |
| 适用场景 | 日常开发、本地调试 | 复现生产环境、CI |

## 11. 重要改动文件清单

- `d:\workspace\github\new-api\.env` — PG/Redis 配置(不进 git)
- `d:\workspace\github\new-api\web\dist\index.html` — `go:embed` 占位(选择是否进 git)
- `d:\workspace\github\new-api\web\package.json` — `trustedDependencies` 字段(传 bun)
- `d:\workspace\github\new-api\web\node_modules/` — 装出来的依赖(必须在 `.gitignore`)
- `d:\workspace\github\new-api\web/package-lock.json` — npm 重建产生(必须在 `.gitignore`)
