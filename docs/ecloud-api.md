# Video Studio eCloud API 接口文档

> Base URL: `http://36.212.34.114:18090`  
> OpenAPI Spec: `GET /openapi.json`  
> 在线文档: `/docs#assets`

---

## 认证

所有接口（健康检查除外）均需在请求头携带 Bearer Token：

```
Authorization: Bearer <api_key>
```

---

## 统一响应格式

所有业务接口均返回 Envelope 结构：

```json
{
  "data": "<any>",
  "error": {
    "code": "string",
    "message": "string"
  },
  "request_id": "string"
}
```

- 成功时 `error` 为 `null`，`data` 为具体业务数据
- 失败时 `error` 包含错误码和描述，`data` 为 `null`

---

## 数据模型

### ECloudAsset（素材对象）

```json
{
  "assetId":     "string",
  "assetName":   "string",
  "fileName":    "string",
  "assetType":   "Image | Video | Audio",
  "assetUrl":    "string (uri)",
  "status":      "Active | Processing | Failed",
  "createdTime": "string (ISO 8601)"
}
```

### ECloudGroup（分组对象）

```json
{
  "groupId":           "string",
  "groupName":         "string",
  "displayName":       "string",
  "groupType":         "AIGC | LivenessFace",
  "originalGroupName": "string",
  "coverUrl":          "string (uri)"
}
```

### ECloudGroupDetail（分组详情）

```json
{
  "group":     "<ECloudGroup>",
  "assets":    ["<ECloudAsset>"],
  "totalSize": "integer (bytes)"
}
```

---

## 健康检查

### GET `/healthz`

服务健康探测（无需认证）。

**响应** `200`
```json
{ "status": "ok" }
```

### GET `/api/video-studio/healthz`

Envelope 包装的健康探测（无需认证）。

**响应** `200` → Envelope，`data` 为 `{ "status": "ok" }`

---

## 素材库接口（Assets）

### 1. 获取素材分组列表

**GET** `/api/video-studio/assets/ecloud`

列出当前 API Key 下的所有 ecloud 素材分组。

**Query 参数**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `limit` | integer | 100 | 返回数量上限，最大 200 |

**响应** `200` → Envelope

`data` 示例：
```json
{
  "groupIds": ["group-abc123", "group-def456"],
  "totalSize": 10240000
}
```

**响应** `401` → Envelope，`error.code` 为认证失败

---

### 2. 上传文件到新分组

**POST** `/api/video-studio/assets/ecloud/upload-and-save`

上传一批文件，自动创建新的 ecloud 素材分组。

**Request Body** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `displayName` | string | 否 | 分组显示名称 |
| `files` | binary[] | **是** | 上传的文件列表（每次至少 1 个） |

**支持的文件类型**：`.jpg` `.jpeg` `.png` `.webp` `.mp4` `.mov` `.mp3` `.wav`  
**单文件大小上限**：200 MiB

**响应** `200` → Envelope，`data` 为 `ECloudGroupDetail`

---

### 3. 获取单个素材分组

**GET** `/api/video-studio/assets/ecloud/{groupId}`

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `groupId` | string | 分组 ID（如 `group-abc123`） |

**响应** `200` → Envelope，`data` 为 `ECloudGroupDetail`  
**响应** `404` → Envelope，分组不存在

---

### 4. 更新素材分组元数据

**PATCH** `/api/video-studio/assets/ecloud/{groupId}`

修改分组的显示名称或封面素材。

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `groupId` | string | 分组 ID |

**Request Body** `application/json`

```json
{
  "displayName":  "新分组名称",
  "coverAssetId": "asset-xxx",
  "coverUrl":     "https://example.com/cover.jpg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `displayName` | string | 否 | 分组显示名称 |
| `coverAssetId` | string | 否 | 封面素材 ID |
| `coverUrl` | string (uri) | 否 | 封面图片 URL |

**响应** `200` → Envelope，`data` 为更新后的 `ECloudGroup`

---

### 5. 删除素材分组

**DELETE** `/api/video-studio/assets/ecloud/{groupId}`

删除整个分组及其所有素材。

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `groupId` | string | 分组 ID |

**响应** `200` → Envelope  
**响应** `404` → Envelope，分组不存在

---

### 6. 向已有分组追加文件

**POST** `/api/video-studio/assets/ecloud/{groupId}/upload-and-save`

向已存在的 ecloud 分组追加上传文件。

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `groupId` | string | 分组 ID |

**Request Body** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `files` | binary[] | **是** | 要追加的文件列表 |

**响应** `200` → Envelope，`data` 为 `ECloudGroupDetail`（含新增素材）

---

### 7. 重命名单个素材

**PATCH** `/api/video-studio/assets/ecloud/{groupId}/assets/{assetId}`

修改分组内某素材的显示名称。

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `groupId` | string | 分组 ID |
| `assetId` | string | 素材 ID |

**Request Body** `application/json`

```json
{
  "displayName": "新素材名称"
}
```

**响应** `200` → Envelope  
**响应** `404` → Envelope，素材不存在

---

### 8. 删除分组内单个素材

**DELETE** `/api/video-studio/assets/ecloud/{groupId}/assets/{assetId}`

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `groupId` | string | 分组 ID |
| `assetId` | string | 素材 ID |

**响应** `200` → Envelope  
**响应** `404` → Envelope，素材不存在

---

### 9. 导入单个公开 URL

**POST** `/api/video-studio/assets/ecloud/import-url`

将一个公开可访问的 URL 导入素材库。

**Request Body** `application/json`

```json
{
  "assetUrl":    "https://example.com/video.mp4",
  "assetType":   "Video",
  "displayName": "示例视频",
  "groupId":     "group-xxx"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `assetUrl` | string (uri) | **是** | 公开可访问的资源 URL |
| `assetType` | string | **是** | 素材类型：`Image` / `Video` / `Audio` |
| `displayName` | string | 否 | 素材显示名称 |
| `groupId` | string | 否 | 目标分组 ID；不填则自动新建分组 |

**响应** `200` → Envelope，`data` 为 `ECloudGroupDetail`（含导入的素材）

---

### 10. 批量导入公开 URL

**POST** `/api/video-studio/assets/ecloud/import-urls`

批量导入多个公开 URL，每次最多 50 个。

**Request Body** `application/json`

```json
{
  "assetUrls": [
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg"
  ],
  "assetType":   "Image",
  "displayName": "批量图片",
  "groupId":     "group-xxx"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `assetUrls` | string[] (uri) | **是** | 公开 URL 列表，最多 50 个 |
| `assetType` | string | **是** | 素材类型：`Image` / `Video` / `Audio` |
| `displayName` | string | 否 | 素材显示名称 |
| `groupId` | string | 否 | 目标分组 ID；不填则自动新建分组 |

**响应** `200` → Envelope，`data` 为 `ECloudGroupDetail`

---

## 真人素材接口（Liveness）

### 11. 创建真人素材授权 Session

**POST** `/api/video-studio/assets/ecloud/liveness/sessions`

创建真人素材（LivenessFace）的授权会话，用于前端录制/采集流程。

**响应** `200` → Envelope，`data` 包含授权 session 信息（含 sessionId 和前端跳转 URL）

---

### 12. 同步真人素材分组

**POST** `/api/video-studio/assets/ecloud/liveness/groups/sync`

将当前 API Key 下已完成授权的真人素材分组同步到素材库。

**响应** `200` → Envelope，`data` 为同步后的分组列表

---

## 任务历史接口（Tasks）

### 13. 获取生成任务列表

**GET** `/api/video-studio/tasks`

查询当前 API Key 下的生成任务历史。

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | integer | 返回数量，默认 100，最大 200 |
| `status` | string | 筛选状态：`queued` / `running` / `succeeded` / `failed` / `unknown` |
| `q` | string | 关键词搜索 |
| `from` | string (ISO 8601) | 开始时间 |
| `to` | string (ISO 8601) | 结束时间 |

**响应** `200` → Envelope，`data` 为任务列表

---

### 14. 保存生成任务

**POST** `/api/video-studio/tasks`

保存一条生成任务及其原始上游响应、计费 Token 字段。

**Request Body** `application/json`（所有字段除 `taskId` 外均为可选）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | string | **是** | 任务唯一 ID |
| `model` | string | 否 | 使用的模型名称 |
| `prompt` | string | 否 | 生成提示词 |
| `status` | string | 否 | 任务状态 |
| `progress` | string | 否 | 进度描述 |
| `duration` | integer | 否 | 视频时长（秒） |
| `ratio` | string | 否 | 宽高比（如 `16:9`） |
| `resolution` | string | 否 | 分辨率（如 `1920x1080`） |
| `resultUrl` | string (uri) | 否 | 生成结果 URL |
| `downloadUrl` | string (uri) | 否 | 下载链接 |
| `requestBody` | object | 否 | 原始请求体 |
| `createResponseBody` | object | 否 | 创建任务的原始响应体 |
| `statusResponseBody` | object | 否 | 状态查询的原始响应体 |
| `errorCode` | string | 否 | 错误码 |
| `errorMessage` | string | 否 | 错误描述 |
| `rawCompletionTokens` | integer | 否 | 原始完成 Token 数 |
| `rawTotalTokens` | integer | 否 | 原始总 Token 数 |
| `minimumCompletionTokens` | integer | 否 | 最小计费完成 Token 数 |
| `billableCompletionTokens` | integer | 否 | 实际计费完成 Token 数 |
| `billableTotalTokens` | integer | 否 | 实际计费总 Token 数 |
| `hasReferenceVideo` | boolean | 否 | 是否使用了参考视频 |
| `billingResolution` | string | 否 | 计费分辨率档位 |
| `billingRatioGroup` | string | 否 | 计费宽高比分组 |
| `billingDuration` | integer | 否 | 计费时长（秒） |
| `billingRuleVersion` | string | 否 | 计费规则版本 |
| `priceYuanPerMillion` | integer | 否 | 每百万 Token 单价（分） |

**响应** `200` → Envelope

---

### 15. 获取单条任务详情

**GET** `/api/video-studio/tasks/{taskId}`

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `taskId` | string | 任务 ID |

**响应** `200` → Envelope，`data` 包含完整任务详情及计费字段  
**响应** `404` → Envelope，任务不存在

---

### 16. 刷新任务状态

**POST** `/api/video-studio/tasks/{taskId}/refresh`

使用调用方的 API Key 向 NewAPI 查询最新任务状态，并重新计算计费 Token。

**Path 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `taskId` | string | 任务 ID |

**响应** `200` → Envelope，`data` 为刷新后的任务信息  
**响应** `404` → Envelope，任务不存在

---

## 错误处理

| HTTP 状态码 | 含义 |
|-------------|------|
| `200` | 请求成功 |
| `400` | 请求参数有误（error.code 包含具体原因） |
| `401` | API Key 无效或缺失 |
| `404` | 资源不存在（分组或素材 ID 无效） |
| `429` | 请求频率超限 |
| `500` | 服务内部错误 |

**错误响应示例：**
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "asset group not found"
  },
  "request_id": "req-abc123"
}
```

---

## 接口速览

| # | 方法 | 路径 | 说明 |
|---|------|------|------|
| 1 | GET | `/api/video-studio/assets/ecloud` | 列出素材分组 |
| 2 | POST | `/api/video-studio/assets/ecloud/upload-and-save` | 上传到新分组 |
| 3 | GET | `/api/video-studio/assets/ecloud/{groupId}` | 获取分组详情 |
| 4 | PATCH | `/api/video-studio/assets/ecloud/{groupId}` | 更新分组元数据 |
| 5 | DELETE | `/api/video-studio/assets/ecloud/{groupId}` | 删除分组 |
| 6 | POST | `/api/video-studio/assets/ecloud/{groupId}/upload-and-save` | 向已有分组追加文件 |
| 7 | PATCH | `/api/video-studio/assets/ecloud/{groupId}/assets/{assetId}` | 重命名单个素材 |
| 8 | DELETE | `/api/video-studio/assets/ecloud/{groupId}/assets/{assetId}` | 删除单个素材 |
| 9 | POST | `/api/video-studio/assets/ecloud/import-url` | 导入单个 URL |
| 10 | POST | `/api/video-studio/assets/ecloud/import-urls` | 批量导入 URL（最多 50） |
| 11 | POST | `/api/video-studio/assets/ecloud/liveness/sessions` | 创建真人素材授权 Session |
| 12 | POST | `/api/video-studio/assets/ecloud/liveness/groups/sync` | 同步真人素材分组 |
| 13 | GET | `/api/video-studio/tasks` | 查询任务历史 |
| 14 | POST | `/api/video-studio/tasks` | 保存生成任务 |
| 15 | GET | `/api/video-studio/tasks/{taskId}` | 获取任务详情 |
| 16 | POST | `/api/video-studio/tasks/{taskId}/refresh` | 刷新任务状态 |

---

## 备注

### 分组 ID 规范

- **已同步的 ecloud 分组**：`groupId` 以 `group-` 开头（如 `group-abc123`）
- **本地暂存分组**（尚未上传过文件）：`provider_group_id` 以 `local-` 开头，在首次上传时自动替换为真实 ecloud groupId

### 同步策略

本地接口操作（重命名素材、删除素材）会同步调用对应 eCloud 接口（Best-effort）：
- eCloud 调用失败时记录系统日志，但**不影响本地操作结果**
- 若分组尚未同步（`local-` 前缀），跳过 eCloud 同步

### 素材状态流转

```
上传/导入 → Processing → Active
                       → Failed（处理失败）
```
