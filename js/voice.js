/* Konuşma: Web Speech API ile Türkçe seslendirme ve kişilik modları */
window.VOICE = (function () {
  const V = {
    enabled: true,
    personality: 'kuskuci',
    voice: null,
    lang: 'tr-TR',
    lastText: '',
    lastAt: 0,
    speaking: false,
    current: null
  };

  const PRESETS = {
    suskun: { label: 'SUSKUN', pitch: 0.55, rate: 0.8, volume: 0.55 },
    kuskuci: { label: 'KUŞKUCU', pitch: 0.72, rate: 0.92, volume: 0.8 },
    ofkeli: { label: 'ÖFKELİ', pitch: 0.92, rate: 1.08, volume: 1 }
  };

  function supported() {
    return typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  function load() {
    try {
      if (localStorage.getItem('komsu.voice') === '0') V.enabled = false;
      const p = localStorage.getItem('komsu.personality');
      if (p && PRESETS[p]) V.personality = p;
    } catch (e) { /* depolama kapalı olabilir */ }
  }

  function save() {
    try {
      localStorage.setItem('komsu.voice', V.enabled ? '1' : '0');
      localStorage.setItem('komsu.personality', V.personality);
    } catch (e) { /* yoksay */ }
  }

  function pickVoice() {
    if (!supported()) return;
    let voices = [];
    try { voices = speechSynthesis.getVoices() || []; } catch (e) { return; }
    if (!voices.length) return;
    const tr = voices.find(v => /^tr([-_]|$)/i.test(v.lang)) ||
      voices.find(v => /t[üu]rk|tolga|dilara|yeliz|ahmet/i.test(v.name)) ||
      voices.find(v => v.default) ||
      voices[0];
    V.voice = tr;
    if (tr && tr.lang) V.lang = tr.lang;
  }

  function init() {
    load();
    if (!supported()) return;
    pickVoice();
    try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* eski tarayıcı */ }
    // Bazı tarayıcılar ses listesini gecikmeli doldurur
    setTimeout(pickVoice, 300);
    setTimeout(pickVoice, 1200);
  }

  function speak(text, who) {
    if (!V.enabled || !supported() || !text) return;
    const clean = String(text).replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const t = (window.performance && performance.now) ? performance.now() : Date.now();
    if (clean === V.lastText && t - V.lastAt < 4500) return;
    V.lastText = clean;
    V.lastAt = t;

    const p = PRESETS[V.personality] || PRESETS.kuskuci;
    let pitch = p.pitch + (Math.random() - 0.5) * 0.06;
    let rate = p.rate + (Math.random() - 0.5) * 0.04;
    let volume = p.volume;
    if (who === 'ELİF') {
      pitch = 1.5;
      rate = 1.0;
      volume = 0.6;
    }

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = V.lang;
    if (V.voice) u.voice = V.voice;
    u.pitch = Math.max(0.1, Math.min(2, pitch));
    u.rate = Math.max(0.5, Math.min(1.8, rate));
    u.volume = Math.max(0.05, Math.min(1, volume));
    u.onstart = function () {
      V.current = u;
      V.speaking = true;
      if (window.SFX && SFX.duck) SFX.duck(true);
    };
    u.onend = u.onerror = function () {
      if (V.current !== u) return;
      V.current = null;
      V.speaking = false;
      if (window.SFX && SFX.duck) SFX.duck(false);
    };
    try {
      // Önceki sesi iptal ederken ana sesi de eski haline getir
      if (window.SFX && SFX.duck) SFX.duck(false);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* ses motoru yoksa sessiz devam */ }
  }

  function subtitle(speaker, line) {
    if (speaker !== 'KEMAL' && speaker !== 'ELİF') return;
    speak(line, speaker);
  }

  function stop() {
    if (!supported()) return;
    try { speechSynthesis.cancel(); } catch (e) { /* yoksay */ }
    V.current = null;
    V.speaking = false;
    if (window.SFX && SFX.duck) SFX.duck(false);
  }

  function setEnabled(v) {
    V.enabled = !!v;
    if (!V.enabled) stop();
    save();
  }

  function toggle() {
    setEnabled(!V.enabled);
    return V.enabled;
  }

  function setPersonality(id) {
    if (!PRESETS[id]) return;
    V.personality = id;
    save();
    const p = PRESETS[id];
    speak(id === 'ofkeli' ? 'Bu evden çık. Hemen.' : (id === 'suskun' ? '...kim var orada?' : 'Seni duydum.'), 'KEMAL');
    return p.label;
  }

  return {
    init, speak, subtitle, stop, setEnabled, toggle, setPersonality,
    presets: PRESETS,
    get enabled() { return V.enabled; },
    get personality() { return V.personality; },
    get label() { return (PRESETS[V.personality] || PRESETS.kuskuci).label; },
    get speaking() { return V.speaking; },
    get supported() { return supported(); }
  };
})();
