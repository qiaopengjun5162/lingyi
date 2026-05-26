# 贡献指南

欢迎！我们欢迎各种形式的贡献，包括但不限于：

- 报告 bug
- 提交功能建议
- 提交代码
- 完善文档

## 开发流程

### 1. 分支策略

- `main` — 稳定分支，保持可发布状态
- 功能开发在独立分支进行，通过 PR 合入 `main`

### 2. 提交规范

提交信息格式遵循 Conventional Commits：

```
<type>: <简短描述>

<可选详细说明>
```

类型：
- `feat` — 新功能
- `fix` — 修复
- `docs` — 文档
- `refactor` — 重构
- `test` — 测试
- `ci` — CI/CD

### 3. 代码规范

- **无注释政策**：代码只标注 WHY（为什么这么写），不标注 WHAT（代码在做什么）。好的命名应该能让 WHAT 自明。
- **三层相似胜于过早抽象**：三段相似代码出现前不做抽象提取。
- **无半成品实现**：不做任务范围外的功能、重构、抽象。
- **无用代码彻底删除**：不留 re-export、`_` 前缀变量、`// removed` 注释。
- **默认选择最简单可用的方案**。

### 4. 测试

- Rust 代码：`cargo test -p lingyi-core` 必须通过。
- 前端：`npm run build` 必须无错误。
- E2E 测试：修改棋盘交互逻辑后需运行 `node apps/web/e2e/board-interactive.spec.mjs`，确保 20 个用例全部通过。

### 5. 提交 PR 前检查清单

- [ ] Rust 测试通过
- [ ] Next.js build 通过
- [ ] E2E 测试通过
- [ ] 遵循无注释政策
- [ ] 无死代码（无 `_` 前缀、无注释掉的代码块）
- [ ] CLAUDE.md 和 DEVELOPMEMT_LOG.md 如果相关已更新

## WASM 相关注意事项

- WASM 编译：`wasm-pack build crates/lingyi-core --target web -- --features wasm`
- 编译产物需同步到 `apps/web/public/wasm/`
- `wasm.ts` 中通过 patching `import.meta.url` 加载 WASM，详见 [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)

## 报告问题

- 使用 GitHub Issues
- 描述复现步骤 + 期望行为 + 实际行为
- 附上 FEN 字符串（如果是棋盘逻辑问题）
