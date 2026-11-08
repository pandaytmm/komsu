/* Ortak yardımcılar, prosedürel dokular ve malzemeler */
window.U = (function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const dist2 = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);

  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function grain(ctx, w, h, amount, dark = true) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * 0.09;
      ctx.fillStyle = (dark && Math.random() < 0.6) ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.7})`;
      const s = Math.random() * 2 + 0.5;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }

  /* ---- dokular ---- */
  const tex = {};

  tex.woodFloor = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6a4a30'; ctx.fillRect(0, 0, w, h);
    const plankH = 64;
    for (let y = 0; y < h; y += plankH) {
      const shade = 0.82 + Math.random() * 0.3;
      ctx.fillStyle = `rgb(${106 * shade | 0},${74 * shade | 0},${48 * shade | 0})`;
      ctx.fillRect(0, y + 2, w, plankH - 4);
      // tahta araları
      ctx.fillStyle = 'rgba(20,12,7,.55)';
      ctx.fillRect(0, y, w, 2);
      // damar
      for (let g = 0; g < 12; g++) {
        ctx.strokeStyle = `rgba(40,24,12,${0.05 + Math.random() * 0.1})`;
        ctx.lineWidth = 0.6 + Math.random();
        ctx.beginPath();
        const gy = y + Math.random() * plankH;
        ctx.moveTo(0, gy);
        for (let x = 0; x < w; x += 32) ctx.lineTo(x, gy + Math.sin(x * 0.05 + g) * 2);
        ctx.stroke();
      }
      // çivi
      ctx.fillStyle = 'rgba(25,18,12,.6)';
      ctx.fillRect(20 + Math.random() * 20, y + 8, 2, 2);
      ctx.fillRect(w - 30 - Math.random() * 20, y + plankH - 12, 2, 2);
    }
    grain(ctx, w, h, 900);
  });

  tex.siding = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#55606a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 40) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.04})`;
      ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = 'rgba(5,9,12,.5)';
      ctx.fillRect(0, y + 37, w, 3);
      ctx.fillStyle = `rgba(15,24,30,${0.03 + Math.random() * 0.09})`;
      ctx.fillRect(0, y + 4, w, 30);
    }
    grain(ctx, w, h, 1400);
    // eski boya dökülmeleri
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = 'rgba(90,86,74,.12)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, Math.random() * 24 + 4, Math.random() * 5 + 2, 0, 0, 7);
      ctx.fill();
    }
  });

  tex.grass = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1d2518'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const g = 24 + Math.random() * 32;
      ctx.strokeStyle = `rgba(${g * 0.7 | 0},${g | 0},${g * 0.55 | 0},${0.3 + Math.random() * 0.5})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const x = Math.random() * w, y = Math.random() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 3 - Math.random() * 6);
      ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = 'rgba(52,42,25,.16)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, Math.random() * 40 + 10, Math.random() * 30 + 8, 0, 0, 7);
      ctx.fill();
    }
  }, 20, 20);

  tex.brick = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#493630'; ctx.fillRect(0, 0, w, h);
    const bw = 64, bh = 32;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const v = 0.75 + Math.random() * 0.4;
        ctx.fillStyle = `rgb(${78 * v | 0},${52 * v | 0},${44 * v | 0})`;
        ctx.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
        ctx.fillStyle = 'rgba(20,14,12,.25)';
        ctx.fillRect(x + off + 2, y + 2, bw - 4, 2);
      }
    }
    grain(ctx, w, h, 1600);
  }, 4, 2);

  tex.carpet = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a2b24'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,83,54,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 16 + i * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(28,16,12,.5)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      const a = (i / 12) * Math.PI * 2;
      ctx.lineTo(w / 2 + Math.cos(a) * 120, h / 2 + Math.sin(a) * 120);
      ctx.stroke();
    }
    grain(ctx, w, h, 1800);
  }, 1, 1);

  tex.photo = canvasTex(256, 200, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8f9a8f'); g.addColorStop(1, '#d5cba9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // bahçe
    ctx.fillStyle = '#5d6a4b'; ctx.fillRect(0, h * 0.62, w, h * 0.38);
    ctx.fillStyle = '#7b8763'; ctx.fillRect(0, h * 0.62, w, 6);
    // ağaç
    ctx.fillStyle = '#3a4230';
    ctx.fillRect(28, 40, 8, 90);
    ctx.beginPath(); ctx.arc(34, 38, 30, 0, 7); ctx.fill();
    // insanlar
    function person(x, y, s, color, head) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 52 * s); ctx.lineTo(x - 7 * s, y + 16 * s);
      ctx.lineTo(x + 7 * s, y + 16 * s); ctx.lineTo(x + 10 * s, y + 52 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = head;
      ctx.beginPath(); ctx.arc(x, y + 6 * s, 9 * s, 0, 7); ctx.fill();
    }
    person(80, 86, 1.15, '#3c3a35', '#b99a7c');
    person(140, 96, 1.02, '#6a4a3c', '#c4a282');
    person(180, 118, 0.6, '#a3793f', '#c9a886');
    // sepya
    ctx.fillStyle = 'rgba(96,66,32,.16)'; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 500);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = 'rgba(60,40,20,.55)'; ctx.font = 'italic 13px Georgia'; ctx.fillText('Elif — 9 yaş', 16, h - 14);
  });

  tex.poster = canvasTex(256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#c9bfa4'; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 1200);
    ctx.fillStyle = '#2a241c'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center';
    ctx.fillText('KAYIP', w / 2, 58);
    ctx.font = 'bold 15px Arial'; ctx.letterSpacing = '2px';
    ctx.fillText('ELİF K.', w / 2, 86);
    ctx.fillStyle = '#8e8570'; ctx.fillRect(24, 104, w - 48, 176);
    ctx.fillStyle = '#6b6352';
    ctx.beginPath(); ctx.arc(w / 2, 168, 42, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w / 2, 254, 56, 34, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a241c'; ctx.font = '12px Arial';
    ctx.fillText('11 YAŞINDA · KAHVERENGİ SAÇLI', w / 2, 304);
    ctx.font = '11px Arial'; ctx.fillText('SON GÖRÜLME: 14 EKİM, MAHALLE PARKI', w / 2, 326);
    ctx.font = 'bold 16px Arial'; ctx.fillText('BİLEN VARSA: 0 555 014 11', w / 2, 358);
    ctx.strokeStyle = 'rgba(40,30,20,.4)'; ctx.lineWidth = 3; ctx.strokeRect(5, 5, w - 10, h - 10);
  });

  tex.drawing = canvasTex(256, 200, (ctx, w, h) => {
    ctx.fillStyle = '#d9d2bb'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a6d9b'; ctx.lineWidth = 3; // ev
    ctx.strokeRect(80, 92, 96, 70);
    ctx.beginPath(); ctx.moveTo(68, 94); ctx.lineTo(128, 48); ctx.lineTo(188, 94); ctx.stroke();
    ctx.strokeStyle = '#b8862e'; // güneş
    ctx.beginPath(); ctx.arc(206, 40, 18, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(206 + Math.cos(a) * 24, 40 + Math.sin(a) * 24);
      ctx.lineTo(206 + Math.cos(a) * 33, 40 + Math.sin(a) * 33); ctx.stroke();
    }
    // çöp adamlar
    ctx.strokeStyle = '#3e3e34'; ctx.lineWidth = 2;
    function stick(x, y, s) {
      ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 6 * s); ctx.lineTo(x, y + 26 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 16 * s); ctx.lineTo(x + 10 * s, y + 16 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 26 * s); ctx.lineTo(x - 8 * s, y + 40 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 26 * s); ctx.lineTo(x + 8 * s, y + 40 * s); ctx.stroke();
    }
    stick(42, 120, 1); stick(128, 78, 0.7); stick(226, 126, 1);
    ctx.fillStyle = '#7b3a2a'; ctx.font = 'italic 14px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('benim evim  ♥', w / 2, h - 12);
  });

  tex.paperNote = canvasTex(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#cfc6ac'; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 900);
    ctx.fillStyle = '#4a4030'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('B U R A D A N   G İ T', w / 2, 52);
    ctx.fillStyle = 'rgba(60,52,38,.6)';
    for (let i = 0; i < 6; i++) ctx.fillRect(38, 92 + i * 22, 180, 2);
    ctx.fillStyle = '#7a3026'; ctx.font = 'italic 34px Georgia';
    ctx.fillText('HAYIR', w / 2, 250);
  });

  tex.tape = canvasTex(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#2a2a2c'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9bda0'; ctx.fillRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#2a2a2c'; ctx.fillRect(28, 28, w - 56, 32);
    ctx.fillStyle = '#8f3a2a'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText("ELİF — KASET 4", w / 2, 48);
    ctx.fillStyle = '#3a3630';
    ctx.beginPath(); ctx.arc(72, 108, 24, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(184, 108, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9bda0';
    ctx.beginPath(); ctx.arc(72, 108, 12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(184, 108, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a4a36'; ctx.font = 'italic 11px Georgia';
    ctx.fillText('“baba, dinle”', w / 2, 142);
  });

  tex.radioFace = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a3428'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b6a072'; ctx.fillRect(14, 14, w - 82, 70);
    ctx.fillStyle = '#5b5540';
    for (let i = 0; i < 9; i++) ctx.fillRect(24 + i * 16, 92, 3, 22);
    ctx.fillStyle = '#1b1914';
    ctx.beginPath(); ctx.arc(w - 42, 50, 24, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a7a55'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w - 42, 50); ctx.lineTo(w - 24, 30); ctx.stroke();
  });

  /* ---- malzemeler ---- */
  const mats = {};
  function mat(color, opts = {}) {
    const key = color + '|' + (opts.rough ?? 0.9) + '|' + (opts.metal ?? 0) + '|' + (opts.emissive ?? 0) + '|' + (opts.mapKey || '');
    if (mats[key]) return mats[key];
    const m = new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.9, metalness: opts.metal ?? 0,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      side: opts.side || THREE.FrontSide
    });
    if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 1; }
    if (opts.map) m.map = opts.map;
    mats[key] = m;
    return m;
  }

  function textured(texture, opts = {}) {
    return new THREE.MeshStandardMaterial({
      map: texture, roughness: opts.rough ?? 0.92, metalness: opts.metal ?? 0,
      color: opts.color ?? 0xffffff, side: opts.side || THREE.FrontSide
    });
  }

  function box(w, h, d, material, shadows = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  }

  function plane(w, h, material) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    m.receiveShadow = true;
    return m;
  }

  function cyl(rt, rb, h, seg, material, shadows = true) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  }

  function sph(r, material, shadows = true) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  }

  return { clamp, lerp, smooth, rand, pick, dist2, canvasTex, tex, mat, textured, box, plane, cyl, sph };
})();
