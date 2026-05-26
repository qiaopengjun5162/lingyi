'use client';

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let speechEnabled = true;

export function setSoundEnabled(on: boolean) { soundEnabled = on; }
export function setSpeechEnabled(on: boolean) { speechEnabled = on; }
export function isSoundEnabled() { return soundEnabled; }
export function isSpeechEnabled() { return speechEnabled; }

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* audio not available */ }
}

export function playMove() {
  beep(800, 0.08, 'square', 0.08);
}

export function playCapture() {
  beep(200, 0.15, 'triangle', 0.18);
  setTimeout(() => beep(150, 0.1, 'triangle', 0.12), 60);
}

export function playCheck() {
  beep(880, 0.1, 'square', 0.12);
  setTimeout(() => beep(1100, 0.15, 'square', 0.12), 120);
}

export function playCheckmate() {
  beep(600, 0.2, 'sawtooth', 0.1);
  setTimeout(() => beep(400, 0.2, 'sawtooth', 0.1), 150);
  setTimeout(() => beep(200, 0.3, 'sawtooth', 0.08), 300);
}

export function playStalemate() {
  beep(440, 0.3, 'sine', 0.1);
}

export function playSelect() {
  beep(1200, 0.04, 'sine', 0.06);
}

/** 用 TTS 朗读中文棋谱 */
export function speakNotation(text: string) {
  if (!speechEnabled || typeof window === 'undefined') return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  } catch { /* TTS not available */ }
}
