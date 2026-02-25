# n8n-nodes-feishu-plus 技术文档

## 1. 项目概述

**包名**：`n8n-nodes-feishu-plus`
**版本**：v0.1.0（MVP）
**定位**：社区中质量最高的飞书 n8n 节点包 — 唯一具备完整测试覆盖、生产级重试/熔断机制的飞书社区节点。

**MVP 范围**：11 个 Bitable 操作

| # | 操作 | 方法 | 说明 |
|---|------|------|------|
| 1 | updateRecord | PUT | 更新单条记录（核心操作） |
| 2 | getRecord | GET | 获取单条记录 |
| 3 | createRecord | POST | 新增单条记录 |
| 4 | deleteRecord | DELETE | 删除单条记录 |
| 5 | listRecords | GET | 列出记录（支持自动分页） |
| 6 | searchRecords | POST | 搜索记录（支持 filter + 自动分页） |
| 7 | batchCreate | POST | 批量新增（上限 500 条） |
| 8 | batchUpdate | POST | 批量更新（上限 500 条） |
| 9 | batchDelete | POST | 批量删除（上限 500 条） |
| 10 | listTables | GET | 列出数据表（辅助操作） |
| 11 | listFields | GET | 列出字段（辅助操作） |

**命名规范**：

| 项 | 值 |
|----|-----|
| npm 包名 | `n8n-nodes-feishu-plus` |
| 节点 displayName | `Feishu Plus` |
| 节点 name | `feishuPlus` |
| 凭证 name | `feishuPlusApi` |
| 凭证 displayName | `Feishu Plus API` |
| 类名 | `Feishu`（文件名 `Feishu.node.ts`，n8n 根据文件名推断） |

## 2. 架构设计

### 目录结构

```
n8n-nodes-feishu-plus/
├── package.json                          # npm 包配置 + n8n 节点/凭证注册
├── tsconfig.json                         # TypeScript 严格模式
├── jest.config.js                        # Jest 测试配置（覆盖率阈值 80%）
├── .editorconfig                         # 编辑器统一配置（tab 缩进）
├── .nvmrc                                # Node 20
├── .gitignore
├── .github/workflows/ci.yml             # CI：lint + test + publish
├── credentials/
│   └── FeishuPlusApi.credentials.ts      # 凭证定义
├── nodes/
│   └── Feishu/
│       ├── Feishu.node.ts                # 主节点（属性定义 + execute 入口）
│       ├── feishu.svg                    # 节点图标
│       └── actions/
│           ├── router.ts                 # 操作路由（continueOnFail + pairedItem）
│           └── bitable/
│               ├── updateRecord.ts       # 11 个操作实现
│               ├── getRecord.ts
│               ├── createRecord.ts
│               ├── deleteRecord.ts
│               ├── listRecords.ts
│               ├── searchRecords.ts
│               ├── batchCreate.ts
│               ├── batchUpdate.ts
│               ├── batchDelete.ts
│               ├── listTables.ts
│               └── listFields.ts
├── transport/
│   ├── request.ts                        # HTTP 请求（重试 + 熔断 + Token 刷新）
│   ├── response.ts                       # 飞书响应解析 + simplify
│   └── error.ts                          # 错误清洗（sanitizeError）
└── tests/
    ├── unit/
    │   ├── credentials/
    │   ├── transport/
    │   └── actions/bitable/
    └── integration/
        └── router.test.ts
```

### 三层架构

```
┌─────────────────────────────────────────────┐
│  Feishu.node.ts（节点定义层）                 │
│  - 属性定义（Resource / Operation / 参数）    │
│  - execute() → 调用 router                   │
├─────────────────────────────────────────────┤
│  router.ts（路由层）                          │
│  - 遍历 inputItems                           │
│  - 根据 resource + operation 分发到 handler   │
│  - continueOnFail 错误处理                    │
│  - pairedItem 关联输入输出                    │
├─────────────────────────────────────────────┤
│  actions/bitable/*.ts（操作层）               │
│  - 读取参数 → 构造请求 → 调用 feishuRequest  │
│  - 处理响应 → simplify → 返回 INodeExecData  │
├─────────────────────────────────────────────┤
│  transport/（传输层）                         │
│  - request.ts：HTTP + 重试 + 熔断 + Token    │
│  - response.ts：解析 {code,msg,data} + 分页  │
│  - error.ts：sanitizeError 清洗敏感信息       │
└─────────────────────────────────────────────┘
```

**Transport 层关键机制**：

- **指数退避重试**：延迟 500ms → 1s → 2s，最多 3 次重试
- **可重试条件**：HTTP 429/500/502/503/504，飞书 code 1254040（频率超限）
- **Token 刷新**：飞书 code 99991663/99991668 → 重新获取凭证 → 仅重试一次（防递归）
- **熔断器**：连续 5 次失败 → 熔断 30 秒，模块级单例（所有工作流共享）
- **错误清洗**：从错误消息中移除 App Secret 和 Access Token，替换为 `xxxx****`

## 3. API 接口说明

### 公共参数

所有 Bitable 操作共享以下参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| appToken | string | ✅ | 多维表格唯一标识 |
| tableId | string | ✅（listTables 除外） | 数据表唯一标识 |

### Options（高级参数，所有操作可选）

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| userIdType | options | open_id | 用户 ID 类型：open_id / union_id / user_id |
| simplify | boolean | true | 精简输出（仅 record_id + fields） |
| automaticFields | boolean | false | 包含自动字段（创建时间、修改时间等） |
| fieldNames | string | 空 | 逗号分隔的字段名列表，空则返回全部 |
| viewId | string | 空 | 按视图过滤 |
| filterFormula | string | 空 | listRecords 的公式过滤器 |
| sort | json | 空 | searchRecords 的排序条件 |
| textFieldAsArray | boolean | false | 文本字段返回富文本数组 |

### 各操作详情

#### getRecord
- **输入**：appToken, tableId, recordId
- **输出**：`{ record_id, fields }` （simplify=true）或完整 record 对象
- **端点**：`GET /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/records/{recordId}`

#### createRecord
- **输入**：appToken, tableId, fields（JSON）
- **输出**：创建后的 record 对象
- **端点**：`POST /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/records`
- **Body**：`{ fields: {...} }`

#### updateRecord
- **输入**：appToken, tableId, recordId, fields（JSON）
- **输出**：更新后的 record 对象
- **端点**：`PUT /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/records/{recordId}`
- **Body**：`{ fields: {...} }`

#### deleteRecord
- **输入**：appToken, tableId, recordId
- **输出**：`{ success: true, deleted: true, record_id }`
- **端点**：`DELETE /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/records/{recordId}`

#### listRecords
- **输入**：appToken, tableId, returnAll, limit
- **输出**：record 数组
- **端点**：`GET /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/records`
- **分页**：page_size=500，自动循环 page_token 直到 has_more=false

#### searchRecords
- **输入**：appToken, tableId, filter（JSON）, returnAll, limit
- **输出**：record 数组
- **端点**：`POST /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/records/search`
- **Body**：`{ page_size: 500, filter: {...}, sort: [...], page_token }`
- **注意**：分页参数在 body 中，不在 query 中

#### batchCreate
- **输入**：appToken, tableId, records（JSON 数组，每项含 fields）
- **输出**：创建后的 record 数组
- **端点**：`POST .../records/batch_create`
- **限制**：单次最多 500 条

#### batchUpdate
- **输入**：appToken, tableId, records（JSON 数组，每项含 record_id + fields）
- **输出**：更新后的 record 数组
- **端点**：`POST .../records/batch_update`
- **限制**：单次最多 500 条

#### batchDelete
- **输入**：appToken, tableId, records（record_id 字符串数组）
- **输出**：`{ success: true, deleted: N }`
- **端点**：`POST .../records/batch_delete`
- **限制**：单次最多 500 条

#### listTables
- **输入**：appToken, returnAll, limit
- **输出**：table 对象数组（含 table_id, name 等）
- **端点**：`GET /open-apis/bitable/v1/apps/{appToken}/tables`

#### listFields
- **输入**：appToken, tableId, returnAll, limit
- **输出**：field 对象数组（含 field_id, field_name, type 等）
- **端点**：`GET /open-apis/bitable/v1/apps/{appToken}/tables/{tableId}/fields`

## 4. N8N 集成

### package.json 的 n8n 字段

```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": ["dist/credentials/FeishuPlusApi.credentials.js"],
    "nodes": ["dist/nodes/Feishu/Feishu.node.js"]
  }
}
```

- `n8nNodesApiVersion: 1` — 使用 n8n 节点 API v1
- `credentials` 和 `nodes` 路径指向 `dist/` 编译产物
- n8n 启动时扫描 `~/.n8n/nodes/node_modules/` 下所有包含 `n8n` 字段的 package.json

### 凭证定义（FeishuPlusApi）

```
认证流程：
1. 用户填写 App ID + App Secret + 选择 Base URL
2. n8n 框架检测 accessToken 过期 → 调用 preAuthentication
3. preAuthentication: POST /open-apis/auth/v3/tenant_access_token/internal
4. 返回 { accessToken: tenant_access_token }
5. 后续请求自动附加 Authorization: Bearer {accessToken}
```

关键设计：
- `accessToken` 标记 `expirable: true`，n8n 框架自动管理过期刷新
- `authenticate` 使用 `IAuthenticateGeneric`，在 headers 中注入 Bearer token
- `test` 端点调用 `/open-apis/bitable/v1/apps/empty/tables`（会返回错误但验证 token 有效性）
- 凭证名 `feishuPlusApi` 避免与 feishu-lite 的 `feishuCredentialsApi` 冲突

### 节点注册

- 文件名 `Feishu.node.ts` → n8n 推断类名为 `Feishu`
- `usableAsTool: true` — 支持 AI Agent 工具调用
- `inputs: ['main']`, `outputs: ['main']` — 标准单输入单输出

## 5. 测试覆盖

### 测试统计

| 指标 | 数值 |
|------|------|
| 测试套件 | 16 个 |
| 测试用例 | 104 个 |
| Statements | 93.18% |
| Branches | 74.65% |
| Functions | 96.87% |
| Lines | 97.22% |

### 测试分布

| 模块 | 测试文件 | 用例数 |
|------|---------|--------|
| 凭证 | FeishuPlusApi.test.ts | 14 |
| Transport/request | request.test.ts | 16 |
| Transport/response | response.test.ts | 8 |
| Transport/error | error.test.ts | 10 |
| Router（集成） | router.test.ts | 18 |
| 11 个操作 | 各 3-4 个用例 | 38 |

### 测试策略

- **Mock 方式**：`jest.mock()` 拦截 `transport/request` 模块，用 `jest.fn()` 替换 `feishuRequest`
- **Mock Context**：构造 `mockContext` 对象模拟 `IExecuteFunctions`，包含 `getNodeParameter`、`getCredentials`、`helpers.httpRequest` 等方法
- **每个操作至少 3 个用例**：成功路径、错误传播、边界条件（如批量超 500 条）
- **Transport 层**：使用 `jest.useFakeTimers()` 测试重试延迟，`setCircuitBreakerState()` 测试熔断器状态
- **集成测试**：Router 测试 mock 所有 11 个操作模块，验证路由分发、continueOnFail、多 item 处理

## 6. 构建与部署

### 构建

```bash
npm run build    # tsc 编译 + 复制 SVG 图标到 dist/
npm test         # 运行全部测试
npm run test:coverage  # 运行测试 + 覆盖率报告
```

### 安装到本地 N8N（Docker 环境）

由于 n8n 运行在 Docker 中，`~/.n8n` 通过 bind mount 映射到容器内 `/home/node/.n8n`。
`npm link` 创建的符号链接在容器内无法解析，需要直接复制文件：

```bash
# 1. 构建
cd /Users/denggui/2026code/n8n-nodes-feishu-plus
npm run build

# 2. 复制到 n8n nodes 目录（非 symlink）
rm -rf ~/.n8n/nodes/node_modules/n8n-nodes-feishu-plus
mkdir -p ~/.n8n/nodes/node_modules/n8n-nodes-feishu-plus/dist
cp package.json ~/.n8n/nodes/node_modules/n8n-nodes-feishu-plus/
cp -R dist/ ~/.n8n/nodes/node_modules/n8n-nodes-feishu-plus/dist/

# 3. 重启 n8n
docker restart n8n
```

也可以用 rsync 简化：

```bash
rsync -av --delete dist/ ~/.n8n/nodes/node_modules/n8n-nodes-feishu-plus/dist/
cp package.json ~/.n8n/nodes/node_modules/n8n-nodes-feishu-plus/
docker restart n8n
```

## 7. 已知限制

1. **凭证测试端点**：使用 `/open-apis/bitable/v1/apps/empty/tables` 作为测试端点，会返回业务错误但能验证 token 有效性，不够优雅
2. **Token 刷新机制**：当前通过重新调用 `getCredentials()` 获取新 token，依赖 n8n 框架的 preAuthentication 自动触发，未直接清空 accessToken 字段
3. **熔断器为模块级单例**：一个工作流触发熔断会影响所有使用该节点的工作流（对飞书场景可接受）
4. **批量操作不自动分批**：超过 500 条直接报错，不会自动拆分为多次请求
5. **字段类型无 UI 适配**：fields 参数使用 JSON 自由输入，用户需自行构造正确的字段格式
6. **无 OAuth2 支持**：仅支持 tenant_access_token（自建应用），不支持 OAuth2（第三方应用）
7. **无 i18n**：所有 UI 文本为英文，未提供中文翻译
8. **节点图标为占位符**：当前 SVG 为简易设计，非飞书官方 Logo

## 8. 后续开发计划

### v0.1.x 补丁

- [ ] 替换节点图标为飞书官方 Logo（需确认版权）
- [ ] 凭证测试端点优化（改用 `/open-apis/auth/v3/tenant_access_token/internal` 直接验证）
- [ ] 添加 Feishu.node.json（codex 元数据，改善 n8n 编辑器中的搜索体验）
- [ ] README.md 编写（安装说明、使用示例、截图）

### v0.2.0 — Message 模块

- [ ] 发送文本消息
- [ ] 发送卡片消息
- [ ] 回复消息
- [ ] 更新卡片消息

### v0.3.0 — Trigger 模块

- [ ] WebSocket 事件监听（参考 luka-feishu 实现）
- [ ] 支持 Bitable 记录变更事件

### v0.4.0 — Chat + Approval

- [ ] 群组管理
- [ ] 审批流操作（蓝海差异化功能）

### 社区发布

- [ ] GitHub 仓库公开
- [ ] npm publish
- [ ] 提交到 n8n 社区节点列表
- [ ] 编写英文 README + 中文使用指南
