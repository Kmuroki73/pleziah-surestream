type SoundName = 'kick' | 'net' | 'save' | 'whistle' | 'post' | 'miss' | 'crowd';

let audioCtx: AudioContext | null = null;
let muted = false;
let crowdNode: { gain: GainNode; noise: AudioBufferSourceNode } | null = null;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (m && crowdNode) {
    crowdNode.gain.gain.value = 0;
  } else if (!m && crowdNode) {
    crowdNode.gain.gain.value = 0.03;
  }
}

export function isMuted() {
  return muted;
}

function tone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType, vol: number, sweep?: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (sweep) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freq + sweep, 20), ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function noise(ctx: AudioContext, duration: number, vol: number, filterFreq: number) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export function playSound(name: SoundName) {
  const ctx = getCtx();
  if (!ctx) return;

  switch (name) {
    case 'kick':
      tone(ctx, 120, 0.12, 'square', 0.25, -40);
      noise(ctx, 0.08, 0.15, 800);
      break;
    case 'net':
      tone(ctx, 400, 0.15, 'sine', 0.2, -200);
      noise(ctx, 0.2, 0.1, 2000);
      break;
    case 'save':
      tone(ctx, 200, 0.1, 'sawtooth', 0.2, -50);
      noise(ctx, 0.12, 0.15, 500);
      break;
    case 'post':
      tone(ctx, 800, 0.08, 'square', 0.3, -200);
      noise(ctx, 0.05, 0.1, 3000);
      break;
    case 'miss':
      tone(ctx, 150, 0.2, 'sine', 0.15, -80);
      break;
    case 'whistle':
      tone(ctx, 2000, 0.3, 'sine', 0.2, 500);
      break;
    case 'crowd':
      break;
  }
}

export function startCrowdAmbient() {
  const ctx = getCtx();
  if (!ctx || crowdNode) return;

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5 + Math.sin(i / 100) * 0.3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  const gain = ctx.createGain();
  gain.gain.value = muted ? 0 : 0.03;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();

  crowdNode = { gain, noise };
}

export function stopCrowdAmbient() {
  if (crowdNode) {
    try { crowdNode.noise.stop(); } catch { /* already stopped */ }
    crowdNode = null;
  }
}

export function playOutcomeSound(outcome: string) {
  switch (outcome) {
    case 'goal': playSound('net'); break;
    case 'save': playSound('save'); break;
    case 'post': playSound('post'); break;
    case 'miss': playSound('miss'); break;
  }
}
