/* Arayüz katmanı: HUD, altyazı, notlar, seçim ve finaller */
window.UI = (function () {
  const el = {};
  let subtitleTimer = 0, toastTimer = 0, bannerTimer = 0, flashTimer = 0;
  let noteOpen = false, paused = false, caughtOpen = false, endingOpen = false, choiceOpen = false;
  let settingsOpen = false;
  let choiceHandlers = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    ['hud', 'chapterLabel', 'objective', 'itemList', 'evidenceCount', 'evidencePanel',
      'fusePanel', 'fuseCount', 'bottleCount', 'suspicion', 'suspicionBar', 'suspicionText',
      'crosshair', 'prompt', 'subtitle', 'speaker', 'line', 'staminaBar', 'chapterBanner',
      'cbTitle', 'cbSub', 'toast', 'hidingOverlay', 'dangerVignette', 'flash',
      'startScreen', 'pauseScreen', 'noteScreen', 'noteTitle', 'noteBody', 'noteClose',
      'choiceScreen', 'choiceTitle', 'choiceText', 'choiceALabel', 'choiceADesc',
      'choiceBLabel', 'choiceBDesc', 'choiceA', 'choiceB',
      'caughtScreen', 'caughtLine', 'endingScreen', 'endingKicker', 'endingTitle',
      'endingText', 'endingStats', 'endingRestart', 'loadingScreen', 'startBtn',
      'resumeBtn', 'restartBtn', 'proximity', 'settingsScreen'].forEach(id => { el[id] = $(id); });
    el.suspicionFill = el.suspicionBar.querySelector('i');
    el.staminaFill = el.staminaBar;
    el.caughtFill = document.querySelector('#caughtScreen .caughtBar i');
    el.evIcons = Array.from(document.querySelectorAll('.evIcon'));
    el.fuseIcons = Array.from(document.querySelectorAll('.fuseIcon'));

    el.noteClose.addEventListener('click', () => closeNote());
    el.choiceA.addEventListener('click', () => { if (choiceHandlers) choiceHandlers.a(); });
    el.choiceB.addEventListener('click', () => { if (choiceHandlers) choiceHandlers.b(); });
    return el;
  }

  function showHUD(v) { el.hud.classList.toggle('hidden', !v); }

  function chapter(label, title, sub) {
    el.chapterLabel.textContent = label;
    el.cbTitle.textContent = title || '';
    el.cbSub.textContent = sub || '';
    el.chapterBanner.classList.add('show');
    bannerTimer = 4.6;
  }

  function objective(text) { el.objective.textContent = text || ''; }

  function setItems(items) {
    el.itemList.innerHTML = items.map(it =>
      `<div class="item${it.done ? ' done' : ''}">${it.text}</div>`).join('');
  }

  function setEvidence(found, total = 3) {
    el.evIcons.forEach(ic => ic.classList.toggle('found', found.includes(ic.dataset.ev)));
    el.evidenceCount.textContent = found.length + '/' + total;
  }

  function setFuses(found, show = true, total = 3) {
    el.fusePanel.classList.toggle('hidden', !show);
    el.fuseIcons.forEach(ic => ic.classList.toggle('found', found.includes(ic.dataset.fuse)));
    el.fuseCount.textContent = found.length + '/' + total;
  }

  function setBottles(n) { el.bottleCount.textContent = String(n); }

  function setPrompt(text) {
    if (!text) {
      el.prompt.classList.remove('show');
      el.crosshair.classList.remove('active');
      return;
    }
    el.prompt.innerHTML = `<b>E</b> ${text}`;
    el.prompt.classList.add('show');
    el.crosshair.classList.add('active');
  }

  function setStamina(p) {
    el.staminaFill.style.width = U.clamp(p, 0, 100) + '%';
    el.staminaFill.style.background = p < 25 ? 'var(--blood)' : 'rgba(233,227,213,.75)';
  }

  function setSuspicion(v, chasing) {
    if (v <= 0.02 && !chasing) {
      el.suspicion.classList.remove('show');
      return;
    }
    el.suspicion.classList.add('show');
    el.suspicionFill.style.width = Math.round(v * 100) + '%';
    el.suspicionText.textContent = chasing ? 'KOVALIYOR' : (v > 0.62 ? 'SENİ GÖRÜYOR' : 'ŞÜPHELENİYOR');
  }

  function setProximity(v) {
    if (!el.proximity) return;
    el.proximity.style.opacity = String(U.clamp(v, 0, 1));
  }

  function settings(v) {
    el.settingsScreen.classList.toggle('show', v);
    settingsOpen = v;
  }

  function dangerFlash() {
    el.dangerVignette.classList.add('on');
    clearTimeout(el.dangerVignette._t);
    el.dangerVignette._t = setTimeout(() => el.dangerVignette.classList.remove('on'), 900);
  }

  function flash(strength = 0.8) {
    el.flash.style.transition = 'none';
    el.flash.style.opacity = String(strength);
    flashTimer = 0.18;
  }

  function subtitle(speaker, line, dur = 3.4) {
    el.speaker.textContent = speaker || '';
    el.line.textContent = line || '';
    el.subtitle.classList.add('show');
    subtitleTimer = dur;
    if (window.VOICE) VOICE.subtitle(speaker, line);
  }

  function toast(text, dur = 2.6) {
    el.toast.textContent = text;
    el.toast.classList.add('show');
    toastTimer = dur;
  }

  function note(title, body) {
    el.noteTitle.textContent = title;
    el.noteBody.innerHTML = body;
    el.noteScreen.classList.add('show');
    noteOpen = true;
  }

  function closeNote() {
    el.noteScreen.classList.remove('show');
    noteOpen = false;
  }

  function choice(title, text, a, b, onA, onB) {
    el.choiceTitle.textContent = title;
    el.choiceText.textContent = text;
    el.choiceALabel.textContent = a.label;
    el.choiceADesc.textContent = a.desc;
    el.choiceBLabel.textContent = b.label;
    el.choiceBDesc.textContent = b.desc;
    choiceHandlers = { a: onA, b: onB };
    el.choiceScreen.classList.add('show');
    choiceOpen = true;
  }

  function hideChoice() {
    el.choiceScreen.classList.remove('show');
    choiceOpen = false;
    choiceHandlers = null;
  }

  function caught(line) {
    el.caughtLine.textContent = line;
    el.caughtScreen.classList.add('show');
    caughtOpen = true;
    setProximity(0);
    if (window.VOICE) VOICE.speak(line, 'KEMAL');
    if (el.caughtFill) {
      el.caughtFill.style.transition = 'none';
      el.caughtFill.style.width = '0%';
      requestAnimationFrame(() => {
        el.caughtFill.style.transition = 'width 2.8s linear';
        el.caughtFill.style.width = '100%';
      });
    }
  }

  function hideCaught() {
    el.caughtScreen.classList.remove('show');
    caughtOpen = false;
  }

  function ending(data) {
    if (window.VOICE) VOICE.stop();
    setProximity(0);
    el.endingKicker.textContent = data.kicker || 'SON';
    el.endingTitle.textContent = data.title;
    el.endingText.innerHTML = data.text;
    el.endingStats.innerHTML = (data.stats || []).map(s => `<span>${s.label} <b>${s.value}</b></span>`).join('');
    el.endingScreen.classList.add('show');
    endingOpen = true;
  }

  function hideEnding() {
    el.endingScreen.classList.remove('show');
    endingOpen = false;
  }

  function pause(v) {
    paused = v;
    el.pauseScreen.classList.toggle('show', v);
    if (v && window.VOICE) VOICE.stop();
  }

  function hiding(v) {
    el.hidingOverlay.classList.toggle('show', v);
  }

  function start(v) {
    el.startScreen.classList.toggle('show', v);
  }

  function loading(v) {
    el.loadingScreen.classList.toggle('hidden', !v);
  }

  function update(dt) {
    if (subtitleTimer > 0) {
      subtitleTimer -= dt;
      if (subtitleTimer <= 0) el.subtitle.classList.remove('show');
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) el.toast.classList.remove('show');
    }
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) el.chapterBanner.classList.remove('show');
    }
    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        el.flash.style.transition = 'opacity .35s';
        el.flash.style.opacity = '0';
      }
    }
  }

  return {
    init, update, showHUD, chapter, objective, setItems, setEvidence, setFuses,
    setBottles, setPrompt, setStamina, setSuspicion, setProximity, dangerFlash, flash,
    subtitle, toast, note, closeNote, choice, hideChoice, caught, hideCaught,
    ending, hideEnding, pause, hiding, start, loading, settings,
    get noteOpen() { return noteOpen; },
    get paused() { return paused; },
    get caughtOpen() { return caughtOpen; },
    get endingOpen() { return endingOpen; },
    get choiceOpen() { return choiceOpen; },
    get settingsOpen() { return settingsOpen; },
    get blocking() { return noteOpen || paused || caughtOpen || endingOpen || choiceOpen; }
  };
})();
