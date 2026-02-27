# CLAUDE.md - n8n-nodes-feishu-plus

> 基于 METHODOLOGY_AUDIT.md 生成 | 日期: 2026-02-27 | 项目类型: N8N 节点（轻量实践）

**项目名称**: Feishu Plus — N8N 社区节点（飞书多维表格 CRUD，生产级重试 + 熔断）
**工作目录**: `/Users/denggui/2026code/n8n-nodes-feishu-plus/`
**技术栈**: TypeScript + N8N SDK + Jest
**状态**: 稳定发布（v0.1.2）
**npm 包名**: `n8n-nodes-feishu-plus`

## ⛔ 工作目录约束

- 本项目所有操作仅限 `/Users/denggui/2026code/n8n-nodes-feishu-plus/`
- 禁止跨目录操作，禁止进入其他项目目录
- 发现未知目录不得自行切换，必须报告确认

**⚠️ 同级目录隔离警告（已有教训）：**

| 目录 | 项目 | 关系 |
|------|------|------|
| `n8n-nodes-feishu-plus/` | 本项目 ✅ |
| `n8n-nodes-deerapi/` | DeerAPI Plus 节点 | 独立项目，禁止进入 |
| `n8n-nodes-chinese-ai/` | Chinese AI 节点 | 独立项目，禁止进入 |
| `n8n-nodes-deerapi-plus.DEPRECATED-*` | 已废弃 | 禁止进入 |

> 2026-02-27 曾发生目录混淆事故，务必每次启动先 `pwd && git remote -v` 确认。

## 🛠 构建与验证命令

| 操作 | 命令 |
|------|------|
| 构建 | `npm run build` |
| 测试 | `npm test` |
| 测试覆盖率 | `npm run test:coverage` |
| Lint | `npm run lint` |
| 发布前检查 | `npm run build && npm test` |

## 🚀 发布流程

```
1. npm run lint
2. npm run build
3. npm test
4. npm version patch
5. git tag v0.x.x
6. npm publish
```

## 📏 代码质量规范

- TypeScript strict 模式
- ESLint 规则遵循 `.eslintrc.js`
- Jest 测试覆盖率 > 80%
- 凭证文件：`credentials/FeishuPlusApi.credentials.ts`
- 节点文件：`nodes/Feishu/`
- 测试目录：`tests/unit/` + `tests/integration/` + `tests/workflows/`

## 📝 方法论参考

本项目治理框架基于 `/Users/denggui/2026code/METHODOLOGY_AUDIT.md` 第六章"N8N 节点型"适配建议生成。
