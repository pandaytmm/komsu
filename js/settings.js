/* Kalıcı oyun ayarları: fare, ses, grafik ve film greni */
window.SETTINGS = (function () {
  const KEY = 'komsu.settings.v1';
  const DEFAULTS = { sens: 1, volume: 0.62, quality: 'high', grain: true };
  const S = Object.assign({}, DEFAULTS);
  const listeners = { volume: [], quality: [], grain: [] };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.sens === 'number') S.sens = U.clamp(data.sens, 0.3, 2.2);
      if (typeof data.volume === 'number') S.volume = U.clamp(data.volume, 0, 1);
      if (data.quality === 'low' || data.quality === 'medium' || data.quality === 'high') S.quality = data.quality;
      if (typeof data.grain === 'boolean') S.grain = data.grain;
    } catch (e) { /* bozuk kayıt: varsayılanlar */ }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  }

  function emit(kind) {
    (listeners[kind] || []).forEach(fn => { try { fn(S[kind]); } catch (e) { } });
  }

  function init() {
    load();
    document.body.classList.toggle('no-grain', !S.grain);
    return S;
  }

  function setSens(v) {
    S.sens = U.clamp(Number(v) || 1, 0.3, 2.2);
    save();
    return S.sens;
  }

  function setVolume(v) {
    S.volume = U.clamp(Number(v) || 0, 0, 1);
    save();
    emit('volume');
    return S.volume;
  }

  function setQuality(q) {
    if (q !== 'low' && q !== 'medium' && q !== 'high') return S.quality;
    S.quality = q;
    save();
    emit('quality');
    return q;
  }

  function setGrain(on) {
    S.grain = !!on;
    document.body.classList.toggle('no-grain', !S.grain);
    save();
    emit('grain');
    return S.grain;
  }

  return {
    init, setSens, setVolume, setQuality, setGrain,
    onChange(kind, fn) { if (listeners[kind]) listeners[kind].push(fn); },
    get sens() { return S.sens; },
    get volume() { return S.volume; },
    get quality() { return S.quality; },
    get grain() { return S.grain; }
  };
})();
