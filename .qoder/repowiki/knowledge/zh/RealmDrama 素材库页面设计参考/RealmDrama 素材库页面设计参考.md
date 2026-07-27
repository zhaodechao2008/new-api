---
kind: external_dependency
name: RealmDrama 素材库页面设计参考
slug: realmdrama
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
source_files:
    - web/src/features/assets/index.tsx
    - web/src/features/assets/api.ts
---

项目素材库管理页面（web/src/features/assets）的UI设计和交互模式参考了外部的 RealmDrama 素材库页面。该参考设计驱动了双面板工作区布局、侧边栏式素材组列表、拖拽上传、URL导入、素材画廊等核心功能的实现。这是一个设计参考来源，不是代码依赖，但决定了前端资产管理的用户体验模式。