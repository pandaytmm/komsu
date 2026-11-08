/* Oyun çekirdeği: sahne, döngü, girdi ve modül bağlantıları */
(function () {
  const game = {
    renderer: null, scene: null, camera: null,
    started: false, active: false, lastT: 0,
    pointerLocked: false, prevNote: false, prevChoice: false, prevHidden: false,
    inside: false, lightningTimer: 14, difficulty: 'normal'
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    const canvasWrap = $('canvasWrap');

    const vw = Math.max(1, window.innerWidth || 1280);
    const vh = Math.max(1, window.innerHeight || 720);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(vw, vh);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    canvasWrap.appendChild(renderer.domElement);
    game.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b0e);
    scene.fog = new THREE.FogExp2(0x080d11, 0.021);
    game.scene = scene;

    const camera = new THREE.PerspectiveCamera(72, vw / vh, 0.07, 140);
    scene.add(camera);
    game.camera = camera;

    addStars(scene);
    WORLD.build(scene);
    UI.init();
    PLAYER.init(camera);
    AI.init(scene);
    STORY.init();
    VOICE.init();

    ctxUI();
    bindButtons();
    bindInput();
    onResize();

    PLAYER.update(0.016, false);
    renderer.render(scene, camera);

    setTimeout(() => UI.loading(false), 550);

    game.lastT = performance.now();
    requestAnimationFrame(loop);
  }

  function addStars(scene) {
    const count = 420;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 45 + Math.random() * 45;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 18 + Math.random() * 45;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x9db4cc, size: 0.16, transparent: true, opacity: 0.55, depthWrite: false });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
  }

  function ctxUI() {
    const noteClose = $('noteClose');
    noteClose.addEventListener('click', () => {
      if (!UI.choiceOpen && !STORY.ending) setTimeout(requestLock, 30);
    });
    $('endingRestart').addEventListener('click', () => location.reload());
    $('restartBtn').addEventListener('click', () => location.reload());
  }

  function bindButtons() {
    let chosenDiff = 'normal';
    document.querySelectorAll('.diffBtn').forEach(btn => {
      if (!btn.dataset.diff) return;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diffBtn[data-diff]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chosenDiff = btn.dataset.diff;
        game.difficulty = chosenDiff;
      });
    });

    document.querySelectorAll('.voiceBtn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.voice === VOICE.personality);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.voiceBtn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        VOICE.setPersonality(btn.dataset.voice);
      });
    });

    const vt = $('voiceToggle');
    if (vt) {
      const sync = () => {
        vt.textContent = VOICE.enabled ? 'AÇIK' : 'KAPALI';
        vt.classList.toggle('active', VOICE.enabled);
      };
      sync();
      vt.addEventListener('click', () => {
        const on = VOICE.toggle();
        sync();
        if (on) VOICE.speak('Seni duyuyorum.', 'KEMAL');
      });
    }

    $('startBtn').addEventListener('click', () => {
      SFX.init();
      SFX.resume();
      game.started = true;
      STORY.startGame(chosenDiff);
      requestLock();
      setTimeout(() => {
        UI.subtitle('SEN', 'Dört yıl sonra ilk kez bu bahçedeyim. Arka kapı açık.', 4.6);
      }, 1600);
    });

    $('resumeBtn').addEventListener('click', () => {
      UI.pause(false);
      requestLock();
    });

    $('canvasWrap').addEventListener('click', () => {
      if (game.started && !game.pointerLocked && !UI.blocking && !STORY.ending) requestLock();
    });

    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('pointerlockerror', () => {
      UI.toast('Fare kilidi açılamadı. Ekrana tekrar tıkla.');
    });
  }

  function requestLock() {
    const c = game.renderer && game.renderer.domElement;
    if (!c || !game.started) return;
    if (document.pointerLockElement === c) return;
    try {
      const p = c.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* tarayıcı jest bekliyor */ }
  }

  function onLockChange() {
    const c = game.renderer && game.renderer.domElement;
    game.pointerLocked = document.pointerLockElement === c;
    if (game.pointerLocked) {
      if (UI.paused) UI.pause(false);
      return;
    }
    if (game.started && !STORY.ending && !UI.blocking && !UI.caughtOpen) {
      UI.pause(true);
    }
  }

  function bindInput() {
    document.addEventListener('mousemove', e => {
      if (!game.pointerLocked) return;
      if (UI.blocking || !STORY.started) return;
      PLAYER.look(e.movementX || 0, e.movementY || 0);
    });

    window.addEventListener('keydown', e => {
      if (e.code === 'F2') {
        window.DEBUG = !window.DEBUG;
        UI.toast(window.DEBUG ? 'DEBUG açık' : 'DEBUG kapalı');
        if (window.DEBUG) UI.subtitle('DEBUG', '1 salon · 2 Elif · 3 bodrum · 4 kiler · 5 kanıt+sigorta · H Kemal', 5);
        return;
      }
      if (window.DEBUG) handleDebugKeys(e);

      if (e.code === 'Escape') {
        if (UI.noteOpen) {
          UI.closeNote();
          if (!UI.choiceOpen && !STORY.ending) setTimeout(requestLock, 30);
          return;
        }
        return;
      }

      if (!game.started || STORY.ending) return;

      if (e.code === 'KeyE') {
        if (UI.noteOpen) {
          UI.closeNote();
          if (!UI.choiceOpen) setTimeout(requestLock, 30);
          return;
        }
        if (UI.blocking) return;
        if (PLAYER.hidden) {
          PLAYER.exitCloset();
          UI.hiding(false);
          return;
        }
        const f = PLAYER.focus;
        if (!f) return;
        if (f.id.startsWith('closet_')) {
          PLAYER.enterCloset(f.id.slice(7));
          UI.hiding(true);
          UI.toast('Saklandın. Kemal geçene kadar bekle.');
          return;
        }
        STORY.interact(f);
        if (UI.noteOpen) document.exitPointerLock();
        return;
      }

      if (UI.blocking) return;

      if (e.code === 'KeyF') {
        PLAYER.toggleFlashlight();
      } else if (e.code === 'KeyG') {
        if (PLAYER.throwBottle()) UI.toast('Şişe atıldı.');
      } else if (e.code === 'KeyV') {
        const on = VOICE.toggle();
        UI.toast(on ? 'Konuşma açık — Kemal seni duyuyor.' : 'Konuşma kapalı.');
        if (on) VOICE.speak('Seni duyuyorum.', 'KEMAL');
      }
    });
  }

  function handleDebugKeys(e) {
    if (e.code === 'Digit1') PLAYER.setPosition(-7, 0, 6, Math.PI);
    else if (e.code === 'Digit2') PLAYER.setPosition(-6, 3.4, 6, Math.PI);
    else if (e.code === 'Digit3') PLAYER.setPosition(0, -3.2, -12, Math.PI);
    else if (e.code === 'Digit4') PLAYER.setPosition(8, 0, -5, 0);
    else if (e.code === 'Digit5') {
      STORY.state.evidence = ['photo', 'diary', 'letter'];
      STORY.state.fuses = ['shed', 'bath', 'bedroom'];
      UI.setEvidence(STORY.state.evidence);
      UI.setFuses(STORY.state.fuses, true);
      UI.toast('DEBUG: kanıt ve sigortalar verildi');
    }
  }

  function onResize() {
    if (!game.renderer) return;
    const vw = Math.max(1, window.innerWidth || 1280);
    const vh = Math.max(1, window.innerHeight || 720);
    game.renderer.setSize(vw, vh);
    game.camera.aspect = vw / vh;
    game.camera.updateProjectionMatrix();
  }

  function lightning(dt) {
    game.lightningTimer -= dt;
    if (game.lightningTimer > 0) return;
    game.lightningTimer = 18 + Math.random() * 26;
    UI.flash(0.55 + Math.random() * 0.3);
    if (WORLD.moon) {
      WORLD.moon.intensity = 1.5;
      setTimeout(() => { if (WORLD.moon) WORLD.moon.intensity = 0.5; }, 180);
    }
    setTimeout(() => SFX.thunder(), 300 + Math.random() * 900);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - game.lastT) / 1000;
    game.lastT = now;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    dt = Math.min(dt, 0.05);
    const t = now / 1000;

    const active = game.started && !STORY.ending && game.pointerLocked && !UI.blocking;

    game.active = active;

    PLAYER.update(dt, active);
    AI.update(dt, active && STORY.chapter >= 2 && !STORY.ending);
    STORY.update(dt, active);
    WORLD.update(dt, t);
    UI.update(dt);

    if (STORY.started || game.started) {
      UI.setStamina(PLAYER.stamina);
      UI.setSuspicion(AI.danger, AI.chasing);
    }

    if (active && PLAYER.focus && !PLAYER.hidden) UI.setPrompt(PLAYER.focus.prompt);
    else UI.setPrompt(null);

    const insideNow = WORLD.isInside(PLAYER.pos.x, PLAYER.pos.z) || WORLD.isInBasement(PLAYER.pos.x, PLAYER.pos.z, PLAYER.pos.y);
    if (insideNow !== game.inside) {
      game.inside = insideNow;
      SFX.setInside(insideNow);
      WORLD.setRainVisible(true);
    }

    if (PLAYER.hidden !== game.prevHidden) {
      game.prevHidden = PLAYER.hidden;
      UI.hiding(PLAYER.hidden);
    }

    if (UI.noteOpen !== game.prevNote) {
      game.prevNote = UI.noteOpen;
      if (UI.noteOpen) {
        if (document.pointerLockElement) document.exitPointerLock();
      }
    }
    if (UI.choiceOpen !== game.prevChoice) {
      game.prevChoice = UI.choiceOpen;
      if (UI.choiceOpen && document.pointerLockElement) document.exitPointerLock();
    }

    if (game.started && !STORY.ending) lightning(dt);

    SFX.update(dt, AI.danger, AI.chasing);
    game.renderer.render(game.scene, game.camera);
  }

  window.GAME = game;
  window.addEventListener('load', init);
})();
