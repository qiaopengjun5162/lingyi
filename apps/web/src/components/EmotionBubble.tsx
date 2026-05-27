'use client';

import { useEffect, useState } from 'react';

const TEXTS: Record<string, string[]> = {
  blunder: [
    '嘶...你确定要这么走？',
    '这步棋...你认真的？',
    '疼不疼？先想想再走？',
    '这手送子太明显了',
    '冲动是魔鬼啊',
    '又在考验我的耐心？',
  ],
  brilliant: [
    '漂亮！这步有想法！',
    '好棋！局面打开了！',
    '妙手！对手要头疼了',
    '这步可以，有点东西',
    '有点水平啊这步',
  ],
};

interface EmotionBubbleProps {
  emotion: { type: 'blunder' | 'brilliant'; diff: number };
  onDismiss: () => void;
}

export function EmotionBubble({ emotion, onDismiss }: EmotionBubbleProps) {
  const [text] = useState(() => {
    const pool = TEXTS[emotion.type];
    return pool[Math.floor(Math.random() * pool.length)];
  });

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isGood = emotion.type === 'brilliant';

  return (
    <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
        ${isGood
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
          : 'bg-gradient-to-br from-amber-500 to-amber-700'
        }`}>
        <span className="text-[10px] text-white font-bold">{isGood ? '!' : '?'}</span>
      </div>
      <div className="relative">
        <div className={`text-xs leading-relaxed px-3 py-1.5 rounded-xl
          ${isGood
            ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/30'
            : 'bg-amber-900/40 text-amber-200 border border-amber-700/30'
          }`}>
          {text}
        </div>
        {emotion.diff >= 400 && (
          <div className={`text-[10px] mt-0.5 ${isGood ? 'text-emerald-500' : 'text-red-400'}`}>
            {isGood ? `+${emotion.diff}分` : `-${emotion.diff}分`}
          </div>
        )}
      </div>
    </div>
  );
}
