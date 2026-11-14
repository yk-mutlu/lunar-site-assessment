// ═══════════════════════════════════════════════════════════════════════
// Audio Engine — Procedural Web Audio API sounds
// Engine rumble, RCS clicks, alarms, touchdown thud
// ═══════════════════════════════════════════════════════════════════════

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private _muted = false;
  private started = false;

  get muted() { return this._muted; }

  init() {
    if (this.ctx) return;

    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // AudioContext not available
    }
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 0.3;
    }
  }

  startEngine() {
    if (!this.ctx || !this.masterGain || this.started) return;
    this.started = true;

    // Low-frequency engine rumble
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 200;
    this.engineFilter.Q.value = 2;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();

    // White noise for broadband rumble
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;

    this.noiseNode.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseNode.start();
  }

  updateEngine(throttle: number) {
    if (!this.engineGain || !this.engineOsc || !this.noiseGain || !this.engineFilter) return;

    this.engineGain.gain.value = throttle * 0.15;
    this.engineOsc.frequency.value = 45 + throttle * 30;
    this.engineFilter.frequency.value = 150 + throttle * 200;
    this.noiseGain.gain.value = throttle * 0.08;
  }

  playRCSClick() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 800 + Math.random() * 400;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playAlarm() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    // Beep pattern
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.setValueAtTime(0, now + 0.1);
    gain.gain.setValueAtTime(0.08, now + 0.2);
    gain.gain.setValueAtTime(0, now + 0.3);
    gain.gain.setValueAtTime(0.08, now + 0.4);
    osc.stop(now + 0.5);
  }

  playTouchdown() {
    if (!this.ctx || !this.masterGain) return;

    // Low thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  playCrash() {
    if (!this.ctx || !this.masterGain) return;

    // Heavy impact
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 40;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.6);

    // Metal crunch noise
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.1;
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();
  }

  stopEngine() {
    this.started = false;
    try {
      this.engineOsc?.stop();
      this.noiseNode?.stop();
    } catch { /* already stopped */ }
    this.engineOsc = null;
    this.noiseNode = null;
    this.engineGain = null;
    this.noiseGain = null;
  }

  dispose() {
    this.stopEngine();
    this.ctx?.close();
    this.ctx = null;
  }
}
