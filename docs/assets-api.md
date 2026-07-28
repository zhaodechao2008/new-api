# 素材库管理 API 文档

## 概述

素材库管理 API 提供了完整的素材组（Asset Group）和素材（Asset）管理功能，支持本地上传、公网 URL 导入以及真人素材（Liveness）认证等特性。

**基础路径**: `/api/assets`

**认证方式**: 所有接口通过 `Authorization: Bearer <token>` 请求头认证，支持以下三种凭证：

| 凭证类型 | 示例 | 说明 |
|----------|------|------|
| 用户登录 JWT | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | 登录后获取的会话 token |
| 用户 API 令牌 | `Bearer sk-oDwcXXXXXXXXXXXXXX` | 用户名下创建的 API 令牌（推荐） |
| Dashboard PAT | `Bearer <access_token>` | Dashboard 个人访问令牌 |

## 接口列表

### 1. 素材组管理

#### 1.1 获取素材组列表

**接口**: `GET /api/assets/groups`

**描述**: 分页查询当前用户的素材组列表，支持按类型筛选。

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| p | int | 否 | 页码 | 1 |
| page_size | int | 否 | 每页数量（最大100） | 20 |
| group_type | string | 否 | 素材组类型（AIGC/LivenessFace） | - |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": 1,
        "provider_group_id": "group-abc123",
        "name": "我的素材组",
        "description": "测试素材组",
        "group_type": "AIGC",
        "project_name": "default",
        "asset_count": 5,
        "created_time": 1234567890,
        "updated_time": 1234567890
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1
  }
}
```

#### 1.2 创建素材组

**接口**: `POST /api/assets/groups`

**描述**: 创建新的素材组。素材组在首次上传素材时会同步创建云端组。

**请求体**:

```json
{
  "name": "素材组名称",
  "description": "素材组描述（可选）",
  "group_type": "AIGC",
  "project_name": "default"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 素材组名称 |
| description | string | 否 | 素材组描述 |
| group_type | string | 否 | 素材组类型，默认 "AIGC" |
| project_name | string | 否 | 项目名称，默认 "default" |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "provider_group_id": "local-20260728-abc12",
    "name": "素材组名称",
    "description": "素材组描述",
    "group_type": "AIGC",
    "project_name": "default",
    "created_time": 1234567890,
    "updated_time": 1234567890
  }
}
```

**说明**: 
- 新创建的素材组 `provider_group_id` 以 `local-` 开头，表示尚未同步到云端
- 首次上传素材时会自动创建云端素材组并更新 `provider_group_id`

#### 1.3 获取素材组详情

**接口**: `GET /api/assets/groups/:group_id`

**描述**: 获取指定素材组的详细信息及其前12个素材。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "group": {
      "id": 1,
      "name": "我的素材组",
      "description": "测试素材组",
      "group_type": "AIGC",
      "asset_count": 5
    },
    "assets": [
      {
        "id": 1,
        "name": "image1",
        "asset_type": "Image",
        "url": "https://example.com/image.jpg",
        "status": "Active",
        "size": 102400,
        "created_time": 1234567890
      }
    ]
  }
}
```

#### 1.4 更新素材组

**接口**: `PATCH /api/assets/groups/:group_id`

**描述**: 更新素材组的名称和描述。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**请求体**:

```json
{
  "name": "新的素材组名称",
  "description": "新的描述"
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "新的素材组名称",
    "description": "新的描述",
    "updated_time": 1234567890
  }
}
```

#### 1.5 删除素材组

**接口**: `DELETE /api/assets/groups/:group_id`

**描述**: 删除素材组及其所有素材。如果素材组已同步到云端，会先删除云端素材组。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**响应示例**:

```json
{
  "success": true
}
```

**说明**:
- 删除操作不可逆
- 会级联删除素材组下的所有素材
- 云端删除失败不影响本地删除

### 2. 素材管理

#### 2.1 获取素材列表

**接口**: `GET /api/assets/groups/:group_id/items`

**描述**: 分页查询指定素材组的素材列表，支持搜索、类型筛选、状态筛选和排序。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| p | int | 否 | 页码 | 1 |
| page_size | int | 否 | 每页数量（最大100） | 12 |
| q | string | 否 | 搜索关键词（匹配素材名称） | - |
| asset_type | string | 否 | 素材类型（Image/Video/Audio） | - |
| status | string | 否 | 素材状态（Active/Processing/Failed） | - |
| sort | string | 否 | 排序方式（created_desc/created_asc） | created_desc |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "asset_group_id": 1,
        "provider_asset_id": "asset-xyz789",
        "name": "image1",
        "asset_type": "Image",
        "url": "https://example.com/image.jpg",
        "status": "Active",
        "mime_type": "image/jpeg",
        "size": 102400,
        "created_time": 1234567890,
        "updated_time": 1234567890
      }
    ],
    "page": 1,
    "page_size": 12,
    "total": 1
  }
}
```

**素材类型说明**:
- `Image`: 图片（.jpg, .jpeg, .png, .webp）
- `Video`: 视频（.mp4, .mov）
- `Audio`: 音频（.mp3, .wav）

**素材状态说明**:
- `Active`: 已激活，可正常使用
- `Processing`: 处理中
- `Failed`: 处理失败

#### 2.2 上传素材（本地文件）

**接口**: `POST /api/assets/groups/:group_id/upload`

**描述**: 上传本地文件到指定素材组。使用 multipart/form-data 格式。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**请求格式**: `multipart/form-data`

**表单字段**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | file | 是 | 文件数据 |

**支持的文件格式**:
- 图片：.jpg, .jpeg, .png, .webp
- 视频：.mp4, .mov
- 音频：.mp3, .wav

**文件大小限制**: 默认 200MB（可通过配置接口查询）

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "image1",
    "asset_type": "Image",
    "url": "https://example.com/image.jpg",
    "status": "Active",
    "size": 102400,
    "created_time": 1234567890
  }
}
```

**说明**:
- 首次上传素材时，如果素材组的 `provider_group_id` 以 `local-` 开头，会自动创建云端素材组
- 文件名会去除扩展名后作为素材名称存储

#### 2.3 导入素材（公网 URL）

**接口**: `POST /api/assets/groups/:group_id/upload-url`

**描述**: 通过公网 URL 导入素材到指定素材组。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**请求体**:

```json
{
  "url": "https://example.com/image.png",
  "name": "素材名称",
  "asset_type": "Image",
  "mime_type": "image/png"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 公网可访问的素材 URL |
| name | string | 否 | 素材名称，默认从 URL 提取 |
| asset_type | string | 否 | 素材类型，默认从扩展名推断 |
| mime_type | string | 否 | MIME 类型 |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "素材名称",
    "asset_type": "Image",
    "url": "https://example.com/processed-image.jpg",
    "status": "Active",
    "created_time": 1234567890
  }
}
```

**说明**:
- URL 必须公网可访问
- 后台会直接从 URL 抓取素材，无需客户端下载
- 支持自动识别文件类型

#### 2.4 更新素材

**接口**: `PATCH /api/assets/groups/:group_id/items/:asset_id`

**描述**: 更新素材的名称。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |
| asset_id | int64 | 是 | 素材ID |

**请求体**:

```json
{
  "name": "新的素材名称"
}
```

**响应示例**:

```json
{
  "success": true
}
```

**说明**:
- 更新会同步到云端素材（如果已同步）
- 云端同步失败不影响本地更新

#### 2.5 删除素材

**接口**: `DELETE /api/assets/groups/:group_id/items/:asset_id`

**描述**: 从素材组中删除指定素材。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |
| asset_id | int64 | 是 | 素材ID |

**响应示例**:

```json
{
  "success": true
}
```

**说明**:
- 删除操作不可逆
- 会先删除云端素材（如果已同步），再删除本地记录
- 云端删除失败不影响本地删除

### 3. 真人素材（Liveness）

#### 3.1 创建真人认证会话

**接口**: `POST /api/assets/liveness/sessions`

**描述**: 创建真人人像认证会话，用于生成认证二维码/链接。

**请求体**: 无

**响应示例**:

```json
{
  "success": true,
  "data": {
    "bytedToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1234567890,
    "expiresIn": 300,
    "h5Link": "https://example.com/liveness/verify?token=xxx",
    "qrDataUrl": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| bytedToken | string | 认证会话令牌，用于后续同步真人素材组 |
| expiresAt | int64 | 过期时间戳（秒） |
| expiresIn | int | 有效期（秒） |
| h5Link | string | H5 认证链接，用于生成二维码或直接跳转 |
| qrDataUrl | string | 二维码图片 Data URL（可选） |

**使用流程**:
1. 调用此接口创建认证会话
2. 将 `h5Link` 生成二维码或直接跳转
3. 用户在移动端完成人脸验证
4. 使用返回的 `bytedToken` 调用同步接口

#### 3.2 同步真人素材组

**接口**: `POST /api/assets/liveness/groups/sync`

**描述**: 同步真人素材组到本地数据库。会返回所有真人素材组，并标识出新创建的组。

**请求体**:

```json
{
  "bytedToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bytedToken | string | 否 | 认证会话令牌（来自创建会话接口） |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": 1,
        "provider_group_id": "group-liveness-abc123",
        "name": "真人素材组 2024-07-28",
        "group_type": "LivenessFace",
        "created_time": 1234567890
      }
    ],
    "new_groups": [
      {
        "id": 1,
        "provider_group_id": "group-liveness-abc123",
        "name": "真人素材组 2024-07-28",
        "group_type": "LivenessFace",
        "created_time": 1234567890
      }
    ],
    "total": 1
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| groups | array | 所有真人素材组列表 |
| new_groups | array | 本次同步新创建的素材组列表 |
| total | int | 素材组总数 |

**说明**:
- 此接口会拉取账号下所有真人素材组并同步到本地
- `new_groups` 字段可用于定位本次认证会话创建的素材组
- 已存在的素材组会更新信息

### 4. 配置与工具

#### 4.1 获取素材配置

**接口**: `GET /api/assets/config`

**描述**: 获取素材上传配置信息。

**请求参数**: 无

**响应示例**:

```json
{
  "success": true,
  "data": {
    "extensions": [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".mp3", ".wav"],
    "max_file_bytes": 209715200
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| extensions | array | 支持的文件扩展名列表 |
| max_file_bytes | int64 | 最大文件大小（字节） |

#### 4.2 刷新素材组状态

**接口**: `POST /api/assets/groups/:group_id/refresh`

**描述**: 从云端同步素材组的最新状态和素材 URL，用于更新处理中素材的状态。

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| group_id | int64 | 是 | 素材组ID |

**请求体**: 无

**响应示例**:

```json
{
  "success": true,
  "data": {
    "synced": 5
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| synced | int | 成功同步的素材数量 |

**说明**:
- 用于刷新素材的状态（Active/Processing/Failed）和最新的访问 URL
- 对于尚未同步到云端的本地素材组（`provider_group_id` 以 `local-` 开头），返回 `synced: 0`

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

## 常见错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 使用示例

### 完整上传流程示例

```javascript
// 1. 获取配置
const configRes = await fetch('/api/assets/config', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
const config = await configRes.json();

// 2. 创建素材组
const groupRes = await fetch('/api/assets/groups', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '我的素材组',
    description: '测试素材组',
    group_type: 'AIGC'
  })
});
const group = await groupRes.json();

// 3. 上传本地文件
const formData = new FormData();
formData.append('file', file);
const uploadRes = await fetch(`/api/assets/groups/${group.data.id}/upload`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
  body: formData
});
const asset = await uploadRes.json();

// 4. 或者通过 URL 导入
const urlRes = await fetch(`/api/assets/groups/${group.data.id}/upload-url`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/image.png',
    name: '导入的素材',
    asset_type: 'Image'
  })
});
const urlAsset = await urlRes.json();
```

### 真人素材认证流程示例

```javascript
// 1. 创建认证会话
const sessionRes = await fetch('/api/assets/liveness/sessions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
const session = await sessionRes.json();

// 2. 展示二维码或跳转链接
// session.data.h5Link 或 session.data.qrDataUrl

// 3. 用户完成认证后，同步真人素材组
const syncRes = await fetch('/api/assets/liveness/groups/sync', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bytedToken: session.data.bytedToken
  })
});
const syncData = await syncRes.json();

// 4. 获取新创建的素材组
const newGroup = syncData.data.new_groups[0];
```

## 注意事项

1. **认证**: 所有接口都需要通过 `UserAuth` 中间件认证，请在请求头中携带有效的用户 token
2. **权限**: 用户只能访问和操作自己创建的素材组和素材
3. **文件大小**: 上传文件时请注意文件大小限制，默认为 200MB
4. **URL 可访问性**: 通过 URL 导入时，URL 必须公网可访问
5. **素材类型**: 素材类型由文件扩展名自动推断，目前支持图片、视频、音频三种类型
6. **异步处理**: 素材上传后可能处于 `Processing` 状态，可通过刷新接口获取最新状态
7. **云端同步**: 本地素材组在首次上传素材时会自动同步到云端
8. **真人素材**: 真人素材组（`LivenessFace`）类型的素材组只能通过真人认证流程创建，不能手动创建

## 更新日志

- **2024-07-28**: 初始版本，包含完整的素材组、素材、真人认证接口
