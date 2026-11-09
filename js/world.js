/* Dünya: ev, bahçe, bodrum, eşyalar, ışık ve çarpışmalar */
window.WORLD = (function () {
  const WORLD = {
    group: null, colliders: [], occluders: [], interactables: [],
    doors: {}, lights: {}, practicalLights: [], windowLights: [], glows: [],
    closets: {}, shotState: false, powerOn: false, dust: null, rain: null,
    moon: null, time: 0, lightningTimer: 16,
    fuseMeshes: {}, baseLightIntensity: {}
  };

  const M = {};

  function initMaterials() {
    M.siding = U.textured(U.tex.siding, { rough: 0.96 });
    M.woodFloor = U.textured(U.tex.woodFloor, { rough: 0.86 });
    M.upFloor = U.textured(U.tex.woodFloor, { rough: 0.9, color: 0xbfb4a5 });
    M.grass = U.textured(U.tex.grass, { rough: 1 });
    M.brick = U.textured(U.tex.brick, { rough: 0.98 });
    M.roof = U.mat(0x1d2023, { rough: 0.95 });
    M.ceiling = U.mat(0x8e897e, { rough: 0.98 });
    M.ceilingDark = U.mat(0x4f4a43, { rough: 1 });
    M.trim = U.mat(0x3a2e22, { rough: 0.85 });
    M.door = U.mat(0x4a3321, { rough: 0.82 });
    M.doorDark = U.mat(0x2f2318, { rough: 0.85 });
    M.metal = U.mat(0x5a6169, { rough: 0.45, metal: 0.75 });
    M.metalDark = U.mat(0x2c3137, { rough: 0.5, metal: 0.6 });
    M.brass = U.mat(0xb08a4a, { rough: 0.4, metal: 0.75 });
    M.fabricDark = U.mat(0x2d3036, { rough: 1 });
    M.fabricBrown = U.mat(0x5b4a38, { rough: 1 });
    M.fabricRed = U.mat(0x5b2c25, { rough: 1 });
    M.fabricGreen = U.mat(0x3c4a3d, { rough: 1 });
    M.sheet = new THREE.MeshStandardMaterial({ color: 0xcfc9bb, roughness: 1, transparent: true, opacity: 0.72 });
    M.plastic = new THREE.MeshStandardMaterial({ color: 0xbfc4c2, roughness: 0.9, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    M.glow = U.mat(0xffffff, { emissive: 0xffe2a8, emissiveIntensity: 1.2, rough: 1 });
    M.glowBlue = U.mat(0xffffff, { emissive: 0x9fc1e8, emissiveIntensity: 0.55, rough: 1 });
    M.bulbOff = U.mat(0x2a2620, { rough: 1 });
    M.invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    M.screen = U.mat(0x0a0d10, { rough: 0.25, metal: 0.2 });

    M.wallHall = U.mat(0x8b8378, { rough: 0.97 });
    M.wallLiving = U.mat(0x7d7462, { rough: 0.97 });
    M.wallKitchen = U.mat(0x878878, { rough: 0.97 });
    M.wallUtility = U.mat(0x76756c, { rough: 0.97 });
    M.wallStudy = U.mat(0x746552, { rough: 0.97 });
    M.wallUp = U.mat(0x8b8476, { rough: 0.97 });
    M.wallElif = U.mat(0x8f7f74, { rough: 0.97 });
    M.wallBath = U.mat(0x79868a, { rough: 0.96 });
    M.basementWall = U.textured(U.tex.brick, { rough: 0.98, color: 0xb9a59a });
  }

  function initTextures() {
    U.tex.woodFloor.repeat.set(9, 8);
    U.tex.siding.repeat.set(12, 4);
    U.tex.brick.repeat.set(8, 5);
    U.tex.grass.repeat.set(22, 22);
    U.tex.carpet.repeat.set(1, 1);
  }

  /* ---------- yardımcılar ---------- */
  function addCollider(cx, cy, cz, halfX, halfY, halfZ) {
    const c = {
      minX: cx - halfX, maxX: cx + halfX,
      minY: cy - halfY, maxY: cy + halfY,
      minZ: cz - halfZ, maxZ: cz + halfZ, off: false
    };
    WORLD.colliders.push(c);
    return c;
  }

  function solid(w, h, d, x, yBottom, z, material, opts = {}) {
    const m = U.box(w, h, d, material, opts.shadow !== false);
    m.position.set(x, yBottom + h / 2, z);
    m.userData.wall = !!opts.wall;
    WORLD.group.add(m);
    if (opts.collide) addCollider(x, yBottom + h / 2, z, w / 2, h / 2, d / 2);
    if (opts.occlude) WORLD.occluders.push(m);
    return m;
  }

  function slab(x1, x2, z1, z2, yTop, matTop, matBottom, thickness = 0.2) {
    const w = x2 - x1, d = z2 - z1;
    const mats = [M.trim, M.trim, matTop, matBottom, M.trim, M.trim];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mats);
    m.position.set((x1 + x2) / 2, yTop - thickness / 2, (z1 + z2) / 2);
    m.receiveShadow = true; m.castShadow = false;
    WORLD.group.add(m);
    WORLD.occluders.push(m);
    return m;
  }

  function wallX(x, z1, z2, y0, height, material, opts = {}) {
    const t = opts.thickness ?? 0.24;
    return solid(t, height, Math.abs(z2 - z1), x, y0, (z1 + z2) / 2, material,
      { collide: true, occlude: true, wall: true, shadow: true });
  }
  function wallZ(z, x1, x2, y0, height, material, opts = {}) {
    const t = opts.thickness ?? 0.24;
    return solid(Math.abs(x2 - x1), height, t, (x1 + x2) / 2, y0, z, material,
      { collide: true, occlude: true, wall: true, shadow: true });
  }

  function doorFrameX(x, z, width = 1.8, height = 2.2, mat = M.trim) {
    const g = new THREE.Group();
    const postW = 0.09;
    const side = U.box(0.12, height + 0.12, postW, mat);
    side.position.set(x, height / 2, z - width / 2); g.add(side);
    const side2 = side.clone(); side2.position.z = z + width / 2; g.add(side2);
    const top = U.box(0.12, postW, width + postW, mat);
    top.position.set(x, height + 0.06, z); g.add(top);
    WORLD.group.add(g);
  }
  function doorFrameZ(z, x, width = 1.8, height = 2.2, mat = M.trim) {
    const g = new THREE.Group();
    const postW = 0.09;
    const side = U.box(postW, height + 0.12, 0.12, mat);
    side.position.set(x - width / 2, height / 2, z); g.add(side);
    const side2 = side.clone(); side2.position.x = x + width / 2; g.add(side2);
    const top = U.box(width + postW, postW, 0.12, mat);
    top.position.set(x, height + 0.06, z); g.add(top);
    WORLD.group.add(g);
  }

  function windowAt(x, y, z, rotY, w = 1.3, h = 1.4, boarded = false) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = rotY;
    const frameMat = M.trim;
    const fw = 0.09;
    const top = U.box(w, fw, 0.1, frameMat); top.position.y = h / 2; g.add(top);
    const bot = top.clone(); bot.position.y = -h / 2; g.add(bot);
    const left = U.box(fw, h, 0.1, frameMat); left.position.x = -w / 2; g.add(left);
    const right = left.clone(); right.position.x = w / 2; g.add(right);
    const crossV = U.box(0.05, h, 0.06, frameMat); g.add(crossV);
    const crossH = U.box(w, 0.05, 0.06, frameMat); g.add(crossH);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12), M.glowBlue);
    glass.position.z = -0.01; g.add(glass);
    const halo = U.glowSprite(0x9fc1e8, w * 1.55, 0.12);
    halo.position.z = -0.03; g.add(halo);
    if (boarded) {
      for (let i = 0; i < 3; i++) {
        const p = U.box(w + 0.3, 0.16, 0.05, M.woodPlank || U.mat(0x5c4a35));
        p.position.y = -h / 2 + 0.25 + i * (h / 3.2);
        p.rotation.z = (i % 2 ? 1 : -1) * 0.06;
        g.add(p);
      }
    }
    WORLD.group.add(g);
    return g;
  }

  function rug(x, z, w, d, mat, y = 0.012) {
    const m = U.plane(w, d, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    WORLD.group.add(m);
  }

  function hitbox(x, y, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.invisible);
    m.position.set(x, y, z);
    WORLD.group.add(m);
    return m;
  }

  const rainOutside = (x, z) => !(x > -12.6 && x < 12.6 && z > -9.6 && z < 10.6);

  function addInteractable(id, mesh, prompt, range = 2.6) {
    const item = { id, mesh, prompt, range, used: false, enabled: true };
    WORLD.interactables.push(item);
    return item;
  }

  /* ---------- mobilya ---------- */
  function sofa(x, z, w, colorMat, facing = -1) {
    const g = new THREE.Group();
    const base = U.box(w, 0.36, 1.05, colorMat); base.position.set(0, 0.38, 0); g.add(base);
    const back = U.box(w, 0.75, 0.24, colorMat); back.position.set(0, 0.86, -facing * 0.42); g.add(back);
    const armL = U.box(0.2, 0.58, 1.0, colorMat); armL.position.set(-w / 2 + 0.1, 0.58, 0); g.add(armL);
    const armR = armL.clone(); armR.position.x = w / 2 - 0.1; g.add(armR);
    for (let i = 0; i < 3; i++) {
      const c = U.box(w / 3 - 0.08, 0.14, 0.85, colorMat);
      c.position.set(-w / 3 + i * w / 3, 0.61, facing * 0.06); g.add(c);
    }
    g.position.set(x, 0, z); WORLD.group.add(g);
    addCollider(x, 0.5, z, w / 2, 0.5, 0.55);
    WORLD.occluders.push(base);
    return g;
  }

  function bed(x, z, w, d, blanketMat, sheeted = false, baseY = 0) {
    const g = new THREE.Group();
    const base = U.box(w, 0.32, d, M.trim); base.position.y = 0.22; g.add(base);
    const mat = U.box(w - 0.14, 0.2, d - 0.14, M.sheet); mat.position.y = 0.48; g.add(mat);
    const blanket = U.box(w - 0.1, 0.1, d * 0.62, blanketMat);
    blanket.position.set(0, 0.58, d * 0.16); g.add(blanket);
    const pillow = U.box(w * 0.62, 0.14, 0.38, M.sheet);
    pillow.position.set(0, 0.62, -d / 2 + 0.32); g.add(pillow);
    const head = U.box(w, 0.85, 0.1, M.trim); head.position.set(0, 0.5, -d / 2 - 0.02); g.add(head);
    if (sheeted) {
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, d + 0.2), M.plastic);
      cover.rotation.x = -Math.PI / 2; cover.position.y = 0.7; g.add(cover);
    }
    g.position.set(x, baseY, z); WORLD.group.add(g);
    addCollider(x, baseY + 0.4, z, w / 2, 0.4, d / 2);
    WORLD.occluders.push(base);
    return g;
  }

  function wardrobe(x, z, baseY = 0) {
    const g = new THREE.Group();
    const body = U.box(0.65, 2.15, 1.15, U.mat(0x3e2e21, { rough: 0.85 }));
    body.position.y = 1.075; g.add(body);
    const door = U.box(0.04, 1.95, 0.5, U.mat(0x4b392a, { rough: 0.8 }));
    door.position.set(0.34, 1.1, -0.26); g.add(door);
    const door2 = door.clone(); door2.position.z = 0.26; g.add(door2);
    const knob = U.sph(0.035, M.brass); knob.position.set(0.37, 1.1, -0.05); g.add(knob);
    const knob2 = knob.clone(); knob2.position.z = 0.05; g.add(knob2);
    const top = U.box(0.7, 0.08, 1.2, M.trim); top.position.y = 2.19; g.add(top);
    g.position.set(x, baseY, z);
    WORLD.group.add(g);
    addCollider(x, baseY + 1.1, z, 0.33, 1.1, 0.58);
    WORLD.occluders.push(body);
    const hb = hitbox(x + 0.36, baseY + 1.15, z, 0.5, 2.0, 1.1);
    return { group: g, hit: hb };
  }

  function nightstand(x, z, mat = U.mat(0x3d2d20), baseY = 0) {
    const g = new THREE.Group();
    const body = U.box(0.58, 0.62, 0.48, mat); body.position.y = 0.31; g.add(body);
    const top = U.box(0.64, 0.05, 0.54, M.trim); top.position.y = 0.64; g.add(top);
    const drawer = U.box(0.44, 0.16, 0.02, U.mat(0x2c2118)); drawer.position.set(0, 0.45, 0.25); g.add(drawer);
    const knob = U.sph(0.025, M.brass); knob.position.set(0, 0.45, 0.27); g.add(knob);
    g.position.set(x, baseY, z); WORLD.group.add(g);
    addCollider(x, baseY + 0.35, z, 0.3, 0.35, 0.25);
    return g;
  }

  function desk(x, z, baseY = 0) {
    const g = new THREE.Group();
    const top = U.box(1.9, 0.08, 0.82, U.mat(0x543c28, { rough: 0.8 })); top.position.y = 0.78; g.add(top);
    const legGeo = [0.08, 0.76, 0.08];
    [[-0.82, 0.34], [0.82, 0.34], [-0.82, -0.34], [0.82, -0.34]].forEach(([lx, lz]) => {
      const leg = U.box(legGeo[0], legGeo[1], legGeo[2], M.trim);
      leg.position.set(lx, 0.38, lz); g.add(leg);
    });
    const drawer = U.box(0.7, 0.22, 0.7, U.mat(0x493425)); drawer.position.set(0.45, 0.63, 0); g.add(drawer);
    g.position.set(x, baseY, z); WORLD.group.add(g);
    addCollider(x, baseY + 0.4, z, 0.95, 0.4, 0.41);
    WORLD.occluders.push(top);
    return g;
  }

  function bookshelf(x, z, w = 2.0, h = 2.1, baseY = 0, rotY = 0) {
    const g = new THREE.Group();
    const shell = U.box(w, h, 0.42, U.mat(0x3a2b1f)); shell.position.y = h / 2; g.add(shell);
    const inner = U.box(w - 0.14, h - 0.2, 0.05, U.mat(0x211810)); inner.position.set(0, h / 2, 0.19); g.add(inner);
    for (let s = 0; s < 4; s++) {
      const y = 0.28 + s * (h - 0.4) / 4;
      const shelf = U.box(w - 0.1, 0.04, 0.36, M.trim); shelf.position.set(0, y, 0.02); g.add(shelf);
      let bx = -w / 2 + 0.18;
      while (bx < w / 2 - 0.2) {
        const bw = 0.05 + Math.random() * 0.07;
        const bh = 0.18 + Math.random() * 0.15;
        const b = U.box(bw, bh, 0.22, U.mat(U.pick([0x5a3a2a, 0x384a3c, 0x4a4330, 0x323b4a, 0x6b4a2e]), { rough: 0.9 }));
        b.position.set(bx, y + bh / 2 + 0.02, 0.04); g.add(b);
        bx += bw + 0.015;
      }
    }
    g.position.set(x, baseY, z); g.rotation.y = rotY;
    WORLD.group.add(g);
    const rot = Math.abs(rotY) > 0.1;
    addCollider(x, baseY + h / 2, z, rot ? 0.24 : w / 2, h / 2, rot ? w / 2 : 0.24);
    WORLD.occluders.push(shell);
    return g;
  }

  function table(x, z, w = 1.5, d = 0.9, h = 0.76, baseY = 0) {
    const g = new THREE.Group();
    const top = U.box(w, 0.07, d, U.mat(0x5a422c, { rough: 0.8 })); top.position.y = h; g.add(top);
    [[-w / 2 + 0.1, -d / 2 + 0.1], [w / 2 - 0.1, -d / 2 + 0.1], [-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]].forEach(([lx, lz]) => {
      const leg = U.box(0.07, h, 0.07, M.trim); leg.position.set(lx, h / 2, lz); g.add(leg);
    });
    g.position.set(x, baseY, z); WORLD.group.add(g);
    addCollider(x, baseY + h / 2, z, w / 2, h / 2, d / 2);
    return g;
  }

  function chair(x, z, rot = 0, baseY = 0) {
    const g = new THREE.Group();
    const seat = U.box(0.44, 0.06, 0.44, U.mat(0x513a27)); seat.position.y = 0.46; g.add(seat);
    const back = U.box(0.44, 0.5, 0.06, U.mat(0x513a27)); back.position.set(0, 0.72, -0.19); g.add(back);
    [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([lx, lz]) => {
      const leg = U.box(0.05, 0.46, 0.05, M.trim); leg.position.set(lx, 0.23, lz); g.add(leg);
    });
    g.position.set(x, baseY, z); g.rotation.y = rot; WORLD.group.add(g);
    addCollider(x, baseY + 0.4, z, 0.24, 0.4, 0.24);
    return g;
  }

  function counter(x1, x2, z, facing = 1) {
    const w = x2 - x1, cx = (x1 + x2) / 2;
    const g = new THREE.Group();
    const body = U.box(w, 0.82, 0.62, U.mat(0x6f6a5b)); body.position.set(cx, 0.41, z); g.add(body);
    const top = U.box(w + 0.06, 0.06, 0.68, U.mat(0x9b988c, { rough: 0.5 })); top.position.set(cx, 0.85, z); g.add(top);
    const kick = U.box(w - 0.06, 0.1, 0.56, M.trim); kick.position.set(cx, 0.05, z); g.add(kick);
    for (let i = 0; i < Math.floor(w / 0.9); i++) {
      const d = U.box(0.78, 0.16, 0.02, U.mat(0x5a5548));
      d.position.set(x1 + 0.5 + i * 0.9, 0.62, z + facing * 0.325); g.add(d);
      const k = U.sph(0.02, M.brass); k.position.set(x1 + 0.5 + i * 0.9, 0.62, z + facing * 0.34); g.add(k);
    }
    WORLD.group.add(g);
    addCollider(cx, 0.45, z, w / 2, 0.45, 0.34);
    WORLD.occluders.push(body);
    return g;
  }

  function fridge(x, z) {
    const g = new THREE.Group();
    const body = U.box(0.9, 1.95, 0.75, U.mat(0x9a9c92, { rough: 0.6 })); body.position.set(x, 0.975, z); g.add(body);
    const line = U.box(0.86, 0.02, 0.76, M.trim); line.position.set(x, 1.28, z); g.add(line);
    const h1 = U.box(0.04, 0.5, 0.05, M.metal); h1.position.set(x + 0.34, 1.6, z + 0.39); g.add(h1);
    const h2 = U.box(0.04, 0.3, 0.05, M.metal); h2.position.set(x + 0.34, 1.02, z + 0.39); g.add(h2);
    const note = U.plane(0.2, 0.26, U.textured(U.tex.paperNote, { rough: 1 }));
    note.position.set(x - 0.1, 1.05, z + 0.38); g.add(note);
    WORLD.group.add(g);
    addCollider(x, 0.975, z, 0.45, 0.975, 0.38);
    WORLD.occluders.push(body);
    return g;
  }

  function stove(x, z) {
    const g = new THREE.Group();
    const body = U.box(0.8, 0.85, 0.62, U.mat(0x8d8b82)); body.position.set(x, 0.42, z); g.add(body);
    const top = U.box(0.82, 0.04, 0.64, M.metalDark); top.position.set(x, 0.87, z); g.add(top);
    for (let i = 0; i < 4; i++) {
      const burner = U.cyl(0.1, 0.1, 0.015, 12, M.metalDark);
      burner.rotation.x = Math.PI / 2;
      burner.rotation.z = 0;
      burner.position.set(x - 0.22 + (i % 2) * 0.44, 0.9, z - 0.16 + Math.floor(i / 2) * 0.32);
      g.add(burner);
    }
    const oven = U.box(0.62, 0.36, 0.02, U.mat(0x1c1a17)); oven.position.set(x, 0.42, z + 0.32); g.add(oven);
    WORLD.group.add(g);
    addCollider(x, 0.45, z, 0.41, 0.45, 0.32);
    return g;
  }

  function sinkOnCounter(x, z) {
    const basin = U.box(0.52, 0.05, 0.4, M.metal); basin.position.set(x, 0.9, z); WORLD.group.add(basin);
    const tap = U.cyl(0.02, 0.02, 0.24, 8, M.metal); tap.position.set(x, 1.02, z - 0.16); WORLD.group.add(tap);
    const spout = U.box(0.04, 0.03, 0.18, M.metal); spout.position.set(x, 1.13, z - 0.1); WORLD.group.add(spout);
  }

  function toilet(x, z, rot = 0, baseY = 0) {
    const g = new THREE.Group();
    const bowl = U.cyl(0.24, 0.2, 0.4, 16, U.mat(0xd8d6cc, { rough: 0.35 })); bowl.position.set(x, 0.2, z); g.add(bowl);
    const seat = U.cyl(0.27, 0.27, 0.05, 16, U.mat(0xd8d6cc, { rough: 0.3 })); seat.position.set(x, 0.42, z); g.add(seat);
    const tank = U.box(0.5, 0.42, 0.2, U.mat(0xd8d6cc, { rough: 0.35 })); tank.position.set(x, 0.62, z - 0.28); g.add(tank);
    g.position.y = baseY; g.rotation.y = rot; WORLD.group.add(g);
    addCollider(x, baseY + 0.35, z, 0.3, 0.35, 0.36);
  }

  function bathtub(x, z, baseY = 0) {
    const g = new THREE.Group();
    const body = U.box(1.6, 0.55, 0.78, U.mat(0xd5d3c8, { rough: 0.4 })); body.position.set(x, 0.28, z); g.add(body);
    const inner = U.box(1.38, 0.08, 0.58, U.mat(0x7d8886, { rough: 0.3 })); inner.position.set(x, 0.55, z); g.add(inner);
    g.position.y = baseY; WORLD.group.add(g);
    addCollider(x, baseY + 0.3, z, 0.8, 0.3, 0.39);
    WORLD.occluders.push(body);
  }

  function toiletSink(x, z, rot = 0, baseY = 0) {
    const g = new THREE.Group();
    const cabinet = U.box(0.8, 0.7, 0.48, U.mat(0x5f615b)); cabinet.position.set(x, 0.35, z); g.add(cabinet);
    const basin = U.box(0.74, 0.09, 0.46, U.mat(0xc9c9c0, { rough: 0.35 })); basin.position.set(x, 0.74, z); g.add(basin);
    const mirror = U.box(0.6, 0.75, 0.03, U.mat(0xa9b4b8, { rough: 0.12, metal: 0.8 })); mirror.position.set(x, 1.55, z - 0.22); g.add(mirror);
    g.position.y = baseY; g.rotation.y = rot; WORLD.group.add(g);
    addCollider(x, baseY + 0.4, z, 0.4, 0.4, 0.26);
  }

  function fireplace(x, z) {
    const g = new THREE.Group();
    const body = U.box(0.42, 1.15, 1.7, U.mat(0x6b6155)); body.position.set(x, 0.575, z); g.add(body);
    const opening = U.box(0.05, 0.7, 1.0, U.mat(0x17130f)); opening.position.set(x + 0.2, 0.42, z); g.add(opening);
    const mantel = U.box(0.55, 0.1, 1.9, M.trim); mantel.position.set(x + 0.06, 1.2, z); g.add(mantel);
    const ember = U.box(0.04, 0.22, 0.7, U.mat(0x2a1a0c, { emissive: 0x5a2708, emissiveIntensity: 0.4 }));
    ember.position.set(x + 0.23, 0.25, z); g.add(ember);
    WORLD.group.add(g);
    addCollider(x, 0.6, z, 0.25, 0.6, 0.9);
    WORLD.occluders.push(body);
    return g;
  }

  function plant(x, z, scale = 1, baseY = 0) {
    const pot = U.cyl(0.22 * scale, 0.16 * scale, 0.32 * scale, 10, U.mat(0x5a3927));
    pot.position.set(x, baseY + 0.16 * scale, z); WORLD.group.add(pot);
    for (let i = 0; i < 6; i++) {
      const leaf = U.sph(0.16 * scale, U.mat(0x2f4a2f, { rough: 1 }));
      leaf.scale.set(0.6, 1.4, 0.6);
      leaf.position.set(x + U.rand(-0.2, 0.2) * scale, baseY + (0.5 + Math.random() * 0.4) * scale, z + U.rand(-0.2, 0.2) * scale);
      leaf.rotation.z = U.rand(-0.5, 0.5);
      WORLD.group.add(leaf);
    }
  }

  function crates(x, z, n = 2, baseY = 0) {
    let y = baseY;
    for (let i = 0; i < n; i++) {
      const s = U.rand(0.45, 0.62);
      const c = U.box(s, s, s, U.mat(0x514232, { rough: 0.95 }));
      c.position.set(x + U.rand(-0.15, 0.15), y + s / 2, z + U.rand(-0.15, 0.15));
      c.rotation.y = U.rand(-0.4, 0.4);
      WORLD.group.add(c);
      y += s;
    }
    addCollider(x, baseY + 0.35, z, 0.45, 0.35, 0.45);
  }

  function paperDebris(x, z, n = 10, radius = 2, baseY = 0) {
    for (let i = 0; i < n; i++) {
      const p = U.plane(0.18, 0.24, U.mat(0xbfb7a1, { rough: 1, side: THREE.DoubleSide }));
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = U.rand(0, 6.28);
      p.position.set(x + U.rand(-radius, radius), baseY + 0.022, z + U.rand(-radius, radius));
      WORLD.group.add(p);
    }
  }

  /* ---------- kapılar ---------- */
  function hingeDoor(name, pivot, width, height, mat, direction, startAngle, initialTarget, baseY = 0) {
    const group = new THREE.Group();
    group.position.set(pivot.x, baseY, pivot.z);
    const door = U.box(width, height, 0.09, mat);
    door.position.set(direction * width / 2, height / 2, 0);
    group.add(door);
    // panel detayı
    const inset = U.box(width * 0.6, height * 0.5, 0.02, U.mat(0x3b2a1c, { rough: 0.9 }));
    inset.position.set(direction * width / 2, height * 0.55, 0.055);
    group.add(inset);
    const knob = U.sph(0.04, M.brass);
    knob.position.set(direction * (width - 0.16), height * 0.48, 0.08);
    group.add(knob);
    group.rotation.y = startAngle;
    WORLD.group.add(group);
    const collider = addCollider(pivot.x + direction * width / 2, baseY + height / 2, pivot.z, width / 2, height / 2, 0.09);
    WORLD.doors[name] = { group, collider, target: initialTarget, current: startAngle, speed: 2.4, name, door };
    return WORLD.doors[name];
  }

  function closeDoor(name, keepCollider = true) {
    const d = WORLD.doors[name];
    if (!d) return;
    d.target = 0;
    if (keepCollider) d.collider.off = false;
  }

  /* ---------- inşa ---------- */
  function build(scene) {
    WORLD.group = new THREE.Group();
    scene.add(WORLD.group);
    initMaterials(); initTextures();

    buildGroundAndShell();
    buildYard();
    buildGroundFloor();
    buildStairs();
    buildUpstairs();
    buildBasement();
    buildDoors();
    buildLights(scene);
    buildWeather(scene);
    return WORLD;
  }

  function buildGroundAndShell() {
    // Bahçe zemini
    const ground = U.plane(64, 64, M.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -4);
    ground.receiveShadow = true;
    WORLD.group.add(ground);

    // Zemin kat ahşap zemin (bodrum boşluğu hariç)
    const floorMat = M.woodFloor;
    const parts = [
      [-12, 3, -9, 10],
      [6, 12, -9, 10],
      [3, 6, -3, 10],
      [3, 6, -9, -8.4]
    ];
    parts.forEach(([x1, x2, z1, z2]) => {
      const p = U.plane(x2 - x1, z2 - z1, floorMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2);
      p.receiveShadow = true;
      WORLD.group.add(p);
    });

    // Dış duvarlar (iki kat)
    const H = 6.4;
    // güney (ön) z=10, kapı boşluğu x -0.95..0.95
    wallZ(10, -12.12, -0.95, 0, H, M.siding);
    wallZ(10, 0.95, 12.12, 0, H, M.siding);
    wallZ(10, -0.95, 0.95, 2.3, H - 2.3, M.siding);
    // kuzey (arka) z=-9, arka kapı boşluğu
    wallZ(-9, -12.12, -0.95, 0, H, M.siding);
    wallZ(-9, 0.95, 12.12, 0, H, M.siding);
    wallZ(-9, -0.95, 0.95, 2.25, H - 2.25, M.siding);
    wallX(-12, -9.12, 10.12, 0, H, M.siding);
    wallX(12, -9.12, 10.12, 0, H, M.siding);

    // İç duvarlar - zemin
    const GH = 3.2;
    // salon / hol
    wallX(-2, 1, 5.4, 0, GH, M.wallLiving);
    wallX(-2, 7.2, 10, 0, GH, M.wallLiving);
    wallX(-2, 5.4, 7.2, 2.2, GH - 2.2, M.wallLiving);
    doorFrameX(-2, 6.3, 1.8, 2.2);
    // salon / çalışma
    wallZ(1, -12, -2, 0, GH, M.wallLiving);
    // hol / çalışma (kilitli kapı)
    wallX(-2, -9, -5.2, 0, GH, M.wallStudy);
    wallX(-2, -3.4, 1, 0, GH, M.wallStudy);
    wallX(-2, -5.2, -3.4, 2.2, GH - 2.2, M.wallStudy);
    doorFrameX(-2, -4.3, 1.8, 2.2);
    // hol / mutfak
    wallX(2, -2, 6.2, 0, GH, M.wallKitchen);
    wallX(2, 8.2, 10, 0, GH, M.wallKitchen);
    wallX(2, 6.2, 8.2, 2.2, GH - 2.2, M.wallKitchen);
    doorFrameX(2, 7.2, 2.0, 2.2);
    // hol / kiler (kuzey kısım sağlam)
    wallX(2, -9, -2, 0, GH, M.wallUtility);
    // mutfak / kiler
    wallZ(-2, 2, 6, 0, GH, M.wallUtility);
    wallZ(-2, 7.6, 12, 0, GH, M.wallUtility);
    wallZ(-2, 6, 7.6, 2.2, GH - 2.2, M.wallUtility);
    doorFrameZ(-2, 6.8, 1.6, 2.2);

    // Kat arası döşeme (merdiven boşluklu)
    const upTop = 3.4;
    slab(-12, 9.55, -9, 10, upTop, M.upFloor, M.ceiling);
    slab(9.55, 11.85, -9, -8, upTop, M.upFloor, M.ceiling);
    slab(9.55, 11.85, -3, 10, upTop, M.upFloor, M.ceiling);
    slab(11.85, 12, -8, -3, upTop, M.upFloor, M.ceiling);
    // bodrum kat tavanı (kiler altındaki boşluk dışında üst kat döşemesi var)
    // üst kat tavanı
    const ceil = U.plane(24, 19, M.ceiling);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 6.39, 0.5);
    WORLD.group.add(ceil);

    // çatı
    const southRoof = U.box(25.5, 0.18, 10.8, M.roof);
    southRoof.position.set(0, 7.48, 5.65);
    southRoof.rotation.x = 0.178;
    WORLD.group.add(southRoof);
    const northRoof = U.box(25.5, 0.18, 10.8, M.roof);
    northRoof.position.set(0, 7.48, -4.65);
    northRoof.rotation.x = -0.178;
    WORLD.group.add(northRoof);

    // pencereler
    windowAt(-8, 1.7, 9.87, Math.PI);
    windowAt(-3.2, 1.7, 9.87, Math.PI);
    windowAt(6, 1.7, 9.87, Math.PI);
    windowAt(9.8, 1.7, 9.87, Math.PI);
    windowAt(-11.87, 1.7, 6, Math.PI / 2);
    windowAt(-11.87, 1.7, -4, Math.PI / 2);
    windowAt(11.87, 1.7, 5, -Math.PI / 2);
    windowAt(11.87, 1.7, -5, -Math.PI / 2);
    windowAt(-8, 5.0, 9.87, Math.PI);
    windowAt(-4.5, 5.0, 9.87, Math.PI, 1.3, 1.3, true);
    windowAt(5.5, 5.0, 9.87, Math.PI);
    windowAt(-11.87, 5.0, 6, Math.PI / 2, 1.3, 1.3, true);
    windowAt(-11.87, 5.0, -4, Math.PI / 2);
    windowAt(11.87, 5.0, 5, -Math.PI / 2);
    windowAt(11.87, 5.0, -5, -Math.PI / 2);
    windowAt(6, 5.0, -8.87, 0);

    // arka veranda
    solid(5.5, 0.12, 2.0, 1.5, -0.08, -10.1, U.mat(0x5f5d54, { rough: 0.95 }));
    const step = solid(3.2, 0.1, 0.7, 0, -0.16, -11.3, U.mat(0x55534b));
    // ön basamak
    solid(3.4, 0.12, 1.2, 0, -0.1, 10.6, U.mat(0x55534b));
  }

  function buildYard() {
    // çit
    const fenceMat = U.mat(0x2e2a24, { rough: 0.95 });
    function fenceLine(x1, z1, x2, z2) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const count = Math.floor(len / 0.55);
      const nx = (x2 - x1) / len, nz = (z2 - z1) / len;
      for (let i = 0; i <= count; i++) {
        const x = x1 + nx * (i * 0.55), z = z1 + nz * (i * 0.55);
        const p = U.box(0.08, 2.1, 0.12, fenceMat);
        p.position.set(x, 1.05, z); WORLD.group.add(p);
      }
      const rail1 = U.box(Math.abs(x2 - x1) || 0.08, 0.1, Math.abs(z2 - z1) || 0.08, fenceMat);
      rail1.position.set((x1 + x2) / 2, 0.7, (z1 + z2) / 2);
      WORLD.group.add(rail1);
      const rail2 = rail1.clone(); rail2.position.y = 1.55; WORLD.group.add(rail2);
      addCollider((x1 + x2) / 2, 1.1, (z1 + z2) / 2, Math.abs(x2 - x1) / 2 + 0.06, 1.1, Math.abs(z2 - z1) / 2 + 0.06);
    }
    fenceLine(-18, -20, 18, -20);
    fenceLine(-18, -20, -18, 11.5);
    fenceLine(18, -20, 18, 11.5);
    fenceLine(-18, 11.5, -0.2, 11.5);
    fenceLine(0.2, 11.5, 18, 11.5);
    // ağaçlar
    function tree(x, z, s = 1) {
      const trunk = U.cyl(0.16 * s, 0.24 * s, 3.4 * s, 7, U.mat(0x2b231b), true);
      trunk.position.set(x, 1.7 * s, z); WORLD.group.add(trunk);
      for (let i = 0; i < 4; i++) {
        const foliage = U.sph(1.1 * s, U.mat(U.pick([0x1e3020, 0x223524, 0x1a2a1d]), { rough: 1 }));
        foliage.scale.set(1, 0.78, 1);
        foliage.position.set(x + U.rand(-0.7, 0.7) * s, (3.3 + U.rand(0, 1.2)) * s, z + U.rand(-0.7, 0.7) * s);
        WORLD.group.add(foliage);
      }
      addCollider(x, 1.5, z, 0.3, 1.5, 0.3);
    }
    tree(-15, -17, 1.15); tree(14.5, -16.5, 1.3); tree(-15.5, -4, 0.9); tree(15.5, 2, 1.05);
    tree(-7, -12, 0.55);

    // kulübe
    buildShed();

    // salıncak
    const swingX = 6.5, swingZ = -16;
    const postMat = U.mat(0x3c3226, { rough: 0.9 });
    [[-1.2, 0], [1.2, 0]].forEach(([ox]) => {
      const p = U.cyl(0.07, 0.09, 2.7, 8, postMat);
      p.position.set(swingX + ox, 1.35, swingZ); p.rotation.z = ox > 0 ? 0.12 : -0.12; WORLD.group.add(p);
      addCollider(swingX + ox, 1.3, swingZ, 0.12, 1.3, 0.12);
    });
    const bar = U.cyl(0.06, 0.06, 2.8, 8, postMat);
    bar.rotation.z = Math.PI / 2; bar.position.set(swingX, 2.62, swingZ); WORLD.group.add(bar);
    [-0.45, 0.45].forEach(ox => {
      const chain = U.box(0.015, 1.4, 0.015, M.metalDark);
      chain.position.set(swingX + ox, 1.88, swingZ); WORLD.group.add(chain);
    });
    const seat = U.box(0.9, 0.06, 0.28, U.mat(0x5b3924));
    seat.position.set(swingX, 1.16, swingZ); WORLD.group.add(seat);

    // bahçe eşyaları
    crates(12, -12, 2);
    crates(-14, -9.5, 3);
    const barrel = U.cyl(0.36, 0.36, 0.9, 12, U.mat(0x3f4a44, { rough: 0.8, metal: 0.3 }));
    barrel.position.set(13.5, 0.45, -14); WORLD.group.add(barrel);
    addCollider(13.5, 0.45, -14, 0.38, 0.45, 0.38);

    // paslı bisiklet
    const bike = new THREE.Group();
    const wheelMat = U.mat(0x2a2723, { rough: 0.7 });
    [-0.55, 0.55].forEach(ox => {
      const w = U.cyl(0.32, 0.32, 0.04, 16, wheelMat);
      w.rotation.z = Math.PI / 2; w.position.set(ox, 0.34, 0); bike.add(w);
    });
    const frame = U.box(0.9, 0.05, 0.05, U.mat(0x5e3a2c, { rough: 0.6, metal: 0.4 }));
    frame.position.y = 0.6; bike.add(frame);
    const seatTube = U.box(0.05, 0.4, 0.05, frame.material); seatTube.position.set(-0.35, 0.55, 0); bike.add(seatTube);
    const seatB = U.box(0.22, 0.05, 0.1, U.mat(0x231d18)); seatB.position.set(-0.35, 0.78, 0); bike.add(seatB);
    const handle = U.box(0.05, 0.3, 0.35, M.metalDark); handle.position.set(0.42, 0.78, 0); bike.add(handle);
    bike.position.set(-13.2, 0.02, -10.5); bike.rotation.y = 0.4; bike.rotation.z = 0.28;
    WORLD.group.add(bike);

    // sokak lambası
    const pole = U.cyl(0.06, 0.08, 4.4, 8, M.metalDark);
    pole.position.set(15, 2.2, 6); WORLD.group.add(pole);
    const lampHead = U.box(0.4, 0.12, 0.3, M.glowBlue);
    lampHead.position.set(14.8, 4.5, 6); WORLD.group.add(lampHead);
    const lampHalo = U.glowSprite(0x9fc1e8, 2.8, 0.42);
    lampHalo.position.set(14.8, 4.48, 6); WORLD.group.add(lampHalo);
    const lampLight = new THREE.PointLight(0x9fc1e8, 0.7, 18, 2);
    lampLight.position.set(14.8, 4.3, 6); WORLD.group.add(lampLight);
    WORLD.windowLights.push(lampLight);

    // "girme" tabelası
    const sign = U.plane(1.1, 0.7, U.textured(U.tex.paperNote, { rough: 1, side: THREE.DoubleSide }));
    sign.position.set(-17.9, 1.3, -12); sign.rotation.y = Math.PI / 2; WORLD.group.add(sign);

    // su birikintileri
    for (let i = 0; i < 7; i++) {
      const pud = U.plane(U.rand(1, 3), U.rand(0.6, 1.6), U.mat(0x10161a, { rough: 0.08, metal: 0.2, side: THREE.DoubleSide }));
      pud.rotation.x = -Math.PI / 2;
      pud.position.set(U.rand(-15, 15), 0.005, U.rand(-19, 8));
      WORLD.group.add(pud);
    }

    // bahçe kayıp ilanı (kuzey çit)
    const poster = U.plane(0.72, 1.05, U.textured(U.tex.poster, { rough: 1 }));
    poster.position.set(-3, 1.5, -19.82); poster.rotation.y = 0;
    WORLD.group.add(poster);
    const posterHit = hitbox(-3, 1.5, -19.6, 0.9, 1.2, 0.2);
    addInteractable('poster_yard', posterHit, 'Kayıp ilanını incele', 2.8);
  }

  function buildShed() {
    const sx = -9, sz = -15.2;
    const wood = U.mat(0x4a4034, { rough: 0.96 });
    // duvarlar (doğu tarafı kapı boşluklu)
    solid(4.2, 2.6, 0.2, sx, 0, sz - 1.6, wood, { collide: true, occlude: true });
    solid(4.2, 2.6, 0.2, sx, 0, sz + 1.6, wood, { collide: true, occlude: true });
    solid(0.2, 2.6, 3.2, sx - 2.0, 0, sz, wood, { collide: true, occlude: true });
    solid(0.2, 2.6, 1.0, sx + 2.0, 0, sz - 1.1, wood, { collide: true, occlude: true });
    solid(0.2, 2.6, 1.0, sx + 2.0, 0, sz + 1.1, wood, { collide: true, occlude: true });
    solid(0.2, 0.5, 1.2, sx + 2.0, 2.1, sz, wood, { collide: false, occlude: true });
    // çatı
    const roof = U.box(4.8, 0.16, 3.8, M.roof);
    roof.position.set(sx, 2.85, sz); roof.rotation.z = 0.05; WORLD.group.add(roof);
    // raf
    const shelf = solid(1.8, 0.06, 0.5, sx - 0.8, 1.15, sz - 1.2, U.mat(0x5a4530), { collide: false });
    solid(0.06, 1.15, 0.5, sx - 1.65, 0, sz - 1.2, wood, { collide: false });
    solid(0.06, 1.15, 0.5, sx + 0.05, 0, sz - 1.2, wood, { collide: false });
    // el aletleri ve kutu
    const box1 = U.box(0.5, 0.25, 0.35, U.mat(0x3d4a36)); box1.position.set(sx - 1.0, 1.3, sz - 1.2); WORLD.group.add(box1);
    const can = U.cyl(0.09, 0.09, 0.22, 8, M.metal); can.position.set(sx - 0.4, 1.28, sz - 1.2); WORLD.group.add(can);

    // sigorta
    const fuseGroup = new THREE.Group();
    const fus = U.cyl(0.055, 0.055, 0.2, 10, U.mat(0xcfc4a8, { emissive: 0x554422, emissiveIntensity: 0.7 }));
    fus.rotation.z = Math.PI / 2; fuseGroup.add(fus);
    const cap1 = U.cyl(0.06, 0.06, 0.03, 8, M.brass); cap1.rotation.z = Math.PI / 2; cap1.position.x = 0.11; fuseGroup.add(cap1);
    const cap2 = cap1.clone(); cap2.position.x = -0.11; fuseGroup.add(cap2);
    fuseGroup.position.set(sx - 0.8, 1.32, sz - 1.2);
    fuseGroup.add(new THREE.PointLight(0xffcc77, 0.28, 2.4, 2));
    WORLD.group.add(fuseGroup);
    WORLD.fuseMeshes.shed = fuseGroup;
    const fh = hitbox(sx - 0.8, 1.32, sz - 1.1, 0.5, 0.4, 0.4);
    addInteractable('fuse_shed', fh, 'Sigortayı al', 2.6);

    // fener
    const lamp = new THREE.PointLight(0xffb06a, 0.55, 6, 2);
    lamp.position.set(sx + 1.1, 1.8, sz); WORLD.group.add(lamp);
    const lampBody = U.box(0.16, 0.24, 0.16, M.glow);
    lampBody.position.set(sx + 1.1, 1.85, sz); WORLD.group.add(lampBody);
    const lampHalo = U.glowSprite(0xffb06a, 1.05, 0.34);
    lampHalo.position.set(sx + 1.1, 1.84, sz); WORLD.group.add(lampHalo);
  }

  function buildGroundFloor() {
    /* SALON */
    rug(-8, 6.4, 5.6, 4.2, U.textured(U.tex.carpet, { rough: 1 }));
    sofa(-8.4, 8.6, 3.0, M.fabricGreen, -1);
    const armchair = sofa(-4.9, 8.3, 1.5, M.fabricBrown, -1);
    armchair.rotation.y = -0.22;
    table(-8.2, 6.9, 1.9, 1.0, 0.42);
    fireplace(-11.55, 4.6);
    // şömine üstü fotoğraf
    const photoGroup = new THREE.Group();
    const frame = U.box(0.62, 0.5, 0.05, M.trim); frame.position.set(0, 0, 0); photoGroup.add(frame);
    const photo = U.plane(0.54, 0.42, U.textured(U.tex.photo, { rough: 0.8 }));
    photo.position.set(0, 0, 0.03); photoGroup.add(photo);
    photoGroup.position.set(-11.55, 1.55, 4.6); photoGroup.rotation.y = Math.PI / 2;
    WORLD.group.add(photoGroup);
    const photoHit = hitbox(-11.35, 1.55, 4.6, 0.35, 0.7, 0.9);
    addInteractable('photo', photoHit, 'Fotoğrafı incele', 2.8);

    // TV ve sehpa
    const tvStand = U.box(1.8, 0.5, 0.5, M.trim); tvStand.position.set(-8, 0.25, 1.4); WORLD.group.add(tvStand);
    addCollider(-8, 0.25, 1.4, 0.9, 0.25, 0.25);
    const tv = U.box(1.25, 0.72, 0.08, M.screen); tv.position.set(-8, 0.9, 1.45); WORLD.group.add(tv);
    const tvLight = new THREE.PointLight(0x55708c, 0.18, 3.5, 2); tvLight.position.set(-8, 1.0, 2.0); WORLD.group.add(tvLight);

    bookshelf(-3.4, 3.1, 1.6, 2.0, 0, Math.PI / 2);
    plant(-3, 9.3, 0.9);
    // dikey lamba
    const lampPole = U.cyl(0.02, 0.02, 1.5, 6, M.metalDark); lampPole.position.set(-11.2, 0.75, 9.2); WORLD.group.add(lampPole);
    const shade = U.cyl(0.18, 0.28, 0.3, 10, U.mat(0xb9a375, { rough: 0.9, side: THREE.DoubleSide })); shade.position.set(-11.2, 1.6, 9.2); WORLD.group.add(shade);
    paperDebris(-9, 4.5, 5, 2.5);

    /* HOL */
    rug(0, 3, 1.8, 6, U.textured(U.tex.carpet, { rough: 1 }), 0.011);
    // portmanto (saklanma)
    const hallCloset = wardrobe(-1.55, 0.3, 1);
    const cH = addInteractable('closet_hall', hallCloset.hit, 'Portmantoya saklan', 2.6);
    WORLD.closets.hall = { pos: new THREE.Vector3(-1.55, 0, 0.3), yaw: -Math.PI / 2 };
    // konsol
    const consoleT = U.box(0.35, 0.85, 1.4, U.mat(0x3b2c20)); consoleT.position.set(1.75, 0.42, 3.2); WORLD.group.add(consoleT);
    addCollider(1.75, 0.42, 3.2, 0.18, 0.42, 0.7);
    const mirror = U.box(0.03, 0.8, 0.9, U.mat(0x93a0a4, { rough: 0.15, metal: 0.7 })); mirror.position.set(1.87, 1.5, 3.2); WORLD.group.add(mirror);
    // duvar fotoğrafları
    for (let i = 0; i < 3; i++) {
      const f = U.box(0.03, 0.34, 0.28, M.trim); f.position.set(1.87, 2.1 - i * 0.03, 6.6 - i * 0.55); WORLD.group.add(f);
      const img = U.plane(0.24, 0.3, U.mat([0x8b8268, 0x6f6a58, 0x91836b][i], { rough: 1 }));
      img.rotation.y = -Math.PI / 2; img.position.set(1.85, 2.1 - i * 0.03, 6.6 - i * 0.55); WORLD.group.add(img);
    }
    // ön kapı (tahtalı)
    const frontDoor = U.box(1.9, 2.3, 0.12, M.doorDark);
    frontDoor.position.set(0, 1.15, 9.93); WORLD.group.add(frontDoor);
    for (let i = 0; i < 4; i++) {
      const plank = U.box(2.2, 0.16, 0.06, U.mat(0x5a4530));
      plank.position.set(0, 0.55 + i * 0.45, 9.85); plank.rotation.z = (i % 2 ? 1 : -1) * 0.045;
      WORLD.group.add(plank);
    }
    const fdHit = hitbox(0, 1.2, 9.8, 1.9, 2.2, 0.2);
    addInteractable('frontDoor', fdHit, 'Ön kapıyı kontrol et', 3);

    /* MUTFAK */
    counter(3.0, 9.4, 9.62, 1);
    sinkOnCounter(5.2, 9.6);
    stove(8.6, 9.6);
    fridge(11.2, 9.25);
    table(4.3, 2.6, 1.7, 1.0, 0.76);
    chair(3.4, 2.0, Math.PI * 0.15);
    chair(5.2, 2.0, -Math.PI * 0.15);
    chair(4.3, 1.4, 0);
    // süt notu
    const note = U.plane(0.24, 0.3, U.textured(U.tex.paperNote, { rough: 1 }));
    note.position.set(11.2, 1.4, 9.63); WORLD.group.add(note);
    const fridgeHit = hitbox(11.2, 1.2, 9.7, 1.0, 2.0, 0.4);
    addInteractable('note_fridge', fridgeHit, 'Buzdolabındaki notu oku', 2.6);
    // çekmece (anahtar)
    const drawer = U.box(0.62, 0.18, 0.06, U.mat(0x4f4a40));
    drawer.position.set(4.2, 0.66, 9.25); WORLD.group.add(drawer);
    const drawerKnob = U.sph(0.025, M.brass); drawerKnob.position.set(4.2, 0.66, 9.2); WORLD.group.add(drawerKnob);
    const drawerHit = hitbox(4.2, 0.66, 9.3, 0.8, 0.4, 0.3);
    addInteractable('drawer', drawerHit, 'Mutfak çekmecesini aç', 2.4);
    // askı lamba
    const cord = U.box(0.015, 0.9, 0.015, M.metalDark); cord.position.set(4.3, 2.75, 2.6); WORLD.group.add(cord);
    const pend = U.cyl(0.26, 0.12, 0.2, 10, U.mat(0xbfaa7c, { rough: 0.9, side: THREE.DoubleSide })); pend.position.set(4.3, 2.25, 2.6); WORLD.group.add(pend);
    // mutfak tezgâh eşyaları
    const kettle = U.cyl(0.1, 0.12, 0.2, 10, M.metal); kettle.position.set(7.2, 1.0, 9.6); WORLD.group.add(kettle);
    const jars = [3.3, 3.6].map(x => {
      const j = U.cyl(0.07, 0.07, 0.18, 8, U.mat(0x6b5a3d)); j.position.set(x, 0.98, 9.6); WORLD.group.add(j); return j;
    });

    /* ÇALIŞMA ODASI */
    desk(-7, -3.3);
    bookshelf(-11.65, -6.4, 2.2, 2.2, 0, Math.PI / 2);
    bookshelf(-9.6, -8.66, 2.4, 2.1);
    chair(-7, -4.5, Math.PI);
    // mektup
    const letter = U.box(0.36, 0.03, 0.24, U.mat(0xd6ceb6));
    letter.position.set(-7.3, 0.84, -3.3); letter.rotation.y = 0.2; WORLD.group.add(letter);
    const lHit = hitbox(-7.3, 0.9, -3.3, 0.55, 0.35, 0.5);
    addInteractable('letter', lHit, 'Mektubu oku', 2.5);
    // masa lambası
    const deskLampBase = U.cyl(0.09, 0.1, 0.05, 10, M.metalDark); deskLampBase.position.set(-6.2, 0.84, -3.2); WORLD.group.add(deskLampBase);
    const deskLampArm = U.box(0.03, 0.4, 0.03, M.metalDark); deskLampArm.position.set(-6.2, 1.03, -3.2); WORLD.group.add(deskLampArm);
    const deskLampHead = U.cyl(0.12, 0.06, 0.16, 10, U.mat(0x7a6a4a)); deskLampHead.rotation.x = 0.8; deskLampHead.position.set(-6.2, 1.23, -3.26); WORLD.group.add(deskLampHead);
    // pano
    const board = U.box(2.3, 1.3, 0.05, U.mat(0x4b3a28));
    board.position.set(-6, 1.9, -8.83); WORLD.group.add(board);
    const posterA = U.plane(0.48, 0.7, U.textured(U.tex.poster, { rough: 1 }));
    posterA.position.set(-6.7, 1.95, -8.78); WORLD.group.add(posterA);
    const posterB = posterA.clone(); posterB.position.x = -5.9; posterB.rotation.z = 0.04; WORLD.group.add(posterB);
    const draw = U.plane(0.5, 0.4, U.textured(U.tex.drawing, { rough: 1 }));
    draw.position.set(-5.1, 1.9, -8.78); draw.rotation.z = -0.03; WORLD.group.add(draw);
    combatStrings(-6, 1.9, -8.72);
    const boardHit = hitbox(-6, 1.85, -8.6, 2.4, 1.4, 0.4);
    addInteractable('bulletin', boardHit, 'Panoyu incele', 2.8);
    paperDebris(-7, -6, 12, 3);
    const fileCab = U.box(0.6, 1.3, 0.6, U.mat(0x56584f)); fileCab.position.set(-3.4, 0.65, -7.8); WORLD.group.add(fileCab);
    addCollider(-3.4, 0.65, -7.8, 0.3, 0.65, 0.3);

    /* KİLER */
    // füzyon kutusu
    const panel = U.box(0.7, 0.95, 0.1, U.mat(0x7a7d75, { rough: 0.6 }));
    panel.position.set(8, 1.5, -8.85); WORLD.group.add(panel);
    for (let i = 0; i < 3; i++) {
      const slot = U.cyl(0.065, 0.065, 0.06, 10, U.mat(0x25231f));
      slot.rotation.x = Math.PI / 2; slot.position.set(7.78 + i * 0.22, 1.55, -8.78); WORLD.group.add(slot);
    }
    const led = U.sph(0.035, U.mat(0x501010, { emissive: 0xff2211, emissiveIntensity: 2 }));
    led.position.set(7.8, 1.85, -8.77); WORLD.group.add(led);
    WORLD.fuseLED = led;
    const panelHit = hitbox(8, 1.5, -8.7, 0.9, 1.2, 0.4);
    addInteractable('fuseBox', panelHit, 'Sigorta kutusunu incele', 2.4);
    // raflar
    const shelfMat = U.mat(0x4b4f52, { metal: 0.5, rough: 0.6 });
    for (let s = 0; s < 3; s++) {
      solid(2.3, 0.05, 0.55, 3.5, 0.5 + s * 0.65, -8.55, shelfMat, { collide: false });
    }
    solid(0.06, 2.1, 0.55, 2.4, 0, -8.55, shelfMat, { collide: true });
    solid(0.06, 2.1, 0.55, 4.6, 0, -8.55, shelfMat, { collide: true });
    crates(3.2, -8.2, 2);
    // eski çamaşır makinesi
    const washer = U.box(0.7, 0.9, 0.7, U.mat(0x8b8d85));
    washer.position.set(11.2, 0.45, -8.3); WORLD.group.add(washer); addCollider(11.2, 0.45, -8.3, 0.35, 0.45, 0.35);
    const wdoor = U.cyl(0.24, 0.24, 0.04, 18, M.metalDark); wdoor.rotation.x = Math.PI / 2; wdoor.position.set(11.2, 0.52, -7.94); WORLD.group.add(wdoor);
    // asılı ampul
    const wire = U.box(0.015, 0.6, 0.015, M.metalDark); wire.position.set(7.5, 2.85, -5.5); WORLD.group.add(wire);
    const bulb = U.sph(0.06, M.glow); bulb.position.set(7.5, 2.52, -5.5); WORLD.group.add(bulb);

    // kiler bodrum boşluğu korkulukları (zemin)
    const railMat = U.mat(0x3a2e22, { rough: 0.85 });
    railX(3, -8.4, -3.35, 0, 1.0, railMat);
    railX(6, -8.4, -3.35, 0, 1.0, railMat);

    /* salondaki not (duvar) */
    const wallNote = U.plane(0.3, 0.38, U.textured(U.tex.paperNote, { rough: 1 }));
    wallNote.position.set(-2.1, 1.6, 8.2); wallNote.rotation.y = -Math.PI / 2;
    WORLD.group.add(wallNote);
  }

  function combatStrings(x, y, z) {
    // pano üzerinde kırmızı ipler
    const mat = new THREE.LineBasicMaterial({ color: 0x8a2a20, transparent: true, opacity: 0.8 });
    const pts = [
      [new THREE.Vector3(x - 0.7, y + 0.25, z), new THREE.Vector3(x - 0.1, y - 0.1, z), new THREE.Vector3(x + 0.5, y + 0.15, z)],
      [new THREE.Vector3(x - 0.7, y + 0.25, z), new THREE.Vector3(x + 0.6, y - 0.35, z)]
    ];
    pts.forEach(arr => {
      const geo = new THREE.BufferGeometry().setFromPoints(arr);
      WORLD.group.add(new THREE.Line(geo, mat));
    });
  }

  function railX(x, z1, z2, y0, h, mat) {
    solid(0.08, h, Math.abs(z2 - z1), x, y0, (z1 + z2) / 2, mat, { collide: true, occlude: false, shadow: false });
    const top = solid(0.1, 0.07, Math.abs(z2 - z1), x, y0 + h, (z1 + z2) / 2, mat, { collide: false });
    return top;
  }
  function railZ(z, x1, x2, y0, h, mat) {
    solid(Math.abs(x2 - x1), h, 0.08, (x1 + x2) / 2, y0, z, mat, { collide: true, occlude: false, shadow: false });
    solid(Math.abs(x2 - x1), 0.07, 0.1, (x1 + x2) / 2, y0 + h, z, mat, { collide: false });
  }

  function buildStairs() {
    const stepMat = M.upFloor;
    // ana merdiven: x 9.55..11.85, z -8 (üst) -> -3 (alt)
    const steps = 17, zTop = -8, zBot = -3;
    const dz = (zBot - zTop) / steps;
    for (let i = 0; i < steps; i++) {
      const top = (i + 1) / steps * 3.4;
      const zc = zBot - dz * (i + 0.5);
      const h = top;
      const step = solid(2.3, h, Math.abs(dz), 10.7, 0, zc, stepMat, { collide: false, shadow: true });
    }
    // yan panel
    solid(0.1, 3.4, 4.4, 9.47, 0, -5.65, M.trim, { collide: true, occlude: true });
    // korkuluk (görsel)
    for (let i = 0; i <= 4; i++) {
      const z = -7.7 + i * 1.0;
      const y = 3.4 * ((-z - 3) / 5) + 0.9;
      const post = U.box(0.05, 0.9, 0.05, M.trim); post.position.set(9.6, y, z); WORLD.group.add(post);
    }
    const rail = U.box(0.06, 0.06, 5.05, M.trim);
    rail.position.set(9.6, 2.43, -5.5); rail.rotation.x = -0.6; WORLD.group.add(rail);

    // bodrum merdiveni: x 3..6, z -3 (üst) -> -8.4 (alt)
    const bsteps = 15, bzTop = -3, bzBot = -8.4;
    const bdz = (bzBot - bzTop) / bsteps;
    for (let i = 0; i < bsteps; i++) {
      const top = -(i + 1) / bsteps * 3.2;
      const zc = bzTop + bdz * (i + 0.5);
      const h = 3.2 + top;
      const step = solid(3.0, Math.max(0.08, h), Math.abs(bdz), 4.5, -3.2, zc, U.mat(0x4d4a42), { collide: false });
    }
    // bodrum iniş sahanlığı
    solid(3.0, 0.15, 0.7, 4.5, -3.35, -8.75, U.mat(0x4d4a42), { collide: false });
    // bodrum kapısı için duvar (z=-9) + kapı boşluğu
    // (dış duvar zaten var; bodrum seviyesinde ayrı duvar)
    // korkuluk üstü
    railX(3.0, -8.5, -3.3, 0, 0.95, M.trim);
    railX(6.0, -8.5, -3.3, 0, 0.95, M.trim);
  }

  function buildUpstairs() {
    const y0 = 3.4, H = 3.0;
    // duvarlar
    wallX(-2, 1, 5.4, y0, H, M.wallElif);
    wallX(-2, 7.2, 10, y0, H, M.wallElif);
    wallX(-2, 5.4, 7.2, y0 + 2.2, H - 2.2, M.wallElif);
    wallX(-2, -9, -5.2, y0, H, M.wallUp);
    wallX(-2, -3.4, 1, y0, H, M.wallUp);
    wallX(-2, -5.2, -3.4, y0 + 2.2, H - 2.2, M.wallUp);
    wallZ(1, -12, -2, y0, H, M.wallUp);
    doorFrameX(-2, 6.3, 1.8, 2.2, M.wallTrim || M.trim);
    doorFrameX(-2, -4.3, 1.8, 2.2);
    // banyo
    wallX(2, -9, -2, y0, H, M.wallBath);
    wallZ(-2, 2, 7, y0, H, M.wallBath);
    wallX(7, -9, -5.6, y0, H, M.wallBath);
    wallX(7, -4, -2, y0, H, M.wallBath);
    wallX(7, -5.6, -4, y0 + 2.2, H - 2.2, M.wallBath);
    doorFrameX(7, -4.8, 1.6, 2.2);
    // oyun odası sınırı (hafif açık)
    wallZ(3, 2, 4.2, y0, H, M.wallUp);
    wallZ(3, 5.8, 12, y0, H, M.wallUp);
    wallZ(3, 4.2, 5.8, y0 + 2.2, H - 2.2, M.wallUp);
    doorFrameZ(3, 5.0, 1.6, 2.2);
    // merdiven boşluğu korkulukları
    railX(9.55, -8, -3.05, y0, 1.0, M.trim);
    railZ(-8, 9.55, 10.2, y0, 1.0, M.trim);
    railZ(-8, 11.2, 11.85, y0, 1.0, M.trim);

    /* ELİF'İN ODASI */
    rug(-8.5, 6.5, 4.2, 3.4, U.textured(U.tex.carpet, { rough: 1, color: 0x9a7f77 }), 3.412);
    bed(-8.6, 8.5, 1.8, 2.6, U.mat(0x6f4f5c), true, 3.4);
    nightstand(-10.4, 9.3, U.mat(0x3d2d20), 3.4);
    // günlük
    const diary = U.box(0.24, 0.05, 0.32, U.mat(0x7a4b3a));
    diary.position.set(-10.4, 4.09, 9.3); diary.rotation.y = 0.3; WORLD.group.add(diary);
    const diaryHit = hitbox(-10.4, 4.25, 9.3, 0.5, 0.5, 0.55);
    addInteractable('diary', diaryHit, 'Günlüğü oku', 2.5);
    // gardırop (saklanma)
    const elifCloset = wardrobe(-11.25, 4.2, 3.4);
    addInteractable('closet_elif', elifCloset.hit, 'Gardıroba saklan', 2.6);
    WORLD.closets.elif = { pos: new THREE.Vector3(-11.35, 3.4, 4.2), yaw: -Math.PI / 2 };
    // küçük masa + çizim
    table(-10, 2.2, 1.1, 0.7, 0.52, 3.4);
    const draw2 = U.plane(0.42, 0.32, U.textured(U.tex.drawing, { rough: 1 }));
    draw2.rotation.x = -Math.PI / 2; draw2.position.set(-10, 3.932, 2.2); WORLD.group.add(draw2);
    // oyuncaklar
    const teddy = new THREE.Group();
    const tb = U.sph(0.15, U.mat(0x8a7048)); teddy.add(tb);
    const th = U.sph(0.11, U.mat(0x8a7048)); th.position.y = 0.21; teddy.add(th);
    [-0.08, 0.08].forEach(ox => {
      const ear = U.sph(0.05, U.mat(0x8a7048)); ear.position.set(ox, 0.3, 0); teddy.add(ear);
    });
    teddy.position.set(-5.2, 3.58, 8.4); teddy.rotation.y = 0.5; WORLD.group.add(teddy);
    const toyHit = hitbox(-5.2, 3.75, 8.4, 0.7, 0.6, 0.7);
    addInteractable('toy_rabbit', toyHit, 'Oyuncak tavşanı incele', 2.4);
    // bloklar
    for (let i = 0; i < 7; i++) {
      const bl = U.box(0.16, 0.16, 0.16, U.mat(U.pick([0x8b3a32, 0x33506b, 0x7a6a32, 0x3d5a3d])));
      bl.position.set(-6.5 + U.rand(-0.6, 0.6), 3.48 + (i > 3 ? 0.16 : 0), 7 + U.rand(-0.5, 0.5));
      bl.rotation.y = U.rand(0, 2); WORLD.group.add(bl);
    }
    // duvar çizimi
    const wallDraw = U.plane(0.9, 0.7, U.textured(U.tex.drawing, { rough: 1 }));
    wallDraw.position.set(-11.87, 5.2, 7.5); wallDraw.rotation.y = Math.PI / 2; WORLD.group.add(wallDraw);
    // tozlu plastik örtü
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.0), M.plastic);
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(-7.4, 5.3, 4.5); sheet.rotation.z = 0.2;
    WORLD.group.add(sheet);

    /* KEMAL'İN ODASI */
    bed(-9.6, -5.4, 1.8, 2.4, M.fabricDark, false, 3.4);
    nightstand(-11.0, -4.6, U.mat(0x3d2d20), 3.4);
    const fuseBed = fuseObject(-11.0, 4.18, -4.6);
    WORLD.fuseMeshes.bedroom = fuseBed;
    const fbHit = hitbox(-11.0, 4.3, -4.6, 0.55, 0.5, 0.55);
    addInteractable('fuse_bedroom', fbHit, 'Komodinin gözünü aç', 2.5);
    const kemalCloset = wardrobe(-11.25, -8.25, 3.4);
    addInteractable('closet_kemal', kemalCloset.hit, 'Dolaba saklan', 2.6);
    WORLD.closets.kemal = { pos: new THREE.Vector3(-11.35, 3.4, -8.25), yaw: -Math.PI / 2 };
    // radyo
    const radio = U.box(0.42, 0.26, 0.22, U.mat(0x5a4a34));
    radio.position.set(-11.0, 4.06, -4.6); WORLD.group.add(radio);
    const radioFace = U.plane(0.36, 0.18, U.textured(U.tex.radioFace, { rough: 0.7 }));
    radioFace.position.set(-11.0, 4.08, -4.48); WORLD.group.add(radioFace);
    const radioHit = hitbox(-11.0, 4.15, -4.6, 0.6, 0.5, 0.5);
    addInteractable('radio', radioHit, 'Radyoyu aç', 2.4);
    chair(-5.5, -5.8, 0.8, 3.4);
    const fileCab2 = U.box(0.6, 1.2, 0.5, U.mat(0x4d4a40));
    fileCab2.position.set(-3.5, 4.0, -7.9); WORLD.group.add(fileCab2);
    addCollider(-3.5, 4.0, -7.9, 0.3, 0.6, 0.25);
    paperDebris(-8, -6, 5, 2, 3.4);

    /* BANYO */
    toilet(2.6, -7.4, 0, 3.4);
    bathtub(4.6, -8.1, 3.4);
    toiletSink(4.2, -3.0, 0, 3.4);
    const fuseBath = fuseObject(4.35, 4.26, -3.0);
    WORLD.fuseMeshes.bath = fuseBath;
    const bathHit = hitbox(4.2, 4.4, -2.7, 0.8, 0.6, 0.6);
    addInteractable('fuse_bath', bathHit, 'Banyo dolabını aç', 2.4);
    const mirrorB = U.box(0.7, 0.8, 0.03, U.mat(0x9aa7aa, { rough: 0.1, metal: 0.8 }));
    mirrorB.position.set(4.2, 5.05, -3.32); WORLD.group.add(mirrorB);
    // banyo örtüsü
    const towel = U.box(0.5, 0.8, 0.04, U.mat(0x6b6a5f)); towel.position.set(6.8, 4.8, -6.5); WORLD.group.add(towel);

    /* ÜST KAT HOL / OYUN ODASI */
    rug(0, 3, 2.2, 5.2, U.textured(U.tex.carpet, { rough: 1 }), 3.412);
    // aile fotoğrafları
    for (let i = 0; i < 2; i++) {
      const f = U.box(0.04, 0.4, 0.34, M.trim); f.position.set(1.86, 5.2, 3.6 - i * 0.7); WORLD.group.add(f);
    }
    // oyun çadırı
    const tentMat = U.mat(0x6f4d46, { rough: 1 });
    const tent = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.4, 4, 1, true), tentMat);
    tent.position.set(7.6, 4.1, 7.2); tent.rotation.y = Math.PI / 4; tent.castShadow = true; WORLD.group.add(tent);
    addCollider(7.6, 4.1, 7.2, 0.7, 0.7, 0.7);
    // oyuncak sandığı
    const chest = U.box(1.0, 0.5, 0.5, U.mat(0x54412c));
    chest.position.set(4.3, 3.68, 9.0); WORLD.group.add(chest);
    addCollider(4.3, 3.68, 9.0, 0.5, 0.25, 0.25);
    // eski bebek evi
    const dollHouse = U.box(0.7, 0.6, 0.4, U.mat(0x8c7a5f));
    dollHouse.position.set(9.8, 3.7, 8.2); WORLD.group.add(dollHouse);
    addCollider(9.8, 3.7, 8.2, 0.35, 0.3, 0.2);
    // üst kat kutular
    for (let i = 0; i < 2; i++) {
      const c = U.box(0.5, 0.5, 0.5, U.mat(0x514232));
      c.position.set(3.0 + i * 0.6, 3.65 + i * 0.5, 4.7); WORLD.group.add(c);
    }
    addCollider(3.3, 3.7, 4.7, 0.5, 0.4, 0.3);
  }

  function fuseObject(x, y, z) {
    const g = new THREE.Group();
    const fus = U.cyl(0.055, 0.055, 0.2, 10, U.mat(0xcfc4a8, { emissive: 0x554422, emissiveIntensity: 0.8 }));
    fus.rotation.z = Math.PI / 2; g.add(fus);
    const cap1 = U.cyl(0.06, 0.06, 0.03, 8, M.brass); cap1.rotation.z = Math.PI / 2; cap1.position.x = 0.11; g.add(cap1);
    const cap2 = cap1.clone(); cap2.position.x = -0.11; g.add(cap2);
    const l = new THREE.PointLight(0xffcc77, 0.22, 1.8, 2); g.add(l);
    g.position.set(x, y, z); WORLD.group.add(g);
    return g;
  }

  function buildBasement() {
    const yBase = -3.2, yTop = -0.35, H = yTop - yBase;
    // katlar
    const bf = U.plane(18, 6.6, U.mat(0x3b3630, { rough: 1 }));
    bf.rotation.x = -Math.PI / 2; bf.position.set(3, yBase + 0.01, -12); WORLD.group.add(bf);
    // iniş sahanlığı
    solid(3.0, 0.12, 0.7, 4.5, yBase, -8.75, U.mat(0x4d4a42));
    // duvarlar
    const bw = M.basementWall;
    wallX(-6, -15, -9, yBase, H, bw);
    wallX(12, -15, -9, yBase, H, bw);
    wallZ(-15, -6, 12, yBase, H, bw);
    wallZ(-9, -6, 3.45, yBase, H, bw);
    wallZ(-9, 5.55, 12, yBase, H, bw);
    // tavan
    const bc = U.plane(18, 6.2, M.ceilingDark);
    bc.rotation.x = Math.PI / 2; bc.position.set(3, yTop, -12); WORLD.group.add(bc);
    // bodrum kapısı çevresi
    doorFrameZ(-9, 4.5, 2.0, 2.2);

    // kirişler
    for (let i = 0; i < 4; i++) {
      solid(17.5, 0.18, 0.18, 3, yTop - 0.2, -10.2 - i * 1.5, M.trim, { collide: false });
    }

    // verici / atölye
    const bench = U.box(3.2, 0.1, 1.0, U.mat(0x4b3827));
    bench.position.set(-1, -2.6, -12.0); WORLD.group.add(bench);
    for (let i = 0; i < 4; i++) {
      const leg = U.box(0.08, 0.55, 0.08, M.trim);
      leg.position.set(-2.3 + (i % 2) * 2.6, -2.9, -12.0 + (i > 1 ? 0.4 : -0.4)); WORLD.group.add(leg);
    }
    addCollider(-1, -2.9, -12, 1.6, 0.4, 0.5);

    // verici cihazı
    const rig = new THREE.Group();
    const boxMain = U.box(0.9, 0.45, 0.6, U.mat(0x44463f)); rig.add(boxMain);
    const boxTop = U.box(0.7, 0.2, 0.45, U.mat(0x5a5b4e)); boxTop.position.y = 0.32; rig.add(boxTop);
    for (let i = 0; i < 3; i++) {
      const dial = U.cyl(0.07, 0.07, 0.03, 12, M.brass);
      dial.rotation.x = Math.PI / 2; dial.position.set(-0.25 + i * 0.25, 0.05, 0.31); rig.add(dial);
    }
    const ant = U.cyl(0.012, 0.012, 1.3, 6, M.metal);
    ant.position.set(0.35, 0.9, -0.1); ant.rotation.z = -0.2; rig.add(ant);
    const freq = U.plane(0.4, 0.16, U.textured(U.tex.radioFace, { rough: 0.8 }));
    freq.position.set(0, -0.05, 0.305); rig.add(freq);
    const verLight = new THREE.PointLight(0xff5533, 0.35, 4, 2); verLight.position.set(0, 0.2, 0.4); rig.add(verLight);
    rig.position.set(-1, -2.35, -12.0);
    WORLD.group.add(rig);
    const rigHit = hitbox(-1, -2.3, -11.8, 1.1, 0.8, 0.7);
    addInteractable('transmitter', rigHit, 'Vericiyi incele', 2.6);

    // kaset kayıt cihazı + kaset
    const recorder = U.box(0.55, 0.16, 0.35, U.mat(0x3a3832));
    recorder.position.set(-2.5, -2.53, -11.6); recorder.rotation.y = 0.3; WORLD.group.add(recorder);
    const tape = U.box(0.26, 0.05, 0.16, U.mat(0x8a7a58, { emissive: 0x2a2110, emissiveIntensity: 0.5 }));
    tape.position.set(-2.4, -2.43, -11.5); tape.rotation.y = 0.3; WORLD.group.add(tape);
    const tapeGlow = new THREE.PointLight(0xffaa66, 0.5, 3, 2);
    tapeGlow.position.set(-2.4, -2.25, -11.5); WORLD.group.add(tapeGlow);
    const tapeHit = hitbox(-2.4, -2.3, -11.5, 0.6, 0.5, 0.5);
    addInteractable('tape', tapeHit, 'Kaseti incele', 2.4);

    // yatak / sandalye
    const cot = U.box(1.8, 0.3, 0.8, M.trim); cot.position.set(7.0, -3.0, -12.8); WORLD.group.add(cot);
    const cotMat = U.box(1.65, 0.15, 0.7, M.sheet); cotMat.position.set(7.0, -2.82, -12.8); WORLD.group.add(cotMat);
    chair(4.0, -12.0, Math.PI, yBase);
    // duvar panosu
    const bboard = U.box(3.2, 1.4, 0.06, U.mat(0x46382a));
    bboard.position.set(-2, -1.7, -14.85); WORLD.group.add(bboard);
    for (let i = 0; i < 4; i++) {
      const p = U.plane(0.45, 0.65, U.textured(U.tex.poster, { rough: 1 }));
      p.position.set(-3.2 + i * 0.8, -1.7, -14.8); p.rotation.z = U.rand(-0.05, 0.05);
      p.rotation.y = 0; WORLD.group.add(p);
    }
    const bboardHit = hitbox(-2, -1.7, -14.6, 3.2, 1.5, 0.4);
    addInteractable('basementBoard', bboardHit, 'Duvardaki ilanlara bak', 2.8);
    // raflar, kutular
    const shelf2 = U.box(2.2, 2.0, 0.5, U.mat(0x40372b));
    shelf2.position.set(10.6, -2.2, -11.0); WORLD.group.add(shelf2);
    addCollider(10.6, -2.2, -11.0, 1.1, 1.0, 0.25);
    for (let s = 0; s < 3; s++) {
      const st = U.box(2.0, 0.05, 0.4, M.trim); st.position.set(10.6, -2.9 + s * 0.6, -11.0); WORLD.group.add(st);
    }
    crates(-5, -10.2, 2);
    paperDebris(0, -11, 18, 4);
    // askı ampulü
    const wire2 = U.box(0.015, 0.7, 0.015, M.metalDark); wire2.position.set(1, -0.75, -11.5); WORLD.group.add(wire2);
    const bulb2 = U.sph(0.08, M.glow); bulb2.position.set(1, -1.13, -11.5); WORLD.group.add(bulb2);
    WORLD.basementBulb = bulb2;
    const basementHalo = U.glowSprite(0xff9a66, 1.5, 0.34);
    basementHalo.position.set(1, -1.13, -11.5); WORLD.group.add(basementHalo);
    // bodrum ışığı zayıf kırmızı
    const bl = new THREE.PointLight(0xcc5533, 0.55, 8, 2);
    bl.position.set(1, -1.4, -12); WORLD.group.add(bl);
    WORLD.basementLight = bl;
  }

  function buildDoors() {
    // arka kapı
    hingeDoor('back', { x: -0.9, z: -9 }, 1.8, 2.2, M.door, 1, 0.22, 0.22);
    WORLD.doors.back.startAjar = true;
    WORLD.doors.back.target = 1.75;
    WORLD.doors.back.collider.off = true;
    // çalışma odası kapısı
    hingeDoor('study', { x: -2, z: -5.2 }, 1.8, 2.2, M.door, 1, 0, 0);
    // kapı kanadı z ekseninde olduğu için özel yön
    const st = WORLD.doors.study;
    // yeniden inşa: kapı z ekseninde
    st.group.clear();
    const doorS = U.box(0.09, 2.2, 1.8, M.door);
    doorS.position.set(0, 1.1, 0.9);
    st.group.add(doorS);
    const insetS = U.box(0.02, 1.1, 1.1, U.mat(0x3b2a1c));
    insetS.position.set(0.055, 1.2, 0.9);
    st.group.add(insetS);
    const knobS = U.sph(0.04, M.brass); knobS.position.set(0.08, 1.05, 1.64); st.group.add(knobS);
    st.group.position.set(-2, 0, -5.2);
    st.group.rotation.y = 0;
    st.closedAngle = 0;
    st.target = 0;
    st.current = 0;
    st.collider.off = false;
    st.collider.minX = -2.06; st.collider.maxX = -1.94;
    st.collider.minZ = -5.2; st.collider.maxZ = -3.4;
    st.collider.minY = 0; st.collider.maxY = 2.2;
    st.collider.cx = -2; st.collider.cz = -4.3;
    // bodrum kapısı
    hingeDoor('basement', { x: 3.45, z: -9 }, 2.0, 2.2, M.metalDark, 1, 0, 0, -3.2);
    const bd = WORLD.doors.basement;
    bd.collider.minY = -3.2; bd.collider.maxY = -1.0;
    bd.locked = true;
    // kapı üstü kırmızı led
    const bled = U.sph(0.04, U.mat(0x4a1010, { emissive: 0xff2200, emissiveIntensity: 2.5 }));
    bled.position.set(5.35, -1.25, -8.9); WORLD.group.add(bled);
    WORLD.basementLED = bled;
    const bdHit = hitbox(4.5, -2.1, -8.8, 2.0, 2.2, 0.5);
    addInteractable('basementDoor', bdHit, 'Bodrum kapısını aç', 2.6);

    const stHit = hitbox(-1.95, 1.1, -4.3, 0.4, 2.2, 1.6);
    addInteractable('studyDoor', stHit, 'Çalışma odası kapısı', 2.6);
  }

  function buildLights(scene) {
    const hemi = new THREE.HemisphereLight(0x3d4d63, 0x0a0c0a, 0.55);
    scene.add(hemi);

    const moon = new THREE.DirectionalLight(0xa8bfe0, 0.5);
    moon.position.set(18, 28, -20);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -28; moon.shadow.camera.right = 28;
    moon.shadow.camera.top = 28; moon.shadow.camera.bottom = -28;
    moon.shadow.camera.near = 1; moon.shadow.camera.far = 80;
    moon.shadow.bias = -0.0008;
    scene.add(moon);
    WORLD.moon = moon;

    // pencere içi soğuk ışıklar
    const wl = [
      [-8, 2.0, 8.9], [6, 2.0, 8.9], [-11.2, 2.0, 6], [5, 2.0, -4],
      [-8, 5.3, 8.9], [5.5, 5.3, 8.9], [-11.2, 5.3, 6], [-11.2, 5.3, -4]
    ];
    wl.forEach(([x, y, z], i) => {
      const pl = new THREE.PointLight(0x6f8cae, 0.27, 6.5, 2);
      pl.position.set(x, y, z);
      scene.add(pl);
      WORLD.windowLights.push(pl);
    });

    // başlangıçta kapalı pratik ışıklar
    function makeLamp(name, x, y, z, color, intensity, dist) {
      const l = new THREE.PointLight(color, 0, dist, 2);
      l.position.set(x, y, z);
      scene.add(l);

      const cord = U.cyl(0.008, 0.008, 0.6, 5, M.metalDark, false);
      cord.position.set(x, y + 0.36, z); WORLD.group.add(cord);
      const shade = U.cyl(0.1, 0.2, 0.14, 10, U.mat(0x29241d, { rough: 0.92 }), false);
      shade.position.set(x, y + 0.13, z); WORLD.group.add(shade);
      const bulb = U.sph(0.045, M.bulbOff, false);
      bulb.position.set(x, y, z); WORLD.group.add(bulb);
      const glow = U.glowSprite(color, 1.35, 0);
      glow.position.set(x, y, z); glow.visible = false; WORLD.group.add(glow);

      l.userData.bulb = bulb;
      l.userData.glow = glow;
      l.userData.glowBase = 0.34;
      WORLD.practicalLights.push({ light: l, base: intensity, name, flicker: Math.random() < 0.35 });
      WORLD.lights[name] = l;
      return l;
    }
    makeLamp('hall', 0, 2.7, 4, 0xffd9a0, 0.75, 8);
    makeLamp('living', -8, 2.6, 5.5, 0xffd2a0, 0.85, 9);
    makeLamp('kitchen', 5, 2.5, 4.5, 0xffe0b0, 0.8, 9);
    makeLamp('utility', 7.5, 2.6, -5.5, 0xffe0b0, 0.7, 8);
    makeLamp('study', -7, 2.5, -4, 0xffd9a0, 0.65, 8);
    makeLamp('elif', -8, 5.7, 6, 0xffc9a8, 0.75, 9);
    makeLamp('kemal', -8, 5.7, -4.5, 0xffc9a8, 0.65, 8);
    makeLamp('bath', 4.5, 5.7, -5.5, 0xdfe8e6, 0.55, 7);
    makeLamp('landing', 8, 5.7, 0, 0xffd9a0, 0.7, 8);
    makeLamp('basement', 1, -0.8, -12, 0xffb080, 0.8, 9);
  }

  function buildWeather(scene) {
    // yağmur (bahçe)
    const count = 1000;
    const pos = new Float32Array(count * 6);
    let sx = 0, sz = 0;
    for (let i = 0; i < count; i++) {
      do { sx = U.rand(-24, 24); sz = U.rand(-30, 16); } while (!rainOutside(sx, sz));
      const x = sx, z = sz, y = U.rand(0, 15);
      pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
      pos[i * 6 + 3] = x; pos[i * 6 + 4] = y + 0.55; pos[i * 6 + 5] = z + 0.05;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x9fb6c8, transparent: true, opacity: 0.22 });
    const rain = new THREE.LineSegments(geo, rainMat);
    scene.add(rain);
    WORLD.rain = rain;

    // iç mekân toz
    const dcount = 520;
    const dp = new Float32Array(dcount * 3);
    for (let i = 0; i < dcount; i++) {
      dp[i * 3] = U.rand(-11.5, 11.5);
      dp[i * 3 + 1] = U.rand(0.2, 6.2);
      dp[i * 3 + 2] = U.rand(-8.5, 9.5);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dm = new THREE.PointsMaterial({ color: 0xc8c0aa, size: 0.018, transparent: true, opacity: 0.33, depthWrite: false });
    const dust = new THREE.Points(dg, dm);
    scene.add(dust);
    WORLD.dust = dust;
  }

  /* ---------- kat yüksekliği ---------- */
  const FOOT = { x0: -11.9, x1: 11.9, z0: -8.9, z1: 9.9 };
  function inMainStair(x, z) { return x > 9.55 && x < 11.85 && z > -8 && z < -3; }
  function inBaseStair(x, z) { return x > 3 && x < 6 && z > -8.4 && z < -3; }
  function inBasement(x, z) { return x > -6 && x < 12 && z > -15 && z < -8.4; }

  WORLD.floorHeight = function (x, z, feetY) {
    const cands = [];
    const inside = x > FOOT.x0 && x < FOOT.x1 && z > FOOT.z0 && z < FOOT.z1;
    if (inside) {
      if (inMainStair(x, z)) {
        cands.push(3.4 * ((-z - 3) / 5));
      } else if (inBaseStair(x, z)) {
        cands.push(-3.2 * ((-3 - z) / 5.4));
      } else {
        cands.push(0);
      }
      if (!inMainStair(x, z)) cands.push(3.4);
    }
    if (inBasement(x, z) && feetY < -0.4) cands.push(-3.2);
    if (cands.length === 0) cands.push(0);
    const sorted = cands.slice().sort((a, b) => b - a);
    const valid = sorted.filter(h => h <= feetY + 0.78);
    if (valid.length) return valid[0];
    return sorted[sorted.length - 1];
  };

  WORLD.isInside = function (x, z) {
    return x > FOOT.x0 && x < FOOT.x1 && z > FOOT.z0 && z < FOOT.z1;
  };
  WORLD.isInBasement = function (x, z, y) {
    return inBasement(x, z) && y < -1.2;
  };

  /* ---------- etkileşim / durum ---------- */
  WORLD.getInteractable = function (id) {
    return WORLD.interactables.find(i => i.id === id);
  };
  WORLD.disableInteractable = function (id) {
    const it = WORLD.getInteractable(id);
    if (it) { it.used = true; }
  };
  WORLD.hideFuse = function (id) {
    const m = WORLD.fuseMeshes[id];
    if (m) m.visible = false;
    WORLD.disableInteractable('fuse_' + (id === 'bedroom' ? 'bedroom' : id));
  };
  WORLD.openBackDoor = function () {
    const d = WORLD.doors.back;
    if (!d) return;
    d.target = 1.75;
    d.collider.off = true;
  };
  WORLD.unlockStudy = function () {
    const d = WORLD.doors.study;
    if (!d || d.unlocked) return;
    d.unlocked = true;
    d.target = -1.65;
    d.collider.off = true;
    SFX.doorOpen();
  };
  WORLD.unlockBasement = function () {
    const d = WORLD.doors.basement;
    if (!d || d.unlocked) return;
    d.unlocked = true;
    d.target = 1.65;
    d.collider.off = true;
    if (WORLD.basementLED) WORLD.basementLED.material = U.mat(0x0d3a12, { emissive: 0x33ff66, emissiveIntensity: 2.2 });
    SFX.doorOpen();
  };
  WORLD.setPower = function (on) {
    WORLD.powerOn = on;
    if (on) {
      SFX.powerOn();
      if (WORLD.fuseLED) WORLD.fuseLED.material = U.mat(0x0d3a12, { emissive: 0x33ff66, emissiveIntensity: 2.2 });
      WORLD.practicalLights.forEach((p, i) => {
        setTimeout(() => {
          if (!p.light) return;
          p.light.intensity = p.base * (0.85 + Math.random() * 0.15);
          if (p.light.userData.bulb) p.light.userData.bulb.material = M.glow;
        }, 900 + i * 260);
      });
      if (WORLD.basementLight) WORLD.basementLight.intensity = 1.1;
      if (WORLD.basementBulb) WORLD.basementBulb.material = M.glow;
    } else {
      WORLD.practicalLights.forEach(p => {
        p.light.intensity = 0;
        if (p.light.userData.bulb) p.light.userData.bulb.material = M.bulbOff;
        if (p.light.userData.glow) p.light.userData.glow.visible = false;
      });
    }
  };

  WORLD.update = function (dt, t) {
    WORLD.time += dt;
    // kapı animasyonu
    for (const k in WORLD.doors) {
      const d = WORLD.doors[k];
      if (Math.abs(d.target - d.current) > 0.001) {
        const dir = Math.sign(d.target - d.current);
        d.current += dir * dt * d.speed;
        if ((dir > 0 && d.current > d.target) || (dir < 0 && d.current < d.target)) d.current = d.target;
        d.group.rotation.y = d.current;
      }
    }
    // ampul titremesi
    for (const p of WORLD.practicalLights) {
      if (p.flicker && p.light.intensity > 0.01) {
        const f = 0.82 + 0.18 * Math.sin(t * 17 + p.base * 30) * Math.sin(t * 3.3);
        p.light.intensity = p.base * f;
      }
      const glow = p.light.userData.glow;
      if (glow) {
        const k = p.light.intensity > 0.01 ? U.clamp(p.light.intensity / p.base, 0, 1.35) : 0;
        glow.visible = k > 0.02;
        if (glow.visible) {
          glow.material.opacity = (p.light.userData.glowBase || 0.34) * k * (0.94 + 0.06 * Math.sin(t * 9 + p.base * 17));
        }
      }
    }
    // yağmur
    if (WORLD.rain) {
      const arr = WORLD.rain.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 6) {
        const fall = dt * 14;
        arr[i + 1] -= fall; arr[i + 4] -= fall;
        if (arr[i + 1] < -0.5) {
          let nx = U.rand(-24, 24), nz = U.rand(-30, 16);
          let guard = 0;
          while (!rainOutside(nx, nz) && guard++ < 12) { nx = U.rand(-24, 24); nz = U.rand(-30, 16); }
          const ny = U.rand(9, 15);
          arr[i] = nx; arr[i + 1] = ny; arr[i + 2] = nz;
          arr[i + 3] = nx; arr[i + 4] = ny + 0.55; arr[i + 5] = nz + 0.05;
        }
      }
      WORLD.rain.geometry.attributes.position.needsUpdate = true;
    }
    // toz
    if (WORLD.dust) {
      WORLD.dust.rotation.y = t * 0.012;
      WORLD.dust.material.opacity = 0.25 + 0.08 * Math.sin(t * 0.4);
    }
  };

  WORLD.setRainVisible = function (v) {
    if (WORLD.rain) WORLD.rain.visible = v;
  };

  WORLD.build = build;

  return WORLD;
})();
