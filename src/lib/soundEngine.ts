// ============================================================================
// Procedural Web Audio API Sound Engine for "TAKARAN" (Tugas & Gula)
// Zero external assets required — synthesizes realistic water splashes,
// Helmholtz bubble pops, ice-in-glass clinks, paper card slams, deadline ticks,
// and warm coffee-shop Rhodes chords in real time.
// ============================================================================

const MUTE_KEY = "takaran_sound";

const readMutedPref = (): boolean => {
  try {
    return localStorage.getItem(MUTE_KEY) === "off";
  } catch {
    return false;
  }
};

const writeMutedPref = (muted: boolean): void => {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "off" : "on");
  } catch {
    // ignore
  }
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = readMutedPref();
  private unlockListeners: Set<(isUnlocked: boolean) => void> = new Set();
  private masterGain: GainNode | null = null;

  public onUnlockChange(cb: (isUnlocked: boolean) => void): () => void {
    this.unlockListeners.add(cb);
    return () => {
      this.unlockListeners.delete(cb);
    };
  }

  private notifyUnlock(unlocked: boolean): void {
    this.unlockListeners.forEach((cb) => {
      try {
        cb(unlocked);
      } catch {
        // ignore
      }
    });
  }

  public isUnlocked(): boolean {
    return !!(this.ctx && this.ctx.state === "running" && !this.isMuted);
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        } catch {
          this.masterGain = null;
        }
      }
    }
    return this.ctx;
  }

  public getDestination(): AudioNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    return this.masterGain || ctx.destination;
  }

  public async initAndTryAutoplay(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const ctx = this.getContext();
    if (!ctx) return false;
    if ((ctx.state as string) === "running") {
      this.notifyUnlock(!this.isMuted);
      return !this.isMuted;
    }
    try {
      await ctx.resume();
      const running = (ctx.state as string) === "running";
      this.notifyUnlock(running && !this.isMuted);
      return running && !this.isMuted;
    } catch {
      return false;
    }
  }

  public async unlock(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if ((ctx.state as string) === "suspended") {
        await ctx.resume();
      }
      // Bulletproof unlock for iOS Safari and mobile browsers:
      // Play a 1-sample silent buffer during user gesture
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain || ctx.destination);
      source.start(0);

      const running = (ctx.state as string) === "running";
      this.notifyUnlock(running && !this.isMuted);
      return running && !this.isMuted;
    } catch {
      return false;
    }
  }

  public unmute(): void {
    this.isMuted = false;
    writeMutedPref(false);
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
    }
    this.notifyUnlock(this.isUnlocked());
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    writeMutedPref(this.isMuted);
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : 1,
        this.ctx.currentTime
      );
    }
    if (!this.isMuted) {
      this.unlock().then(() => {
        this.playIceClink();
      });
    } else {
      this.notifyUnlock(false);
    }
    return this.isMuted;
  }

  // 1. Crisp mechanical clock tick & urgent 23:59 deadline double-beep
  public playClockTick(isUrgent = false): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;
    const now = ctx.currentTime;

    if (!isUrgent) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.035);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // 23:59 Double Digital Alarm Pip
      [0, 0.09].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1760, now + offset);
        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.065);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + offset);
        osc.stop(now + offset + 0.07);
      });
    }
  }

  // 2. Tactile paper / assignment card slam onto study desk
  public playCardSlam(index = 0): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;
    const now = ctx.currentTime;

    // Low desk thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const baseFreq = 135 + (index % 4) * 14;
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);

    oscGain.gain.setValueAtTime(0.24, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);

    // Crisp paper snap (filtered noise burst)
    const bufferSize = Math.floor(ctx.sampleRate * 0.065);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400 + index * 120, now);
    filter.Q.setValueAtTime(1.8, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    noise.start(now);
  }

  // 3. Colossal Sugar Cube Impact + Glass Ice Clink + Big Splash + Bubbling Pour
  public playHeroSugarImpact(): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;
    const now = ctx.currentTime;

    // A) Cinematic sub-bass impact drop
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.45);
    subGain.gain.setValueAtTime(0.38, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.5);

    // B) Water splash noise burst
    const splashDur = 0.65;
    const bufLen = Math.floor(ctx.sampleRate * splashDur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.sin((i / bufLen) * Math.PI) * Math.exp(-i / (bufLen * 0.42));
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(480, now + splashDur);
    filter.Q.setValueAtTime(1.4, now);

    const splashGain = ctx.createGain();
    splashGain.gain.setValueAtTime(0.32, now);
    splashGain.gain.exponentialRampToValueAtTime(0.001, now + splashDur);

    noise.connect(filter);
    filter.connect(splashGain);
    splashGain.connect(dest);
    noise.start(now);

    // C) Crystal Ice-in-Glass Clink partials
    [2150, 2880, 3720].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + 0.04 + idx * 0.03);
      g.gain.setValueAtTime(0.09, now + 0.04 + idx * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22 + idx * 0.03);
      osc.connect(g);
      g.connect(dest);
      osc.start(now + 0.04 + idx * 0.03);
      osc.stop(now + 0.24 + idx * 0.03);
    });

    // D) Cascading Helmholtz water bubbles (pouring syrup effect over 1.2s)
    for (let b = 0; b < 14; b++) {
      const delay = 0.08 + b * 0.075 + Math.random() * 0.04;
      this.scheduleBubblePop(now + delay, 380 + Math.random() * 620, 0.08);
    }
  }

  // Helmholtz cavity resonance bubble pop (upward sine pitch bend)
  private scheduleBubblePop(startTime: number, baseFreq: number, volume = 0.1): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.15, startTime + 0.055);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + 0.065);
  }

  // 4. Warm Coffee-Shop Lo-Fi Electric Piano Chord (Beat 2 Invitation)
  public playWarmInviteChord(): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;
    const now = ctx.currentTime;

    // Fmaj9 warm voicing: F3, A3, C4, E4, G4
    const notes = [174.61, 220.0, 261.63, 329.63, 392.0];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.035);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, now + i * 0.035);
      filter.frequency.exponentialRampToValueAtTime(420, now + 1.4);

      g.gain.setValueAtTime(0.001, now + i * 0.035);
      g.gain.linearRampToValueAtTime(0.065, now + i * 0.035 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);

      osc.connect(filter);
      filter.connect(g);
      g.connect(dest);
      osc.start(now + i * 0.035);
      osc.stop(now + 1.5);
    });
  }

  // 5. Ascending Water-Marimba Pluck as T-A-K-A-R-A-N letters erupt from liquid!
  public playLetterErupt(letterIndex: number): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;
    const now = ctx.currentTime;

    // Warm pentatonic scale: C4, D4, E4, G4, A4, C5, D5
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const freq = scale[letterIndex % scale.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.3);

    // Subtle companion bubble pop
    this.scheduleBubblePop(now + 0.015, freq * 1.5, 0.055);
  }

  // 6. Interactive Sugar Cube Drop + Ice Clink (when clicking hero or questionnaire chips)
  public playSugarDrop(): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const dest = this.getDestination() || ctx.destination;
    const now = ctx.currentTime;

    // Crisp glass clink
    const clinkFreq = 2200 + Math.random() * 500;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(clinkFreq, now);
    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);

    // Two sweet bubble pops
    this.scheduleBubblePop(now + 0.04, 480 + Math.random() * 260, 0.09);
    this.scheduleBubblePop(now + 0.11, 680 + Math.random() * 320, 0.07);
  }

  public playIceClink(): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== "running" || this.isMuted) return;
    const now = ctx.currentTime;
    this.scheduleBubblePop(now, 560 + Math.random() * 240, 0.08);
  }
}

export const soundEngine = new SoundEngine();
