import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 30;

const deepseek = createOpenAICompatible({
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseURL: 'https://api.deepseek.com/v1',
});

interface CoachRequest {
  fen: string;
  score: number;
  gameMode: string;
  moveCount: number;
}

function detectPhase(fen: string): '开局' | '中局' | '残局' {
  const boardPart = fen.split(' ')[0];
  const totalPieces = boardPart.replace(/[^rnbakcpRNBAKCP]/g, '').length;
  if (totalPieces > 28) return '开局';
  if (totalPieces < 16) return '残局';
  return '中局';
}

function detectSideToMove(fen: string): '红方' | '黑方' {
  const parts = fen.split(' ');
  return parts[1] === 'w' ? '红方' : '黑方';
}

function buildPrompt(ctx: CoachRequest): string {
  const side = detectSideToMove(ctx.fen);
  const phase = detectPhase(ctx.fen);

  return `角色：你是一位资深的中国象棋教练，风格严厉、一针见血。你的目标是让棋手听了之后恍然大悟，而不是感到被冒犯。

## 当前局面
- 轮到谁走：${side}
- 局面阶段：${phase}
- 局面评估：${ctx.score > 0 ? `红方优势（${ctx.score.toFixed(1)}分）` : ctx.score < 0 ? `黑方优势（${Math.abs(ctx.score).toFixed(1)}分）` : '均势'}
- 合法走法数：${ctx.moveCount}
- 对局模式：${ctx.gameMode === 'pve' ? '人机对战' : '双人对弈'}

## 输出要求
用一句话给出犀利的评语，然后给出简短理由，总共 2-3 句话。
直接输出中文，不要 JSON 包装，不要多余格式。
评语风格：犀利、一针见血、不说场面话。`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseContext(body: any): CoachRequest {
  if (body.messages) {
    const lastUserMsg = body.messages.filter((m: { role: string }) => m.role === 'user').pop();
    const text = lastUserMsg?.parts?.[0]?.text ?? lastUserMsg?.content ?? '{}';
    return JSON.parse(text);
  }
  return body;
}

function tryClaude(systemPrompt: string) {
  return streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: [{ role: 'user', content: '请分析当前局面并给出评语。' }],
  });
}

function tryDeepSeek(systemPrompt: string) {
  return streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages: [{ role: 'user', content: '请分析当前局面并给出评语。' }],
    providerOptions: {
      deepseek: {
        thinking: { type: 'disabled' },
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const context = parseContext(body);
    const systemPrompt = buildPrompt(context);

    // Primary: Claude（有 API key 时优先）
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const result = tryClaude(systemPrompt);
        return result.toUIMessageStreamResponse();
      } catch (e) {
        console.warn('Claude 调用失败，切换到 DeepSeek:', e);
      }
    }

    // Fallback: DeepSeek
    const result = tryDeepSeek(systemPrompt);
    return result.toUIMessageStreamResponse();
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : '分析失败' },
      { status: 500 },
    );
  }
}
