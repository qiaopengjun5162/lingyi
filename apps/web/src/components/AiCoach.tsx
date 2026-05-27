'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

interface AiCoachProps {
  fen: string;
  score: number;
  gameMode: string;
  moveCount: number;
}

export function AiCoach({ fen, score, gameMode, moveCount }: AiCoachProps) {
  const [hasRequested, setHasRequested] = useState(false);

  const transport = new DefaultChatTransport({ api: '/api/coach' });
  const { messages, setMessages, sendMessage, status, error } = useChat({ transport });

  const isPending = status === 'submitted' || status === 'streaming';
  const lastComment = messages.filter(m => m.role === 'assistant').pop();
  const commentText = lastComment?.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
  const hasComment = !!commentText;

  const handleAnalyze = () => {
    setHasRequested(true);
    setMessages([]);
    sendMessage({ text: JSON.stringify({ fen, score, gameMode, moveCount }) });
  };

  return (
    <div className="rounded-xl bg-[#2a1e1b]/70 backdrop-blur-md border border-[#c9a84c]/10 overflow-hidden">
      {/* 卷轴 header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#c9a84c]/8">
        <div className="w-1 h-4 bg-[#c23b22]/50 rounded-full" />
        <span className="text-[11px] font-['KaiTi','STKaiti','Noto_Serif_SC',serif] tracking-wider text-[#c9a84c]/70">
          灵弈教练 · 评语
        </span>
      </div>

      <div className="px-3 py-2.5 min-h-[80px]">
        {!hasComment && !isPending && !error && !hasRequested && (
          <div className="text-[11px] font-['KaiTi','STKaiti',serif] leading-relaxed text-[#c9a84c]/45">
            点击下方按钮，AI 教练将根据当前局面给出评语。
          </div>
        )}

        {isPending && (
          <div className="flex items-start gap-2">
            <div className="w-1 h-6 bg-[#c23b22]/40 rounded-full mt-0.5 shrink-0 animate-pulse" />
            <div className="text-[11px] font-['KaiTi','STKaiti',serif] leading-relaxed text-[#c9a84c]/60">
              教练思索中...
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2">
            <div className="w-1 h-6 bg-red-500/40 rounded-full mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed text-red-400/80">
              分析未成：{error.message}
            </div>
          </div>
        )}

        {hasComment && !isPending && (
          <div className="text-[11px] font-['KaiTi','STKaiti','Noto_Serif_SC',serif] leading-relaxed text-[#c9a84c]/75 whitespace-pre-wrap">
            {commentText}
          </div>
        )}
      </div>

      {/* 卷轴 footer */}
      <div className="px-3 py-2 border-t border-[#c9a84c]/8">
        <button onClick={handleAnalyze} disabled={isPending}
          className="w-full py-1.5 text-[11px] font-['KaiTi','STKaiti',serif] tracking-wider
            bg-[#c23b22]/10 border border-[#c23b22]/20 text-[#c23b22]/60
            hover:bg-[#c23b22]/15 hover:text-[#c23b22]/80
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150 active:scale-[0.98] rounded">
          {isPending ? '评语生成中...' : hasComment ? '重新求教' : '求教'}
        </button>
      </div>
    </div>
  );
}
