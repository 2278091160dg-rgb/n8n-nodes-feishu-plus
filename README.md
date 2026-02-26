# n8n-nodes-feishu-plus

飞书多维表格的 n8n 社区节点 — 支持 11 个 Bitable 操作，具备生产级重试、熔断和完整测试覆盖。

## 安装

在 n8n 中：

1. 进入 **Settings** → **Community Nodes**
2. 输入 `n8n-nodes-feishu-plus`
3. 点击 **Install**

或通过命令行：

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-feishu-plus
```

## 配置凭证

1. 在 [飞书开放平台](https://open.feishu.cn) 创建应用，获取 App ID 和 App Secret
2. 在 n8n 中进入 **Credentials** → **New** → **Feishu Plus API**
3. 填入 App ID 和 App Secret

## 功能列表

| 操作 | 说明 |
|------|------|
| 获取记录 | 获取单条记录 |
| 创建记录 | 新增单条记录 |
| 更新记录 | 更新单条记录 |
| 删除记录 | 删除单条记录 |
| 列出记录 | 列出记录，支持自动分页 |
| 搜索记录 | 按条件搜索记录，支持 filter + 自动分页 |
| 批量创建 | 批量新增记录（上限 500 条） |
| 批量更新 | 批量更新记录（上限 500 条） |
| 批量删除 | 批量删除记录（上限 500 条） |
| 列出数据表 | 获取多维表格下所有数据表 |
| 列出字段 | 获取数据表的字段定义 |

## 特性

- **重试 + 熔断** — 指数退避重试 + 熔断器保护，应对飞书 API 限流
- **Token 自动刷新** — tenant_access_token 过期自动续期
- **Simplify 模式** — 开启后返回精简数据，去除飞书原始嵌套结构
- **自动分页** — 列出/搜索操作自动拉取全部数据，无需手动翻页
- **错误脱敏** — App Secret 不会出现在错误信息中
- **continueOnFail** — 批量处理时单条失败不影响整体执行
- **104 项测试** — 单元测试 + 集成测试全覆盖

## 开发

```bash
npm install
npm test          # 运行测试
npm run build     # 编译 TypeScript
npm run lint      # ESLint 检查
```

## 许可证

[MIT](LICENSE)
