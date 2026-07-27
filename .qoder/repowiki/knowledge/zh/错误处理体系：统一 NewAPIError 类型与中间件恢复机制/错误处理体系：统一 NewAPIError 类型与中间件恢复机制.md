---
kind: error_handling
name: 错误处理体系：统一 NewAPIError 类型与中间件恢复机制
category: error_handling
scope:
    - '**'
source_files:
    - types/error.go
    - types/channel_error.go
    - middleware/recover.go
    - service/error.go
    - model/errors.go
    - common/sys_log.go
---

本仓库采用以 `types.NewAPIError` 为核心的统一错误处理体系，结合 Gin 中间件的 panic 恢复、服务层响应体解析以及多厂商错误格式转换，形成从底层到 API 层的完整错误处理链路。

**1. 核心错误类型与工厂函数**
- `types.NewAPIError` 是全局统一的错误包装器，包含原始 error、RelayError（上游厂商错误）、StatusCode、ErrorType、ErrorCode、Metadata 等字段，支持 `errors.Is/As` 通过 Unwrap 暴露底层错误。
- 提供多种构造方式：`NewError`（通用）、`NewOpenAIError`（OpenAI 兼容）、`WithOpenAIError`（直接注入 OpenAIError）、`WithClaudeError`（Claude 兼容）、`InitOpenAIError`（仅初始化）。
- 错误码集中定义在 `types.ErrorCode` 常量中，按类别分组：new_api_error、channel_*、client request error、request/response error、sql error、quota error 等。
- 支持选项式配置：`ErrOptionWithSkipRetry`（跳过重试）、`ErrOptionWithNoRecordErrorLog`（不记录日志）、`ErrOptionWithStatusCode`（自定义状态码）、`ErrOptionWithHideErrMsg`（隐藏敏感信息）。

**2. 多厂商错误格式转换**
- `ToOpenAIError()` 和 `ToClaudeError()` 方法将内部错误转换为对应厂商的 JSON 格式，自动处理敏感信息脱敏（除 token 计数错误外）。
- `OpenAIError` 和 `ClaudeError` 结构体分别对应 OpenAI 和 Anthropic 的错误响应格式。

**3. 中间件层错误恢复**
- `middleware.RecoverPanicRecover()` 使用 defer + recover 捕获所有 panic，记录堆栈跟踪并通过标准 JSON 格式返回 500 错误。
- `middleware.Logger` 中间件记录请求日志，包含状态码、耗时、客户端 IP 等信息。

**4. 服务层错误处理**
- `service.RelayErrorHandler` 负责解析下游 HTTP 响应的错误体，支持 OpenAI/Claude/Gemini 等通用错误格式，自动提取 message/type/code 并转换为 `NewAPIError`。
- `service.ClaudeErrorWrapper` 和 `TaskErrorWrapper` 等工具函数将普通 error 转换为特定格式的 DTO。
- `service.ResetStatusCode` 支持通过配置动态映射状态码。

**5. 模型层错误定义**
- `model/errors.go` 定义业务相关的哨兵错误，如 `ErrDatabase`、`ErrInvalidCredentials`、`ErrTokenInvalid` 等，使用 Go 标准的 `errors.New` 创建。

**6. 通道特定错误**
- `types.ChannelError` 封装渠道相关错误信息，包括 channel_id、channel_type、using_key、autoBan 等元数据。
- `IsChannelError` 辅助函数判断是否为渠道错误（错误码以 `channel:` 前缀开头）。

**7. 错误传播与重试控制**
- `IsSkipRetryError` 判断是否应该跳过重试逻辑。
- `IsRecordErrorLog` 控制是否记录错误日志，默认记录，可通过选项禁用。
- 错误信息通过 `MaskSensitiveInfo` 进行敏感信息脱敏，防止泄露密钥等敏感数据。

**8. 日志记录策略**
- `common.SysLog`、`common.SysError`、`common.FatalLog` 提供系统级日志输出。
- 错误日志通过 `logger.LogError` 记录，支持上下文追踪。
- Panic 时记录详细堆栈信息，便于问题定位。