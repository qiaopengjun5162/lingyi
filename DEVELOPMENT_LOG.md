# 灵弈开发问题记录

## WASM 加载

### 1. `import.meta.url` in `new Function()` context is undefined

**症状**: WASM 加载时 `TypeError: Cannot read properties of undefined (reading 'url')`

**原因**: `wasm-pack --target web` 生成的 JS 用 `new URL('wasm_bg.wasm', import.meta.url)` 定位 WASM 文件。但前端为了在 Mini Program 环境下运行，通过 `fetch JS as text → strip export statements → new Function(code)()` 执行，这个作用域下 `import.meta` 未定义。

**解决**: 在 `wasm.ts` 加载 JS 源码后，用字符串替换将 `new URL('.*?', import\.meta\.url)` 替换为 `'/wasm/lingyi_core_bg.wasm'`（静态路径），再 `new Function(code)()` 执行。

**文件**: `apps/web/src/lib/wasm.ts`

### 2. `wasm-pack --target bundler` vs `--target web`

**症状**: 前端无法找到 WASM 模块导出函数

**原因**: Next.js 使用 webpack 打包，但 WASM 通过 `new Function()` 动态加载，bundler 模式依赖 ESM 静态 import，不兼容动态执行。

**解决**: 改用 `--target web` 编译，手动处理 JS 加载（fetch → patch URL → exec）。

---

## React / TypeScript

### 3. `useRef` missing initial value (React 19)

**症状**: TypeScript compile error: `Argument of type '() => Timer' is not assignable to parameter of type '(initialValue?: Timer | undefined) => MutableRefObject<Timer | undefined>'`

**原因**: React 19 的 `useRef` 类型签名要求初始值参数，`useRef<ReturnType<typeof setTimeout>>()` 没有传初始值会被推断为 `undefined`。

**解决**:
```typescript
// 改前
const timerRef = useRef<ReturnType<typeof setTimeout>>();
// 改后
const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
```

### 4. `fromRow` used before assigned

**症状**: TypeScript compile error: `Variable 'fromRow' is used before being assigned`

**原因**: `let fromRow, fromCol, toRow, toCol;` 声明但不赋值，在 `setTimeout(() => { ... fromRow ... })` 闭包中捕获，TypeScript 认为赋值可能尚未执行。

**解决**: 初始化默认值 `let fromRow = 0, fromCol = 0, toRow = 0, toCol = 0;`

### 5. `useCallback` missing dependencies

**症状**: React 使用过时的闭包值（如 score 始终为 0、difficulty 未更新）

**原因**: `handleCellClick` 和 `triggerAI` 的 `useCallback` dependency array 遗漏了 `difficulty`、`score`、`speechOn` 等状态变量。

**解决**: 将所有在回调中使用的 state 变量加入 dependency array:
```typescript
const handleCellClick = useCallback((row: number, col: number) => {
  // ... 使用了 difficulty, score, speechOn 等
}, [board, status, moveTargets, fen, selected, analyzeFen, aiThinking, gameMode, difficulty, score, speechOn]);
```

### 6. `setTimeout` 闭包中引用了过时的 state

**症状**: AI 走棋后读取 `game.current` 报错，或评估分显示不正确

**原因**: `triggerAI` 中的 `setTimeout(() => { ... game.current ... }, 100)` 在定时器触发时，`game` 变量可能是过时的。同时 `triggerAI` 里用 `const b = board` 但在定时器回调中 `b` 已变化。

**解决**:
- 使用 `currentGameRef.current`（`useRef<GameRecord | null>(null)`）确保始终读取最新值
- 在 `setTimeout` 之前捕获需要的值到局部变量

---

## 棋盘渲染

### 7. 棋盘溢出 viewport

**症状**: 棋盘右侧被截断，无法完整显示（用户反馈"修改的非常不好啊，现在棋盘都显示的不全"）

**原因**: CELL 设为了 48 → SVG_W = 48*8 + 18*2 = 420px → Card padding 约 22px*2 = 464px 总宽，而移动端 viewport 只有 480px，几乎无余量。

**解决**:
1. 将 CELL 回退到 38
2. 使用 ResizeObserver 动态计算 `boardScale = Math.min(1, containerWidth / BASE_SVG_W)`
3. 整个 SVG 用 CSS `transform: scale(boardScale)` 缩放，`transform-origin: top left`
4. 容器设置固定宽高比保持布局稳定

### 8. 3D 透视效果导致布局错乱

**症状**: `perspective: 1000px; rotateX(3deg)` 让棋盘扭曲变形，用户不满意

**原因**: 过度追求"3D 感觉"——在棋盘容器上加了 CSS 3D transform，但棋盘本身是平面 SVG，没有 z 轴内容。

**解决**: 完全移除 3D transform，保持干净平面呈现。通过红木渐变 + 金色网格 + 发光阴影来营造质感，而非真正的 3D 变形。

### 9. SVG `repeating-linear-gradient` 不渲染

**症状**: SVG `<rect fill="repeating-linear-gradient(...)">` 在浏览器中不显示

**原因**: SVG `<rect>` 的 `fill` 属性不支持 CSS `repeating-linear-gradient`。CSS 渐变是 CSS 属性，只能在 `style` 标签或内联样式中使用，不能作为 SVG 属性值。

**解决**:
```svg
<!-- 改前：不生效 -->
<rect fill="repeating-linear-gradient(90deg, #5c2e16 0px, #6b3a1f 4px, ...)" />

<!-- 改后：用 SVG pattern -->
<defs>
  <pattern id="wood-stripe" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="#5c2e16" />
    <rect x="0" width="2" height="8" fill="#6b3a1f" opacity="0.4" />
  </pattern>
</defs>
<rect fill="url(#wood-stripe)" />
```

### 10. 重复常量定义

**症状**: TypeScript compile error: `Cannot redeclare block-scoped variable 'PIECE_SIZE'`

**原因**: 重构时多次复制了 `const PIECE_SIZE = CELL * 0.82;`，同一个作用域出现两次。

**解决**: 删除多余的重复定义。

---

## 游戏逻辑

### 11. PVP 模式缺少回合强制

**症状**: 红方走完后，点击红方其他棋子仍然可以选中/拖动，没有提示"该黑方走了"

**原因**: PVP 模式下没有检查 `sideToMove` 和当前点击棋子的 side 是否一致。

**解决**: 在 `handleCellClick` 中加入回合检查：
```typescript
if (gameMode === 'pvp') {
  const { sideToMove } = parseFenForSide(fen);
  if (piece.side !== sideToMove) {
    setWrongSideMsg(sideToMove === 'red' ? '该红方走了' : '该黑方走了');
    // 1.5 秒后自动消失
    return;
  }
}
```

### 12. EVAL 保留字被 strict 模式拒绝

**症状**: WASM JS 加载时报 `SyntaxError: eval is not allowed in strict mode`

**原因**: `wasm-pack --target web` 生成的代码中不包含 `eval` 调用，但如果使用了 `new Function(code)` 且 `code` 内容包含 `import` 语句（因为没 strip 干净），ESM 和 strict mode 下不允许动态 eval import。

**解决**: 确保通过 `new Function()` 执行的代码中：
- 删除所有 `export` 关键字
- 删除或替换 `import` 语句
- WASM URL 补丁在字符串替换阶段完成

---

## E2E 测试

### 13. 测试点击了黑方棋子触发了 wrong-side 提示

**症状**: E2E 测试"点击空交叉点取消选中"失败，因为点击的 (0,0) 是黑车位置

**原因**: 新增 PVP 回合检查后，红方走棋状态下点击黑方棋子（row=0, col=0）会触发 wrong-side 提示气泡，而不是取消选中。

**解决**: 将测试点击位置从 (0,0) 改为河界中间的无棋子交叉点 (4,4)。

---

## 音效系统

### 14. `window.speechSynthesis.speak()` 不发声

**症状**: TTS 函数调用无声音输出

**原因**:
- `speakNotation()` 在组件 `useEffect` 中调用但 `speechSynthesis` 可能未加载完成
- `utterance.rate = 1.0` 在某些浏览器中过快，中文合成不清晰

**解决**:
- 先调用 `window.speechSynthesis.cancel()` 清除之前的语音队列
- 设置 `utterance.lang = 'zh-CN'` 确保中文发音
- 降低语速 `utterance.rate = 0.8`（后续改为 1.0）提高清晰度
- 全局 `try/catch` 包裹，TTS 不可用时静默降级

### 15. `setSoundEnabled` 和 React state 不同步

**症状**: UI 上音效开关显示与实际音效状态不一致

**原因**: `sound.ts` 维护的是模块级全局变量，而 `page.tsx` 有独立的 `soundOn` / `speechOn` state，两者通过 `useEffect` 同步但可能有延迟。

**解决**: 使用 `useEffect` 监听 state 变化并立即同步到模块全局变量：
```typescript
useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);
useEffect(() => { setSpeechEnabled(speechOn); }, [speechOn]);
```

---

## AI 引擎

### 16. 搜索深度过大导致超时

**症状**: difficulty=高级（depth=6）时 AI 思考时间超过 10 秒

**原因**: Negamax + alpha-beta 在没有好的走法排序时，搜索树规模接近原始 minmax，depth=6 在最坏情况下可能搜索数十万节点。

**解决**:
- 实现 MVV-LVA（Most Valuable Victim - Least Valuable Aggressor）走法排序，优先搜索吃子走法
- `alpha-beta` 剪枝配合好的走法排序，平均剪枝率可达 90%+
- 前端设置超时机制，超时后返回当前最佳走法

### 17. 开局库匹配不精确

**症状**: 实际局面 FEN 和古谱 FEN 匹配不上

**原因**: FEN 包含走棋步数和半回合时钟（如 `rnbakabnr/9/... w 0 1`），古谱存储时格式不统一。

**解决**: 使用 `normalizeFen()` 只匹配前两个字段（局面 + 走棋方）：
```typescript
function normalizeFen(fen: string): string {
  return fen.split(' ').slice(0, 2).join(' ');
}
```

---

## 视觉设计

### 18. 红木底色在不同屏幕色温下差异大

**症状**: 部分显示器上 #5c2e16 看起来偏黑，失去了红木质感

**原因**: 不同设备的屏幕色域和亮度差异，单一色值无法在所有设备上呈现同样效果。

**解决**: 使用多层渐变叠加而非单一色值：底色 + 木纹 pattern + 微透明高光叠加层，确保在不同显示设备上都有木纹质感。

### 19. 金色网格线在红木底色下不够明显

**症状**: 棋盘网格线（gold #c9a84c）在红木底色上看起来发暗

**原因**: 红木底色 RGB 92-46-22 的亮度较低，金色 RGB 201-168-76 在暗色背景上缺少足够的对比度。

**解决**:
- 增加网格线宽度（从 0.5px 到 1px）
- 添加微发光效果 `filter="url(#gold-glow)"`
- 在外围增加金色边框 `stroke-width="2.5"`
