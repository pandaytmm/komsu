/* Tamamen prosedürel WebAudio ses tasarımı */
window.SFX = (function () {
  const A = {
    ctx: null, master: null, ready: false, noiseBuf: null,
    ambGain: null, rainGain: null, chaseGain: null, humGain: null,
    danger: 0, chasing: false, heartTimer: 0, inside: false,
    lastStepAt: 0, whisperTimer: 0
  };

  function now() { return A.ctx ? A.ctx.currentTime : 0; }

  function makeNoise(seconds) {
    const rate = A.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = A.ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }

  function env(g, t0, peak, attack, decay) {
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  function noiseBurst(dur, type, freq, q, peak, when, attack, dest) {
    if (!A.ready) return;
    const t0 = when ?? now();
    const src = A.ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = A.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = A.ctx.createGain();
    env(g, t0, peak, attack ?? 0.005, dur);
    src.connect(f).connect(g).connect(dest || A.master);
    src.start(t0);
    src.stop(t0 + dur + (attack ?? 0.005) + 0.1);
  }

  function tone(freq, dur, type, peak, when, glide, attack) {
    if (!A.ready) return;
    const t0 = when ?? now();
    const o = A.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
    const g = A.ctx.createGain();
    env(g, t0, peak, attack ?? 0.01, dur);
    o.connect(g).connect(A.master);
    o.start(t0);
    o.stop(t0 + dur + 0.2);
  }

  function startAmbient() {
    const t = now();
    // rüzgâr
    const wind = A.ctx.createBufferSource();
    wind.buffer = A.noiseBuf; wind.loop = true;
    const wf = A.ctx.createBiquadFilter();
    wf.type = 'lowpass'; wf.frequency.value = 260;
    const wg = A.ctx.createGain(); wg.gain.value = 0.075;
    wind.connect(wf).connect(wg).connect(A.master);
    wind.start(t);
    // yağmur
    const rain = A.ctx.createBufferSource();
    rain.buffer = A.noiseBuf; rain.loop = true; rain.playbackRate.value = 1.4;
    const rf = A.ctx.createBiquadFilter();
    rf.type = 'bandpass'; rf.frequency.value = 1500; rf.Q.value = 0.5;
    A.rainGain = A.ctx.createGain(); A.rainGain.gain.value = 0.028;
    rain.connect(rf).connect(A.rainGain).connect(A.master);
    rain.start(t);
    // alçak dron
    const d1 = A.ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 55;
    const d2 = A.ctx.createOscillator(); d2.type = 'sine'; d2.frequency.value = 82.4;
    const dg = A.ctx.createGain(); dg.gain.value = 0.026;
    d1.connect(dg); d2.connect(dg); dg.connect(A.master);
    d1.start(t); d2.start(t);
    // kovalama katmanı (sessiz başlar)
    const c1 = A.ctx.createOscillator(); c1.type = 'sawtooth'; c1.frequency.value = 46;
    const c2 = A.ctx.createOscillator(); c2.type = 'sawtooth'; c2.frequency.value = 69.5;
    const cf = A.ctx.createBiquadFilter(); cf.type = 'lowpass'; cf.frequency.value = 260;
    A.chaseGain = A.ctx.createGain(); A.chaseGain.gain.value = 0.0001;
    c1.connect(cf); c2.connect(cf); cf.connect(A.chaseGain).connect(A.master);
    c1.start(t); c2.start(t);
  }

  function creak() {
    if (!A.ready) return;
    noiseBurst(0.55, 'bandpass', 500 + Math.random() * 600, 4, 0.03, undefined, 0.12);
    tone(140 + Math.random() * 90, 0.7, 'sawtooth', 0.012, undefined, 70, 0.08);
  }

  function whisper() {
    if (!A.ready) return;
    const t = now();
    noiseBurst(0.9, 'bandpass', 950 + Math.random() * 500, 3.5, 0.018, t, 0.25);
    noiseBurst(0.45, 'bandpass', 2300, 6, 0.01, t + 0.42, 0.14);
  }

  function knock() {
    if (!A.ready) return;
    const t = now();
    [0, 0.33, 0.61].forEach((d, i) => {
      noiseBurst(0.12, 'lowpass', 175, 1.2, 0.075 - i * 0.012, t + d, 0.003);
      tone(66 - i * 4, 0.16, 'sine', 0.045 - i * 0.008, t + d, 42, 0.002);
    });
  }

  function dog() {
    if (!A.ready) return;
    const t = now();
    for (let i = 0; i < 3; i++) {
      const w = t + i * 0.37 + Math.random() * 0.05;
      noiseBurst(0.16, 'bandpass', 430, 2.6, 0.022, w, 0.015);
      tone(210 + Math.random() * 40, 0.18, 'sawtooth', 0.009, w, 115, 0.015);
    }
  }

  function radioStatic(dur = 2.2) {
    if (!A.ready) return;
    const t = now();
    noiseBurst(dur, 'bandpass', 1700, 0.6, 0.028, t, 0.18);
    noiseBurst(dur * 0.8, 'highpass', 4200, 0.7, 0.007, t + 0.1, 0.45);
    if (Math.random() < 0.6) tone(914, 0.03, 'sine', 0.004, t + 0.4);
  }

  function tick() {
    if (!A.ready) return;
    noiseBurst(0.025, 'highpass', 3200, 1.4, 0.014, undefined, 0.002);
    tone(1500, 0.025, 'square', 0.003);
  }

  function heartbeatPair(strength) {
    const t = now();
    const dest = A.master;
    tone(46, 0.18, 'sine', 0.2 * strength, t, 32, 0.008);
    tone(52, 0.13, 'sine', 0.12 * strength, t + 0.17, 38, 0.008);
    if (strength > 0.8) noiseBurst(0.05, 'lowpass', 180, 1, 0.04, t, 0.004, dest);
  }

  return {
    init() {
      if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        A.ctx = new AC();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.62;
        A.master.connect(A.ctx.destination);
        A.noiseBuf = makeNoise(2.2);
        A.ready = true;
        startAmbient();
      } catch (e) {
        A.ready = false;
        return;
      }
      setTimeout(function loop() {
        if (!A.ready) return;
        if (!A.inside) {
          const r = Math.random();
          if (r < 0.5) creak();
          else if (r < 0.78) dog();
          else if (r < 0.9) knock();
        }
        setTimeout(loop, 14000 + Math.random() * 22000);
      }, 9000);
      setTimeout(function tickLoop() {
        if (!A.ready) return;
        if (A.inside) tick();
        setTimeout(tickLoop, 1150 + Math.random() * 350);
      }, 7000);
    },
    resume() { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); },
    setInside(v) {
      A.inside = v;
      if (!A.ready) return;
      A.rainGain.gain.setTargetAtTime(v ? 0.008 : 0.03, now(), 1.2);
    },
    footstep(run, crouch, inside) {
      if (!A.ready) return;
      const t = now();
      if (t - A.lastStepAt < 0.11) return;
      A.lastStepAt = t;
      const vol = crouch ? 0.018 : (run ? 0.075 : 0.04);
      noiseBurst(inside ? 0.09 : 0.13, 'lowpass', inside ? 480 : 240, 1, vol);
      if (inside && !crouch) tone(run ? 88 : 64, 0.08, 'sine', run ? 0.035 : 0.018);
    },
    aiStep(vol) {
      if (!A.ready) return;
      noiseBurst(0.16, 'lowpass', 190, 1, Math.min(0.12, vol), undefined, 0.01);
      tone(58, 0.12, 'sine', Math.min(0.05, vol * 0.4));
    },
    heartbeat(strength) { if (A.ready) heartbeatPair(strength); },
    whisper() { whisper(); },
    knock() { knock(); },
    dog() { dog(); },
    radioStatic(dur) { radioStatic(dur); },
    tick() { tick(); },
    duck(on) {
      if (!A.ready) return;
      A.master.gain.setTargetAtTime(on ? 0.3 : 0.62, now(), on ? 0.08 : 0.35);
    },
    setChase(on) {
      if (!A.ready) return;
      if (A.chasing === on) return;
      A.chasing = on;
      A.chaseGain.gain.setTargetAtTime(on ? 0.055 : 0.0001, now(), on ? 0.6 : 1.6);
      if (on) {
        tone(196, 0.5, 'sawtooth', 0.035, undefined, 130, 0.02);
        setTimeout(() => tone(146, 0.7, 'sawtooth', 0.03, undefined, 96, 0.02), 260);
      }
    },
    seen() { tone(720, 0.12, 'square', 0.05, undefined, 520); tone(1040, 0.18, 'sine', 0.03, undefined, 700); },
    pickup() {
      const t = now();
      [660, 880, 1174].forEach((f, i) => tone(f, 0.5, 'sine', 0.045, t + i * 0.07));
    },
    fuseGet() { tone(300, 0.12, 'square', 0.04); tone(1200, 0.08, 'square', 0.02); },
    locked() {
      noiseBurst(0.16, 'lowpass', 220, 1, 0.12);
      tone(82, 0.22, 'sine', 0.1, undefined, 55);
      setTimeout(() => tone(1300, 0.06, 'square', 0.015), 90);
    },
    doorOpen() {
      tone(120, 0.9, 'sawtooth', 0.02, undefined, 62, 0.15);
      noiseBurst(0.7, 'bandpass', 800, 3, 0.022, undefined, 0.2);
    },
    keyUse() { noiseBurst(0.2, 'highpass', 2200, 1.5, 0.035); tone(900, 0.14, 'square', 0.02); },
    throwBottle() { noiseBurst(0.12, 'bandpass', 900, 2, 0.03, undefined, 0.02); },
    glass() {
      noiseBurst(0.25, 'highpass', 2600, 0.8, 0.1);
      for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 2200, 0.18 + Math.random() * 0.2, 'triangle', 0.02, now() + i * 0.02);
    },
    powerOn() {
      const t = now();
      tone(60, 2.2, 'sawtooth', 0.03, t, 240);
      noiseBurst(0.4, 'bandpass', 300, 2, 0.06, t);
      setTimeout(() => {
        noiseBurst(0.12, 'lowpass', 500, 1, 0.12);
        tone(110, 1.6, 'sine', 0.035);
      }, 700);
      if (A.humGain) return;
      const o = A.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 60;
      const o2 = A.ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 120;
      A.humGain = A.ctx.createGain(); A.humGain.gain.value = 0.0001;
      o.connect(A.humGain); o2.connect(A.humGain); A.humGain.connect(A.master);
      o.start(); o2.start();
      setTimeout(() => A.humGain.gain.setTargetAtTime(0.018, now(), 1.4), 900);
    },
    tape() {
      if (!A.ready) return;
      const t = now();
      noiseBurst(3.4, 'bandpass', 1700, 0.7, 0.035, t, 0.4);
      const o = A.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 220;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(g).connect(A.master); o.start(t); o.stop(t + 3.4);
      tone(330, 2.6, 'sine', 0.014, t + 0.3, 220, 0.6);
    },
    stinger() {
      if (!A.ready) return;
      const t = now();
      noiseBurst(0.9, 'highpass', 900, 0.6, 0.22, t, 0.005);
      tone(640, 1.1, 'sawtooth', 0.14, t, 46, 0.005);
      tone(1720, 0.7, 'square', 0.03, t, 300, 0.004);
      noiseBurst(2.2, 'lowpass', 120, 1, 0.2, t + 0.05, 0.02);
    },
    shout() {
      if (!A.ready) return;
      tone(160, 0.32, 'sawtooth', 0.06, undefined, 90, 0.03);
      noiseBurst(0.35, 'bandpass', 700, 2, 0.04, undefined, 0.03);
    },
    thunder() {
      if (!A.ready) return;
      noiseBurst(3.2, 'lowpass', 130, 0.8, 0.13, undefined, 0.15);
      setTimeout(() => noiseBurst(1.5, 'lowpass', 80, 1, 0.09), 180);
    },
    endingTone(good) {
      if (!A.ready) return;
      const t = now();
      const notes = good ? [220, 277.2, 329.6, 440] : [146.8, 174.6, 220, 293.7];
      notes.forEach((f, i) => {
        const o = A.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = A.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + i * 0.35);
        g.gain.linearRampToValueAtTime(0.024, t + i * 0.35 + 0.8);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
        o.connect(g).connect(A.master);
        o.start(t + i * 0.35); o.stop(t + 7);
      });
    },
    update(dt, danger, chasing) {
      if (!A.ready) return;
      A.danger = U.lerp(A.danger, danger, Math.min(1, dt * 3));
      if (chasing !== A.chasing) this.setChase(chasing);
      if (A.danger > 0.25) {
        A.heartTimer -= dt;
        if (A.heartTimer <= 0) {
          heartbeatPair(0.35 + A.danger * 0.9);
          A.heartTimer = U.lerp(1.15, 0.48, A.danger);
        }
      } else {
        A.heartTimer = 0;
      }
      A.whisperTimer -= dt;
      if (A.danger > 0.45 && A.whisperTimer <= 0) {
        whisper();
        A.whisperTimer = U.lerp(4.8, 1.8, A.danger);
      }
    }
  };
})();
