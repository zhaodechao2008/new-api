# 素材库 API curl 测试用例

- **Base URL**: `http://localhost:3000`
- **Token**: `sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF`

---

## 配置

### 获取素材上传配置

```bash
curl -s http://localhost:3000/api/assets/config \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

---

## 素材组

### 获取列表

```bash
curl -s 'http://localhost:3000/api/assets/groups?p=1&page_size=20&group_type=AIGC' \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

### 创建素材组

```bash
curl -s -X POST http://localhost:3000/api/assets/groups \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF' \
  -H 'Content-Type: application/json' \
  -d '{"name":"测试素材组","description":"本地测试","group_type":"AIGC","project_name":"default"}'
```

### 获取详情

```bash
curl -s http://localhost:3000/api/assets/groups/1 \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

### 更新素材组

```bash
curl -s -X PATCH http://localhost:3000/api/assets/groups/1 \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF' \
  -H 'Content-Type: application/json' \
  -d '{"name":"新名称","description":"新描述"}'
```

### 刷新素材组状态

```bash
curl -s -X POST http://localhost:3000/api/assets/groups/1/refresh \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

### 删除素材组 ⚠️ 不可逆

```bash
curl -s -X DELETE http://localhost:3000/api/assets/groups/1 \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

---

## 素材

### 获取列表

```bash
curl -s 'http://localhost:3000/api/assets/groups/1/items?p=1&page_size=12&sort=created_desc' \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

按类型和状态筛选：

```bash
curl -s 'http://localhost:3000/api/assets/groups/1/items?asset_type=Image&status=Active' \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

### 上传本地文件

```bash
curl -s -X POST http://localhost:3000/api/assets/groups/1/upload \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF' \
  -F 'file=@/path/to/sample.png'
```

### 公网 URL 导入

```bash
curl -s -X POST http://localhost:3000/api/assets/groups/1/upload-url \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/image.png","name":"示例图片","asset_type":"Image","mime_type":"image/png"}'
```

### 更新素材名称

```bash
curl -s -X PATCH http://localhost:3000/api/assets/groups/1/items/1 \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF' \
  -H 'Content-Type: application/json' \
  -d '{"name":"新素材名称"}'
```

### 删除素材 ⚠️ 不可逆

```bash
curl -s -X DELETE http://localhost:3000/api/assets/groups/1/items/1 \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

---

## 真人素材（Liveness）

### 创建认证会话

```bash
curl -s -X POST http://localhost:3000/api/assets/liveness/sessions \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF'
```

### 同步真人素材组

将上一步返回的 `data.bytedToken` 替换到 `bytedToken` 字段：

```bash
curl -s -X POST http://localhost:3000/api/assets/liveness/groups/sync \
  -H 'Authorization: Bearer sk-6O5fWt8blgGKMGWUwtfC1Ul9Paods00D23rvcr4U9re047HF' \
  -H 'Content-Type: application/json' \
  -d '{"bytedToken":"<来自创建会话的 bytedToken>"}'
```

---

> **建议测试顺序**：获取配置 → 创建素材组（记录 `id`） → 上传/导入素材（记录 `id`） → 列表/详情 → 更新 → 刷新状态 → 删除素材 → 删除素材组
