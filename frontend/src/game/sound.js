// 8-bit tarzi WebAudio ses efektleri
export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  play(ev) {
    switch (ev) {
      case 'kick':
        this.tone(180, 0.12, 'square', 0.1, -120);
        break;
      case 'head':
        this.tone(420, 0.07, 'square', 0.06, -200);
        break;
      case 'bounce':
        this.tone(140, 0.05, 'triangle', 0.05);
        break;
      case 'post':
        this.tone(900, 0.15, 'square', 0.06, -400);
        break;
      case 'jump':
        this.tone(300, 0.1, 'square', 0.04, 260);
        break;
      case 'swing':
        this.tone(90, 0.04, 'sawtooth', 0.03);
        break;
      case 'goal':
        [0, 0.1, 0.2, 0.32].forEach((d, i) =>
          setTimeout(() => this.tone([523, 659, 784, 1046][i], 0.18, 'square', 0.09), d * 1000)
        );
        break;
      case 'whistle':
        this.tone(1800, 0.25, 'square', 0.05, 200);
        break;
      case 'end':
        this.tone(1800, 0.2, 'square', 0.05);
        setTimeout(() => this.tone(1800, 0.2, 'square', 0.05), 260);
        setTimeout(() => this.tone(1800, 0.5, 'square', 0.05), 520);
        break;
      case 'click':
        this.tone(700, 0.05, 'square', 0.04);
        break;
      default:
        break;
    }
  }
}
