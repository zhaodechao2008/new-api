# API参考

<cite>
**本文引用的文件**   
- [main.go](file://main.go)
- [router/api-router.go](file://router/api-router.go)
- [router/relay-router.go](file://router/relay-router.go)
- [router/web-router.go](file://router/web-router.go)
- [middleware/auth.go](file://middleware/auth.go)
- [middleware/rate-limit.go](file://middleware/rate-limit.go)
- [common/limiter/limiter.go](file://common/limiter/limiter.go)
- [dto/openai_request.go](file://dto/openai_request.go)
- [dto/openai_response.go](file://dto/openai_response.go)
- [dto/request_common.go](file://dto/request_common.go)
- [dto/error.go](file://dto/error.go)
- [relay/chat_completions_via_responses.go](file://relay/chat_completions_via_responses.go)
- [relay/responses_handler.go](file://relay/responses_handler.go)
- [relay/websocket.go](file://relay/websocket.go)
- [service/http.go](file://service/http.go)
- [setting/config/config.go](file://setting/config/config.go)
- [docs/openapi/relay.json](file://docs/openapi/relay.json)
- [docs/openapi/api.json](file://docs/openapi/api.json)
</cite>

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本API参考文档面向开发者，系统化记录本项目的RESTful API、OpenAI兼容接口、管理API与Webhook接口的使用方法。内容涵盖HTTP方法与URL模式、请求/响应体结构、认证方式、WebSocket实时交互、错误处理策略、安全与速率限制、版本信息、常见用例、客户端实现指南、性能优化技巧以及调试与监控方法。重点覆盖：
- OpenAI兼容API（聊天补全、Responses、图像、音频等）
- 管理API（用户、令牌、渠道、模型、计费、订阅等）
- Webhook接口（支付回调、任务状态通知等）
- WebSocket实时通信（流式事件、双向消息）

## 项目结构
后端采用Go语言构建，路由层按功能域划分，中间件负责鉴权、限流、日志、CORS等横切关注点；DTO层定义请求/响应数据结构；Relay层实现多上游适配与协议转换；Service层封装业务逻辑；Setting层提供配置项。

```mermaid
graph TB
Client["客户端"] --> Router["路由层<br/>router/*"]
Router --> MW["中间件<br/>middleware/*"]
Router --> Controller["控制器/处理器<br/>controller/* / relay/*"]
Controller --> Service["服务层<br/>service/*"]
Service --> DB["数据库/缓存"]
Service --> Upstream["上游服务适配器<br/>relay/channel/*"]
Controller --> DTO["数据对象<br/>dto/*"]
Controller --> Setting["配置<br/>setting/*"]
```

图表来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [router/relay-router.go:1-200](file://router/relay-router.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)
- [relay/websocket.go:1-200](file://relay/websocket.go#L1-L200)

章节来源
- [main.go:1-200](file://main.go#L1-L200)
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [router/relay-router.go:1-200](file://router/relay-router.go#L1-L200)
- [router/web-router.go:1-200](file://router/web-router.go#L1-L200)

## 核心组件
- 路由与网关
  - REST管理API路由：统一注册管理端点，包含用户、令牌、渠道、模型、计费、订阅、系统信息等。
  - OpenAI兼容路由：暴露与OpenAI一致的聊天补全、Responses、Embedding、图像、音频等接口。
  - Web路由：前端控制台与静态资源。
- 中间件
  - 鉴权：支持Bearer Token、Cookie会话、OAuth等。
  - 限流：基于IP、用户、模型等多维度的令牌桶/滑动窗口限流。
  - 其他：CORS、Gzip、请求体大小限制、审计日志、请求ID注入。
- 数据对象（DTO）
  - OpenAI兼容请求/响应结构，通用请求头、分页、错误格式等。
- Relay与适配器
  - 将内部请求转换为各上游厂商的协议，并回写统一响应格式。
- 服务层
  - 业务编排：计费、配额、Token计数、工具调用结算、任务轮询等。
- 配置
  - 运行时配置加载、开关控制、速率限制参数、上游密钥管理等。

章节来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [router/relay-router.go:1-200](file://router/relay-router.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)
- [dto/openai_request.go:1-200](file://dto/openai_request.go#L1-L200)
- [dto/openai_response.go:1-200](file://dto/openai_response.go#L1-L200)
- [dto/request_common.go:1-200](file://dto/request_common.go#L1-L200)
- [dto/error.go:1-200](file://dto/error.go#L1-L200)
- [relay/websocket.go:1-200](file://relay/websocket.go#L1-L200)
- [service/http.go:1-200](file://service/http.go#L1-L200)
- [setting/config/config.go:1-200](file://setting/config/config.go#L1-L200)

## 架构总览
整体采用“路由→中间件→控制器/处理器→服务层→上游适配器”的分层架构。OpenAI兼容接口通过Relay层进行协议转换，管理API直接由控制器处理业务逻辑。WebSocket用于实时流式输出与事件推送。

```mermaid
sequenceDiagram
participant C as "客户端"
participant R as "路由层"
participant M as "中间件(鉴权/限流)"
participant H as "处理器(OpenAI兼容/管理)"
participant S as "服务层"
participant U as "上游适配器"
C->>R : "HTTP请求"
R->>M : "校验/限流/审计"
M-->>R : "通过或拒绝"
R->>H : "分发到对应处理器"
H->>S : "业务编排(计费/配额/转换)"
S->>U : "转发至上游(如OpenAI/第三方)"
U-->>S : "响应数据"
S-->>H : "统一格式"
H-->>C : "返回结果/流式片段"
```

图表来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [router/relay-router.go:1-200](file://router/relay-router.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)
- [relay/websocket.go:1-200](file://relay/websocket.go#L1-L200)

## 详细组件分析

### OpenAI兼容API
- 接口范围
  - 聊天补全：POST /v1/chat/completions
  - Responses：POST /v1/responses
  - Embedding：POST /v1/embeddings
  - 图像生成/编辑：POST /v1/images/generations, POST /v1/images/edits
  - 音频：POST /v1/audio/transcriptions, POST /v1/audio/speech
- 认证方式
  - Bearer Token：Authorization: Bearer <token>
  - Cookie会话：适用于控制台内调用
- 请求/响应模式
  - 遵循OpenAI标准字段，如model、messages、stream、temperature等
  - 响应支持JSON与流式SSE
- 错误处理
  - 统一错误码与message字段，包含code、message、param、type等
- 速率限制
  - 基于用户、模型、IP的多维度限流，超限返回429
- 版本信息
  - 路径前缀/v1，向后兼容旧版路径

```mermaid
flowchart TD
Start(["进入聊天补全处理器"]) --> Validate["校验请求体与鉴权"]
Validate --> Valid{"有效?"}
Valid --> |否| Err["返回错误(400/401/403/429)"]
Valid --> |是| Convert["转换为上游协议"]
Convert --> CallUpstream["调用上游服务"]
CallUpstream --> Stream{"是否流式?"}
Stream --> |否| Resp["组装统一响应"]
Stream --> |是| SSE["SSE流式片段"]
Resp --> End(["返回响应"])
SSE --> End
Err --> End
```

图表来源
- [relay/chat_completions_via_responses.go:1-200](file://relay/chat_completions_via_responses.go#L1-L200)
- [relay/responses_handler.go:1-200](file://relay/responses_handler.go#L1-L200)
- [dto/openai_request.go:1-200](file://dto/openai_request.go#L1-L200)
- [dto/openai_response.go:1-200](file://dto/openai_response.go#L1-L200)
- [dto/error.go:1-200](file://dto/error.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)

章节来源
- [dto/openai_request.go:1-200](file://dto/openai_request.go#L1-L200)
- [dto/openai_response.go:1-200](file://dto/openai_response.go#L1-L200)
- [relay/chat_completions_via_responses.go:1-200](file://relay/chat_completions_via_responses.go#L1-L200)
- [relay/responses_handler.go:1-200](file://relay/responses_handler.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)

### 管理API
- 接口范围
  - 用户管理：创建、更新、删除、查询、角色与权限
  - 令牌管理：创建、撤销、配额设置
  - 渠道管理：上游渠道配置、健康检查、权重与亲和性
  - 模型管理：模型元数据、定价、分组
  - 计费与用量：账单、结算、配额扣减
  - 订阅与支付：订阅计划、支付回调、退款
  - 系统信息：实例状态、监控指标、任务调度
- 认证方式
  - 管理员令牌或会话Cookie
- 请求/响应模式
  - 统一JSON结构，分页、排序、过滤
- 错误处理
  - 标准化错误体，含错误码与描述
- 速率限制
  - 管理端点更严格的限流策略

```mermaid
classDiagram
class User {
+id string
+name string
+role string
+quota int
+active bool
}
class Token {
+id string
+user_id string
+prefix string
+quota int
+expired_at datetime
}
class Channel {
+id string
+provider string
+status string
+weight int
+settings json
}
class Model {
+id string
+name string
+group string
+pricing json
}
User "1" --> "*" Token : "拥有"
Channel "1" --> "*" Model : "支持"
```

图表来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [dto/request_common.go:1-200](file://dto/request_common.go#L1-L200)
- [dto/error.go:1-200](file://dto/error.go#L1-L200)

章节来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [dto/request_common.go:1-200](file://dto/request_common.go#L1-L200)
- [dto/error.go:1-200](file://dto/error.go#L1-L200)

### Webhook接口
- 用途
  - 支付回调（Stripe、Creem、Waffo等）
  - 任务状态通知（异步任务完成、失败）
- 认证与签名
  - 使用平台提供的签名验证（如X-Signature、X-Hub-Signature）
- 幂等性与重试
  - 服务端需保证幂等处理，重复回调不重复计费
- 错误处理
  - 返回2xx表示成功，否则触发重试；建议记录原始payload便于排查

```mermaid
sequenceDiagram
participant P as "支付平台"
participant W as "Webhook处理器"
participant B as "计费服务"
P->>W : "POST /webhook/payment"
W->>W : "校验签名与去重"
W->>B : "更新订单/订阅状态"
B-->>W : "处理结果"
W-->>P : "200 OK"
```

图表来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [service/http.go:1-200](file://service/http.go#L1-L200)

章节来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [service/http.go:1-200](file://service/http.go#L1-L200)

### WebSocket实时交互
- 连接建立
  - WS /ws?token=... 或 /ws?session=...
- 消息格式
  - JSON事件：type、payload、timestamp等
  - 支持文本、二进制（媒体）、心跳
- 事件类型
  - connect、ping、pong、chat.delta、chat.done、error、reconnect
- 交互模式
  - 客户端发送请求帧，服务端按事件推送增量结果
  - 断线自动重连与状态同步

```mermaid
sequenceDiagram
participant C as "客户端"
participant WS as "WebSocket处理器"
participant S as "服务层"
C->>WS : "握手+鉴权"
WS-->>C : "101 Switching Protocols"
C->>WS : "发送请求帧"
WS->>S : "转发请求"
S-->>WS : "增量事件"
WS-->>C : "推送事件(delta/done)"
C->>WS : "心跳ping"
WS-->>C : "pong"
```

图表来源
- [relay/websocket.go:1-200](file://relay/websocket.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)

章节来源
- [relay/websocket.go:1-200](file://relay/websocket.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)

## 依赖关系分析
- 路由依赖中间件：所有API均经过鉴权与限流中间件
- 处理器依赖服务层：业务逻辑解耦，便于扩展与测试
- 服务层依赖配置与外部服务：读取配置、调用上游、访问存储
- DTO与错误模型贯穿全链路：确保一致的数据结构与错误语义

```mermaid
graph LR
A["路由层"] --> B["中间件(鉴权/限流)"]
B --> C["处理器(OpenAI/管理/Webhook)"]
C --> D["服务层"]
D --> E["配置/存储/上游"]
C --> F["DTO/错误模型"]
```

图表来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)
- [dto/request_common.go:1-200](file://dto/request_common.go#L1-L200)
- [dto/error.go:1-200](file://dto/error.go#L1-L200)

章节来源
- [router/api-router.go:1-200](file://router/api-router.go#L1-L200)
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)
- [dto/request_common.go:1-200](file://dto/request_common.go#L1-L200)
- [dto/error.go:1-200](file://dto/error.go#L1-L200)

## 性能考虑
- 流式传输：优先使用SSE或WebSocket减少首字节延迟
- 缓存策略：对只读元数据（模型列表、定价）启用缓存
- 并发与池化：合理设置goroutine池与连接池大小
- 压缩：开启Gzip以减少带宽占用
- 限流与熔断：防止雪崩，保护上游稳定性
- 监控与指标：暴露Prometheus指标，采集QPS、延迟、错误率

[本节为通用指导，无需特定文件引用]

## 故障排查指南
- 常见问题
  - 鉴权失败：检查Token有效性、过期时间、作用域
  - 限流触发：查看限流规则与配额，适当调整阈值
  - 上游超时：检查网络、证书、上游健康状态
  - 签名校验失败：核对Webhook签名算法与密钥
- 调试工具
  - 启用调试日志与请求ID追踪
  - 使用OpenAPI规范文件进行契约测试
  - 使用浏览器开发者工具或curl抓包分析
- 监控方法
  - 收集系统指标（CPU、内存、GC）
  - 应用层指标（请求耗时、错误分类、上游延迟）

章节来源
- [middleware/auth.go:1-200](file://middleware/auth.go#L1-L200)
- [middleware/rate-limit.go:1-200](file://middleware/rate-limit.go#L1-L200)
- [docs/openapi/relay.json:1-200](file://docs/openapi/relay.json#L1-L200)
- [docs/openapi/api.json:1-200](file://docs/openapi/api.json#L1-L200)

## 结论
本项目提供了完整的OpenAI兼容API、管理API与Webhook接口，具备完善的鉴权、限流、错误处理与监控能力。通过分层架构与适配器模式，实现了多上游的统一接入与灵活扩展。建议在生产环境中启用严格的安全策略、合理的限流与全面的监控，以确保系统的稳定性与可观测性。

[本节为总结性内容，无需特定文件引用]

## 附录
- 版本与兼容性
  - OpenAI兼容路径前缀为/v1，保持向后兼容
  - 弃用接口将在后续版本中逐步移除，请关注变更日志
- 客户端实现指南
  - 使用SDK或HTTP客户端时，务必处理流式响应与错误重试
  - 对于WebSocket，实现自动重连与心跳保活
- 速率限制与配额
  - 根据业务需求配置用户级与模型级限流
  - 结合计费与配额系统进行精细化管控
- 安全考虑
  - 强制HTTPS，禁用不安全协议
  - 最小权限原则分配Token作用域
  - 定期轮换密钥与证书

[本节为补充说明，无需特定文件引用]