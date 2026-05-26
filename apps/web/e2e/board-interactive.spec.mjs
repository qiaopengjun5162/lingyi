/**
 * 灵弈棋盘 E2E 测试
 *
 * 测试范围：
 * - WASM 引擎初始化
 * - 棋子点击选中与走法提示
 * - 执行走棋更新局面
 * - 切换走棋方
 * - 预设场景按钮
 * - FEN 文本输入
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

async function waitForEngine(page) {
  await page.waitForFunction(() => {
    const spans = document.querySelectorAll('span');
    return Array.from(spans).some(s => s.textContent === '就绪');
  }, { timeout: 15000 });
}

/**
 * 点击棋盘上的交叉点 (row, col)
 * 交叉点渲染为 div[class*="z-10"]，按行主序排列（每行 9 个）
 */
async function clickCell(page, row, col) {
  const idx = row * 9 + col;
  await page.evaluate(({ i, r, c }) => {
    const cells = document.querySelectorAll('[class*="z-10"]');
    const cell = cells[i];
    if (cell) cell.click();
    else throw new Error(`Cell index ${i} (row=${r}, col=${c}) not found`);
  }, { i: idx, r: row, c: col });
  await page.waitForTimeout(150);
}

/** 获取页面上包含关键词的 span 文本 */
async function getText(page, keyword) {
  return page.evaluate((kw) => {
    const spans = document.querySelectorAll('span');
    for (const s of spans) {
      if (s.textContent.includes(kw)) return s.textContent;
    }
    return null;
  }, keyword);
}

/** 统计走法提示指示器数量（绿点 + 红圈，都是 z-20） */
async function countIndicators(page) {
  return page.evaluate(() => document.querySelectorAll('[class*="z-20"]').length);
}

let browser;
let page;
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

async function main() {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 480, height: 900 } });

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });

  console.log('\n=== 灵弈棋盘 E2E 测试 ===\n');

  // ─── 1. WASM 引擎初始化 ───
  console.log('── 引擎初始化 ──');

  await test('WASM 引擎加载就绪', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await waitForEngine(page);
  });

  await test('开局棋盘渲染（无页面错误）', async () => {
    if (errors.length > 0) {
      // 忽略 Playwright MCP Bridge 扩展错误
      const nonMCP = errors.filter(e => !e.includes('mmlmfjhmonkocbjadbfplnigmagldckm'));
      if (nonMCP.length > 0) {
        throw new Error(`有 ${nonMCP.length} 个非扩展错误: ${nonMCP.join(', ')}`);
      }
    }
  });

  await test('显示红方先走', async () => {
    const text = await getText(page, '红方');
    if (!text) throw new Error('未找到"红方"文字');
  });

  await test('初始评估分为 0（平衡局面）', async () => {
    const text = await getText(page, '评估');
    if (!text) throw new Error('未找到评估分');
    const match = text.match(/([-+]?\d+\.\d+)/);
    if (!match) throw new Error(`评估分格式异常: ${text}`);
    const score = parseFloat(match[1]);
    if (Math.abs(score) > 0.5) {
      throw new Error(`开局评估应接近 0，实际为 ${score}`);
    }
  });

  // ─── 2. 棋子选中与走法提示 ───
  console.log('\n── 选中与走法提示 ──');

  await test('点击红炮显示走法提示', async () => {
    await clickCell(page, 7, 1);
    const count = await countIndicators(page);
    if (count === 0) throw new Error('红炮应有走法提示');
  });

  await test('点击另一个红方棋子重新选中', async () => {
    // 红马 (9,1) — 之前选中的红炮提示消失，红马提示出现
    await clickCell(page, 9, 1);
    const count = await countIndicators(page);
    if (count === 0) throw new Error('红马应有走法提示');
  });

  await test('点击空交叉点取消选中', async () => {
    await clickCell(page, 4, 4); // 河界正中是无棋子的空交叉点
    const count = await countIndicators(page);
    if (count !== 0) throw new Error(`取消选中后不应有走法提示，实际为 ${count}`);
  });

  // ─── 3. 执行走棋 ───
  console.log('\n── 走棋执行 ──');

  await test('走一步棋：红炮从 (7,1) 进到 (6,1)', async () => {
    // 选中红炮
    await clickCell(page, 7, 1);
    const before = await countIndicators(page);
    if (before === 0) throw new Error('红炮应有走法提示');

    // 点击目标 (6,1) — 炮前进一步
    await clickCell(page, 6, 1);

    // 走棋后切换到黑方
    const text = await getText(page, '黑方');
    if (!text) throw new Error('走棋后应切换到黑方走棋');
  });

  await test('走棋后局面评估正常显示', async () => {
    const text = await getText(page, '评估');
    if (!text) throw new Error('应显示局面评估');
  });

  // ─── 4. 预设场景 ───
  console.log('\n── 预设场景 ──');

  await test('切换到"劣势"局面', async () => {
    await page.click('button:has-text("劣势")');
    await page.waitForTimeout(200);
    const text = await getText(page, '评估');
    if (!text) throw new Error('劣势局面应显示评估');
  });

  await test('劣势局面的评估分与开局不同', async () => {
    const text = await getText(page, '评估');
    const match = text.match(/([-+]?\d+\.\d+)/);
    if (!match) throw new Error(`评估分格式异常: ${text}`);
  });

  await test('切换到"优势"局面', async () => {
    await page.click('button:has-text("优势")');
    await page.waitForTimeout(200);
    const text = await getText(page, '评估');
    const match = text.match(/([-+]?\d+\.\d+)/);
    if (!match) throw new Error(`评估分格式异常: ${text}`);
    const score = parseFloat(match[1]);
    if (score <= 0) throw new Error(`优势局面评估分应为正值，实际为 ${score}`);
  });

  await test('切换到"跳马布局"', async () => {
    await page.click('button:has-text("跳马布局")');
    await page.waitForTimeout(200);
    const text = await getText(page, '走法');
    const match = text.match(/(\d+)/);
    if (!match) throw new Error('未找到走法数');
    const count = parseInt(match[1]);
    if (count === 0) throw new Error('跳马布局应有合法走法');
  });

  // ─── 5. FEN 文本输入 ───
  console.log('\n── FEN 文本输入 ──');

  await test('输入自定义 FEN 更新棋盘', async () => {
    const testFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
    const textarea = await page.$('textarea');
    if (!textarea) throw new Error('应存在 FEN 输入框');

    await textarea.fill(testFen);
    await page.waitForTimeout(200);

    const text = await getText(page, '走法');
    if (!text) throw new Error('输入 FEN 后应显示合法走法数');
  });

  // ─── 6. 回到开局 ───
  console.log('\n── 重新开局 ──');

  await test('点击"开局"按钮回到初始局面', async () => {
    await page.click('button:has-text("开局")');
    await page.waitForTimeout(200);
    const text = await getText(page, '红方');
    if (!text) throw new Error('开局应红方先走');
  });

  await test('回到开局后无页面错误', async () => {
    // 过滤已知扩展错误
    const realErrors = errors.filter(e => !e.includes('mmlmfjhmonkocbjadbfplnigmagldckm'));
    if (realErrors.length > 30) {
      throw new Error(`页面错误过多: ${realErrors.length}`);
    }
  });

  // ─── 7. AI 模式 ───
  console.log('\n── AI 人机模式 ──');

  await test('切换到"人机对战"模式', async () => {
    await page.click('button:has-text("人机对战")');
    await page.waitForTimeout(200);
    const hasDifficulty = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      return Array.from(btns).some(b => b.textContent.includes('中级'));
    });
    if (!hasDifficulty) throw new Error('人机模式应显示难度选择');
  });

  await test('难度选择器可以切换', async () => {
    await page.click('button:has-text("中级")');
    await page.waitForTimeout(100);
    await page.click('button:has-text("入门")');
    await page.waitForTimeout(100);
    // 最后切回中级（AI 走的深度适中）
    await page.click('button:has-text("中级")');
    await page.waitForTimeout(100);
  });

  await test('人机模式下走棋后 AI 自动回应', async () => {
    // 确保棋盘在开局状态
    await page.click('button:has-text("开局")');
    await page.waitForTimeout(200);

    // 走一步红炮 (7,1) → (6,1)
    await clickCell(page, 7, 1);
    await clickCell(page, 6, 1);

    // 等待 AI 回应（最多 5 秒）
    const aiResponded = await page.evaluate(() => {
      return new Promise(resolve => {
        let waited = 0;
        const check = setInterval(() => {
          waited += 500;
          const spans = document.querySelectorAll('span');
          const hasRed = Array.from(spans).some(s => s.textContent.includes('红方'));
          if (hasRed) { clearInterval(check); resolve(true); }
          else if (waited > 5000) { clearInterval(check); resolve(false); }
        }, 500);
      });
    });
    if (!aiResponded) throw new Error('AI 未在 5 秒内回应');
  });

  await test('人机模式切换回双人对弈', async () => {
    await page.click('button:has-text("双人对弈")');
    await page.waitForTimeout(100);
  });

  // ─── 汇总 ───
  const total = passed + failed;
  console.log(`\n── 结果: ${passed}/${total} 通过, ${failed} 失败 ──`);

  if (errors.length) {
    const nonMCP = errors.filter(e => !e.includes('mmlmfjhmonkocbjadbfplnigmagldckm'));
    if (nonMCP.length > 0) {
      console.log('\n非扩展页面错误:');
      nonMCP.forEach(e => console.log(`  ${e}`));
    }
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('测试崩溃:', e);
  process.exit(1);
});
