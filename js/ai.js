/* Komşu: devriye, duyma, görme, şüphe, kovalama ve arama */
window.AI = (function () {
  const A = {
    pos: new THREE.Vector3(-7.5, 0, 7.6),
    yaw: 0, state: 'patrol',
    suspicion: 0, lastKnown: null, targetPos: null,
    routeIndex: 0, waitTimer: 0, searchTimer: 0, loseTimer: 0,
    idleLook: 0, walkPhase: 0, stepTimer: 0, sayTimer: 0,
    catching: false, enabled: true, mesh: null,
    difficulty: 'normal', diff: null,
    lastHeard: 0, closetWatch: 0, group: null
  };

  const DIFFS = {
    easy: { patrol: 1.25, chase: 3.45, vision: 8.2, fov: 1.35, rate: 0.72, hear: 0.68, lose: 4.2 },
    normal: { patrol: 1.5, chase: 4.15, vision: 10.6, fov: 1.72, rate: 1.0, hear: 1.0, lose: 5.4 }
  };

  const ROUTE = [
    [-8.5, 8.0, 2.4], [-8.5, 4.6], [-5.5, 4.6], [-3.2, 6.3], [0.5, 6.3],
    [4.8, 7.4], [8.8, 5.0], [9.6, 0.4], [8.0, 0.4], [6.8, -1.0],
    [6.8, -3.2], [8.2, -7.2, 1.8], [6.8, -3.2], [10.6, -3.4],
    [10.7, -5.5], [10.7, -8.4], [8.2, -8.4], [8.2, -4.8],
    [5.6, -4.8, 1.4], [8.2, -4.8], [8.2, 0.4], [4.8, 2.2],
    [5.0, 4.6], [7.8, 5.6, 1.4], [5.0, 4.6], [4.8, 2.2],
    [0.5, 0.4], [-0.6, 4.0], [-0.6, 6.3], [-4.5, 6.3, 1.8],
    [-0.6, 6.3], [-0.6, 0.0], [-0.6, -4.3], [-4.5, -4.3, 1.8],
    [-0.6, -4.3], [-0.6, -7.7, 1.6], [0.5, -7.7], [0.5, -4.0],
    [0.5, 0.0], [8.2, 0.4], [8.2, -4.0], [8.2, -8.4],
    [10.7, -8.4], [10.7, -6.0], [10.7, -3.3], [6.8, -3.2],
    [6.8, -1.0], [8.8, 5.0], [4.8, 7.4], [0.5, 6.3],
    [-3.2, 6.3], [-5.5, 4.6], [-8.5, 4.6]
  ];

  const ray = new THREE.Raycaster();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  let legL, legR, armL, armR, head, flashLight, flashTarget;
  let catchCallback = null, seenCallback = null;

  function init(scene) {
    A.diff = DIFFS[A.difficulty];
    const g = new THREE.Group();

    const coat = U.mat(0x2b2f35, { rough: 0.96 });
    const trousers = U.mat(0x20242a, { rough: 1 });
    const skin = U.mat(0xac8a72, { rough: 0.85 });
    const hair = U.mat(0x2a2622, { rough: 1 });
    const shoes = U.mat(0x141414, { rough: 0.9 });

    const torso = U.box(0.64, 0.82, 0.38, coat); torso.position.y = 1.22; g.add(torso);
    const collar = U.box(0.5, 0.12, 0.3, U.mat(0x3a3f46)); collar.position.y = 1.62; g.add(collar);
    const hips = U.box(0.56, 0.22, 0.34, trousers); hips.position.y = 0.79; g.add(hips);

    head = new THREE.Group();
    const skull = U.sph(0.155, skin); skull.position.y = 0; head.add(skull);
    const cap = U.sph(0.16, hair); cap.scale.set(1, 0.62, 1); cap.position.y = 0.09; head.add(cap);
    const nose = U.box(0.05, 0.06, 0.06, skin); nose.position.set(0, -0.015, -0.15); head.add(nose);
    head.position.y = 1.76; g.add(head);

    function limb(x, y, w, h, d, mat, childY) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const seg = U.box(w, h, d, mat);
      seg.position.y = childY;
      pivot.add(seg);
      g.add(pivot);
      return pivot;
    }
    legL = limb(-0.17, 0.78, 0.2, 0.78, 0.24, trousers, -0.39);
    legR = limb(0.17, 0.78, 0.2, 0.78, 0.24, trousers, -0.39);
    const shoeL = U.box(0.22, 0.1, 0.34, shoes); shoeL.position.set(-0.17, 0.05, -0.05); g.add(shoeL);
    const shoeR = shoeL.clone(); shoeR.position.x = 0.17; g.add(shoeR);
    armL = limb(-0.4, 1.55, 0.16, 0.72, 0.19, coat, -0.34);
    armR = limb(0.4, 1.55, 0.16, 0.72, 0.19, coat, -0.34);
    const handL = U.sph(0.07, skin); handL.position.y = -0.72; armL.add(handL);
    const handR = handL.clone(); armR.add(handR);

    // el feneri
    const torch = U.cyl(0.045, 0.055, 0.22, 8, U.mat(0x3a3d40, { rough: 0.5, metal: 0.5 }));
    torch.rotation.x = Math.PI / 2; torch.position.set(0, -0.74, -0.1); armR.add(torch);

    flashLight = new THREE.SpotLight(0xffd9a4, 1.35, 16, 0.42, 0.55, 1.2);
    flashLight.position.set(0.34, 1.42, -0.05);
    flashTarget = new THREE.Object3D();
    flashTarget.position.set(0.34, 0.9, -6);
    g.add(flashTarget);
    flashLight.target = flashTarget;
    flashLight.castShadow = false;
    g.add(flashLight);

    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.copy(A.pos);
    scene.add(g);
    A.group = g;
    A.mesh = g;

    window.addEventListener('keydown', e => {
      if (e.code === 'KeyH' && window.DEBUG) debugTeleport();
    });

    return A;
  }

  function setDifficulty(d) {
    A.difficulty = DIFFS[d] ? d : 'normal';
    A.diff = DIFFS[A.difficulty];
  }

  function say(text, dur = 3.2) {
    if (A.sayTimer > 0) return;
    A.sayTimer = dur;
    if (window.UI) UI.subtitle('KEMAL', text, dur);
  }

  function hear(pos, radius) {
    if (!A.enabled || (A.state === 'chase')) return;
    const r = radius * A.diff.hear;
    const d = A.pos.distanceTo(pos);
    if (d > r) return;
    if (Math.abs(pos.y - A.pos.y) > 1.5) return;
    if (!WORLD.isInside(pos.x, pos.z)) return;
    if (WORLD.isInBasement(pos.x, pos.z, pos.y)) return;
    A.lastKnown = pos.clone();
    A.targetPos = pos.clone();
    A.state = 'investigate';
    A.waitTimer = 0;
    A.searchTimer = 0;
    A.lastHeard = WORLD.time;
  }

  function canSee() {
    if (PLAYER.hidden) return false;
    const eye = tmp.set(A.pos.x, A.pos.y + 1.62, A.pos.z);
    const pe = PLAYER.getEye();
    const dist = eye.distanceTo(pe);
    let maxD = A.diff.vision;
    if (PLAYER.crouch) maxD *= 0.66;
    if (PLAYER.sprinting) maxD *= 1.12;
    if (dist > maxD) return false;
    if (Math.abs(PLAYER.pos.y - A.pos.y) > 1.6) return false;

    const dx = pe.x - eye.x, dz = pe.z - eye.z;
    const len = Math.hypot(dx, dz) || 1;
    const fx = -Math.sin(A.yaw), fz = -Math.cos(A.yaw);
    const dot = (dx / len) * fx + (dz / len) * fz;
    const cone = PLAYER.crouch ? Math.cos(A.diff.fov * 0.32) : Math.cos(A.diff.fov * 0.5);
    if (dot < cone) return false;

    tmp2.set(pe.x - eye.x, pe.y - eye.y, pe.z - eye.z).normalize();
    ray.set(eye, tmp2);
    ray.far = dist;
    const hits = ray.intersectObjects(WORLD.occluders, false);
    if (hits.length && hits[0].distance < dist - 0.35) return false;
    return true;
  }

  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function yawToward(x, z) {
    return Math.atan2(-(x - A.pos.x), -(z - A.pos.z));
  }

  function walkToward(tx, tz, speed, dt) {
    const dx = tx - A.pos.x, dz = tz - A.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) return dist;
    const nx = dx / dist, nz = dz / dist;
    const step = Math.min(dist, speed * dt);
    A.pos.x += nx * step;
    A.pos.z += nz * step;
    const fh = WORLD.floorHeight(A.pos.x, A.pos.z, A.pos.y);
    A.pos.y = U.lerp(A.pos.y, fh, Math.min(1, dt * 12));
    A.yaw = angleLerp(A.yaw, yawToward(tx, tz), Math.min(1, dt * 7));
    A.walkPhase += dt * (speed * 3.2);
    A.stepTimer -= dt;
    if (A.stepTimer <= 0) {
      A.stepTimer = speed > 2.5 ? 0.34 : 0.55;
      SFX.aiStep(speed > 2.5 ? 0.1 : 0.055);
    }
    return dist;
  }

  function routeTarget() {
    const n = ROUTE[A.routeIndex % ROUTE.length];
    return { x: n[0], z: n[1], pause: n[2] || 0 };
  }

  function advanceRoute() {
    A.routeIndex = (A.routeIndex + 1) % ROUTE.length;
    A.waitTimer = 0;
  }

  function nearestRouteIndex() {
    let best = 0, bd = Infinity;
    for (let i = 0; i < ROUTE.length; i++) {
      const d = Math.hypot(ROUTE[i][0] - A.pos.x, ROUTE[i][1] - A.pos.z);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function enterChase() {
    if (A.state === 'chase') return;
    A.state = 'chase';
    A.suspicion = 1;
    A.loseTimer = 0;
    SFX.stinger();
    SFX.shout();
    say('Seni gördüm! Buradan çık!', 3);
    if (window.UI) UI.dangerFlash();
  }

  function catchPlayer() {
    if (A.catching) return;
    A.catching = true;
    if (catchCallback) catchCallback();
  }

  function lookAround(dt, rate = 0.9) {
    A.idleLook += dt;
    A.yaw += Math.sin(A.idleLook * 1.4) * rate * dt;
    A.walkPhase += dt * 1.2;
  }

  function bodyPose(dt, moving) {
    if (!A.group) return;
    A.group.position.set(A.pos.x, A.pos.y, A.pos.z);
    A.group.rotation.y = A.yaw;
    const amp = moving ? 0.55 : 0.06;
    const s = Math.sin(A.walkPhase);
    legL.rotation.x = s * amp;
    legR.rotation.x = -s * amp;
    armL.rotation.x = -s * amp * 0.8;
    armR.rotation.x = s * amp * 0.4 - 0.35;
    flashLight.intensity = A.state === 'chase' ? 2.0 : 1.3;
  }

  function reset() {
    A.pos.set(-7.5, 0, 7.6);
    A.yaw = 0;
    A.state = 'patrol';
    A.suspicion = 0;
    A.routeIndex = 0;
    A.waitTimer = 0;
    A.searchTimer = 0;
    A.loseTimer = 0;
    A.targetPos = null;
    A.lastKnown = null;
    A.catching = false;
    A.enabled = true;
    A.closetWatch = 0;
    A.idleLook = 0;
    if (A.group) A.group.visible = true;
  }

  function update(dt, active) {
    if (A.sayTimer > 0) A.sayTimer -= dt;
    if (!A.group) return;

    if (!active || !A.enabled) {
      bodyPose(dt, false);
      return;
    }

    const seen = canSee();
    const distToPlayer = Math.hypot(PLAYER.pos.x - A.pos.x, PLAYER.pos.z - A.pos.z);
    const sameFloor = Math.abs(PLAYER.pos.y - A.pos.y) < 1.7;

    if (seen) {
      A.lastKnown = PLAYER.pos.clone();
      const d = A.pos.distanceTo(PLAYER.getEye());
      let rate = A.diff.rate * (0.55 + 1.15 * (1 - Math.min(1, d / A.diff.vision)));
      if (PLAYER.crouch) rate *= 0.55;
      if (PLAYER.sprinting) rate *= 1.25;
      if (distToPlayer < 2.2) rate *= 1.6;
      A.suspicion = Math.min(1, A.suspicion + rate * dt);

      if (A.suspicion >= 1) enterChase();
      else if (A.suspicion > 0.28) {
        if (A.state !== 'chase' && A.state !== 'alert') {
          A.state = 'alert';
          say('Kim var orada?', 2.4);
          SFX.seen();
        }
      }
    } else {
      A.suspicion = Math.max(0, A.suspicion - dt * (A.state === 'chase' ? 0.07 : 0.28));
      if (A.suspicion > 0.3 && A.state === 'patrol') A.state = 'alert';
    }

    // oyuncuya çok yakınsa yakala
    if (sameFloor && distToPlayer < 1.35 && !PLAYER.hidden && (A.state === 'chase' || A.state === 'alert')) {
      catchPlayer();
    }

    // dolapta saklanan oyuncuyu arıyorsa bulabilir
    if (PLAYER.hidden && (A.state === 'search' || A.state === 'investigate')) {
      const c = WORLD.closets[PLAYER.closetId];
      if (c) {
        const dc = Math.hypot(c.pos.x - A.pos.x, c.pos.z - A.pos.z);
        if (dc < 2.0) {
          A.closetWatch += dt;
          A.yaw = angleLerp(A.yaw, yawToward(c.pos.x, c.pos.z), Math.min(1, dt * 4));
          if (A.closetWatch > 1.6) {
            catchPlayer();
          }
        } else A.closetWatch = Math.max(0, A.closetWatch - dt);
      }
    } else A.closetWatch = 0;

    let moving = false;

    switch (A.state) {
      case 'patrol': {
        const t = routeTarget();
        const dist = walkToward(t.x, t.z, A.diff.patrol, dt);
        moving = dist > 0.2;
        if (dist < 0.45) {
          if (t.pause > 0 && A.waitTimer < t.pause) {
            A.waitTimer += dt;
            moving = false;
            lookAround(dt, 1.1);
          } else {
            advanceRoute();
          }
        }
        break;
      }
      case 'alert': {
        const t = A.lastKnown;
        if (t) {
          const dist = walkToward(t.x, t.z, A.diff.patrol * 1.15, dt);
          moving = dist > 0.2;
          if (dist < 1.0) lookAround(dt, 1.8);
        } else {
          A.state = 'patrol';
        }
        if (!seen) {
          A.loseTimer += dt;
          if (A.loseTimer > 3.0) {
            A.state = 'investigate';
            A.targetPos = A.lastKnown ? A.lastKnown.clone() : A.pos.clone();
            A.searchTimer = 0;
          }
        } else A.loseTimer = 0;
        break;
      }
      case 'chase': {
        const t = seen ? PLAYER.pos : A.lastKnown;
        if (t) {
          const dist = walkToward(t.x, t.z, A.diff.chase, dt);
          moving = dist > 0.2;
        }
        if (seen) A.loseTimer = 0;
        else {
          A.loseTimer += dt;
          if (A.loseTimer > A.diff.lose) {
            A.state = 'search';
            A.searchTimer = 0;
            say('Nereye gittin?', 2.2);
          }
        }
        break;
      }
      case 'investigate': {
        const t = A.targetPos || A.lastKnown || A.pos;
        const dist = walkToward(t.x, t.z, A.diff.patrol, dt);
        moving = dist > 0.2;
        if (dist < 0.8) {
          A.waitTimer += dt;
          lookAround(dt, 1.5);
          if (A.waitTimer > 4.5) {
            A.state = 'search';
            A.searchTimer = 0;
            A.waitTimer = 0;
          }
        }
        break;
      }
      case 'search': {
        A.searchTimer += dt;
        const t = A.targetPos || A.lastKnown;
        if (t) {
          const dist = walkToward(t.x, t.z, A.diff.patrol * 1.05, dt);
          moving = dist > 0.2;
          if (dist < 0.8) lookAround(dt, 1.2);
        }
        if (A.searchTimer > 7 && distToPlayer > 4) {
          const i = nearestRouteIndex();
          A.routeIndex = (i + 1) % ROUTE.length;
          A.state = 'patrol';
          A.suspicion = Math.max(A.suspicion, 0.15);
          A.targetPos = null;
        }
        break;
      }
    }

    bodyPose(dt, moving);
  }

  function debugTeleport() {
    if (!window.DEBUG) return;
    A.pos.copy(PLAYER.pos);
    A.state = 'chase';
    A.suspicion = 1;
    A.enabled = true;
  }

  return {
    init, update, reset, hear, setDifficulty, canSee, debugTeleport,
    get pos() { return A.pos; },
    get state() { return A.state; },
    get suspicion() { return A.suspicion; },
    get chasing() { return A.state === 'chase'; },
    get danger() {
      if (A.state === 'chase') return 1;
      return U.clamp(A.suspicion, 0, 1);
    },
    get enabled() { return A.enabled; },
    set enabled(v) { A.enabled = v; if (A.group) A.group.visible = v; },
    set onCatch(fn) { catchCallback = fn; },
    set onSeen(fn) { seenCallback = fn; },
    get raw() { return A; }
  };
})();
