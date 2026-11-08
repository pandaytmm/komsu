/* Oyuncu: birinci şahıs kontroller, fener, saklanma, şişe ve etkileşim odağı */
window.PLAYER = (function () {
  const P = {
    pos: new THREE.Vector3(-4.5, 0, -13.6),
    vel: new THREE.Vector3(),
    yaw: Math.PI, pitch: 0,
    vy: 0, onGround: true,
    height: 1.78, radius: 0.29,
    crouch: false, sprinting: false, moving: false,
    stamina: 100, bottles: 3,
    hidden: false, closetId: null,
    flashlightOn: true, focus: null,
    camera: null, spot: null, spotTarget: null,
    keys: {}, stepTimer: 0, bobT: 0, bobAmount: 0,
    throwCooldown: 0, bottleList: [], noiseCallback: null,
    inside: false, inBasement: false, totalSteps: 0
  };

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const tmpV = new THREE.Vector3();

  function emitNoise(pos, radius) {
    if (P.noiseCallback) P.noiseCallback(pos.clone(), radius);
  }

  function init(camera) {
    P.camera = camera;
    camera.rotation.order = 'YXZ';

    const spot = new THREE.SpotLight(0xffe2b0, 1.55, 24, 0.46, 0.55, 1.1);
    spot.position.set(0.12, -0.08, 0.1);
    spot.castShadow = false;
    const target = new THREE.Object3D();
    target.position.set(0, 0, -1);
    camera.add(target);
    spot.target = target;
    camera.add(spot);
    P.spot = spot;
    P.spotTarget = target;

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { P.keys = {}; });

    return P;
  }

  function onKeyDown(e) {
    P.keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  }
  function onKeyUp(e) { P.keys[e.code] = false; }

  function look(dx, dy) {
    if (P.hidden) return;
    P.yaw -= dx * 0.0022;
    P.pitch -= dy * 0.0022;
    P.pitch = U.clamp(P.pitch, -1.45, 1.45);
  }

  function setPosition(x, y, z, yaw) {
    P.pos.set(x, y, z);
    P.vel.set(0, 0, 0);
    P.vy = 0;
    P.onGround = true;
    if (typeof yaw === 'number') P.yaw = yaw;
  }

  function getEyeHeight() { return P.crouch ? 1.06 : 1.62; }

  function getEye() {
    return new THREE.Vector3(P.pos.x, P.pos.y + getEyeHeight(), P.pos.z);
  }

  function updateCamera(dt) {
    const cam = P.camera;
    if (!cam) return;
    const speed = Math.hypot(P.vel.x, P.vel.z);
    if (P.onGround && P.moving) P.bobT += dt * (speed > 4 ? 12 : 8);
    const targetBob = P.moving && P.onGround ? (speed > 4 ? 0.055 : 0.03) : 0;
    P.bobAmount = U.lerp(P.bobAmount, targetBob, Math.min(1, dt * 8));
    const bob = Math.sin(P.bobT) * P.bobAmount;
    const sway = Math.cos(P.bobT * 0.5) * P.bobAmount * 0.6;

    if (P.hidden && P.closetId) {
      const c = WORLD.closets[P.closetId];
      if (c) {
        cam.position.set(c.pos.x, c.pos.y + 1.55, c.pos.z);
        cam.rotation.set(-0.03, c.yaw, 0);
      }
    } else {
      cam.position.set(P.pos.x + sway * 0.2, P.pos.y + getEyeHeight() + bob, P.pos.z);
      cam.rotation.set(P.pitch, P.yaw, 0);
    }
    if (P.spot) {
      P.spot.visible = P.flashlightOn;
      if (P.flashlightOn) {
        P.spot.intensity = 1.5 + Math.sin(WORLD.time * 21) * 0.045 + Math.sin(WORLD.time * 7.3) * 0.03;
      }
    }
  }

  function resolveAxis(axis, delta) {
    const r = P.radius;
    const feet = P.pos.y, head = P.pos.y + P.height;
    for (let i = 0; i < WORLD.colliders.length; i++) {
      const c = WORLD.colliders[i];
      if (c.off) continue;
      if (head <= c.minY + 0.02 || feet >= c.maxY - 0.02) continue;
      if (P.pos.x + r <= c.minX || P.pos.x - r >= c.maxX) continue;
      if (P.pos.z + r <= c.minZ || P.pos.z - r >= c.maxZ) continue;
      if (axis === 'x') {
        P.pos.x = delta > 0 ? c.minX - r - 0.001 : c.maxX + r + 0.001;
        P.vel.x = 0;
      } else {
        P.pos.z = delta > 0 ? c.minZ - r - 0.001 : c.maxZ + r + 0.001;
        P.vel.z = 0;
      }
    }
  }

  function move(dx, dz) {
    if (dx) { P.pos.x += dx; resolveAxis('x', dx); }
    if (dz) { P.pos.z += dz; resolveAxis('z', dz); }
    P.pos.x = U.clamp(P.pos.x, -17.4, 17.4);
    P.pos.z = U.clamp(P.pos.z, -19.4, 10.9);
  }

  function checkVertical(dt) {
    const fh = WORLD.floorHeight(P.pos.x, P.pos.z, P.pos.y);
    if (P.onGround) {
      if (fh >= P.pos.y - 0.55) {
        P.pos.y = fh;
        P.vy = 0;
      } else {
        P.onGround = false;
      }
    }
    if (!P.onGround) {
      P.vy -= 20 * dt;
      P.pos.y += P.vy * dt;
      const fh2 = WORLD.floorHeight(P.pos.x, P.pos.z, P.pos.y);
      if (P.pos.y <= fh2) {
        P.pos.y = fh2;
        P.vy = 0;
        P.onGround = true;
      }
    }
    if (P.pos.y < -6) setPosition(-4.5, 0, -13.6, Math.PI);
  }

  function footstepNoise(dt, speed) {
    if (!P.onGround || !P.moving) { P.stepTimer = Math.min(P.stepTimer, 0.25); return; }
    const interval = P.crouch ? 0.82 : (speed > 4 ? 0.37 : 0.56);
    P.stepTimer -= dt;
    if (P.stepTimer > 0) return;
    P.stepTimer = interval;
    P.totalSteps++;
    SFX.footstep(speed > 4, P.crouch, P.inside);
    if (P.crouch) emitNoise(P.pos, 1.8);
    else if (speed > 4) emitNoise(P.pos, 8.5);
    else emitNoise(P.pos, 4.8);
  }

  function updateMovement(dt) {
    const k = P.keys;
    const wantCrouch = !!(k['KeyC'] || k['ControlLeft']);
    if (wantCrouch !== P.crouch) {
      P.crouch = wantCrouch;
      if (P.crouch) emitNoise(P.pos, 1.2);
    }

    let ix = 0, iz = 0;
    if (k['KeyW'] || k['ArrowUp']) iz -= 1;
    if (k['KeyS'] || k['ArrowDown']) iz += 1;
    if (k['KeyA'] || k['ArrowLeft']) ix -= 1;
    if (k['KeyD'] || k['ArrowRight']) ix += 1;
    P.moving = !!(ix || iz);

    const wantSprint = !!(k['ShiftLeft'] || k['ShiftRight']) && P.moving && !P.crouch && P.stamina > 2;
    P.sprinting = wantSprint;

    if (wantSprint) P.stamina = Math.max(0, P.stamina - dt * 21);
    else P.stamina = Math.min(100, P.stamina + dt * (P.moving ? 9 : 16));
    if (P.stamina <= 0.5) P.sprinting = false;

    let speed = P.crouch ? 1.35 : (P.sprinting ? 5.25 : 3.15);
    if (ix && iz) { ix *= 0.7071; iz *= 0.7071; }
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    const wx = ix * cos + iz * sin;
    const wz = -ix * sin + iz * cos;
    const accel = P.onGround ? 30 : 7;
    P.vel.x = U.lerp(P.vel.x, wx * speed, Math.min(1, accel * dt / Math.max(1, speed)));
    P.vel.z = U.lerp(P.vel.z, wz * speed, Math.min(1, accel * dt / Math.max(1, speed)));
    if (!P.moving) {
      P.vel.x = U.lerp(P.vel.x, 0, Math.min(1, dt * 12));
      P.vel.z = U.lerp(P.vel.z, 0, Math.min(1, dt * 12));
    }

    if (k['Space'] && P.onGround) {
      P.vy = 5.1;
      P.onGround = false;
      emitNoise(P.pos, 5.5);
      P.keys['Space'] = false;
    }

    move(P.vel.x * dt, P.vel.z * dt);
    checkVertical(dt);

    P.inside = WORLD.isInside(P.pos.x, P.pos.z);
    P.inBasement = WORLD.isInBasement(P.pos.x, P.pos.z, P.pos.y);
    footstepNoise(dt, speed);
  }

  function updateFocus() {
    P.focus = null;
    if (P.hidden || !P.camera) return;
    raycaster.setFromCamera(center, P.camera);
    const meshes = [];
    for (let i = 0; i < WORLD.interactables.length; i++) {
      const it = WORLD.interactables[i];
      if (!it.enabled || it.used || !it.mesh.visible) continue;
      meshes.push(it.mesh);
    }
    if (!meshes.length) return;
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const hit = hits[0];
    const item = WORLD.interactables.find(it => it.mesh === hit.object);
    if (!item) return;
    const eye = getEye();
    if (hit.distance <= item.range && eye.distanceTo(item.mesh.position) <= item.range + 1.0) {
      P.focus = item;
    }
  }

  function updateBottles(dt) {
    for (let i = P.bottleList.length - 1; i >= 0; i--) {
      const b = P.bottleList[i];
      b.life -= dt;
      b.vel.y -= 19 * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * 9;
      b.mesh.rotation.z += dt * 6;
      const fh = WORLD.floorHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y);
      const floorHit = b.mesh.position.y < fh + 0.09;
      if (floorHit || b.life <= 0) {
        breakBottle(b);
        P.bottleList.splice(i, 1);
      }
    }
  }

  function breakBottle(b) {
    SFX.glass();
    emitNoise(b.mesh.position, 15);
    if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
    b.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  function throwBottle() {
    if (P.bottles <= 0 || P.throwCooldown > 0 || P.hidden) return false;
    P.throwCooldown = 0.45;
    P.bottles--;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ'));
    const g = new THREE.Group();
    const body = U.cyl(0.045, 0.055, 0.24, 8, U.mat(0x3e5c46, { rough: 0.35, metal: 0.25 }));
    body.position.y = 0.03; g.add(body);
    const neck = U.cyl(0.026, 0.04, 0.11, 8, body.material);
    neck.position.y = 0.2; g.add(neck);
    g.position.copy(P.camera.position).addScaledVector(dir, 0.55);
    g.position.y -= 0.12;
    WORLD.group.add(g);
    const vel = dir.clone().multiplyScalar(10.5);
    vel.y += 2.4;
    P.bottleList.push({ mesh: g, vel, life: 4.5 });
    SFX.throwBottle();
    emitNoise(P.pos, 2.2);
    if (window.UI) UI.setBottles(P.bottles);
    return true;
  }

  function toggleFlashlight() {
    P.flashlightOn = !P.flashlightOn;
    SFX.keyUse();
    if (window.UI) UI.toast(P.flashlightOn ? 'Fener açık' : 'Fener kapalı');
  }

  function enterCloset(id) {
    if (!WORLD.closets[id] || P.hidden) return;
    P.hidden = true;
    P.closetId = id;
    P.vel.set(0, 0, 0);
    P.focus = null;
    SFX.keyUse();
  }

  function exitCloset() {
    if (!P.hidden) return;
    const c = WORLD.closets[P.closetId] || P.pos;
    const dx = -Math.sin(c.yaw), dz = -Math.cos(c.yaw);
    P.pos.set(c.pos.x + dx * 0.72, c.pos.y, c.pos.z + dz * 0.72);
    P.hidden = false;
    P.closetId = null;
    P.vel.set(0, 0, 0);
    SFX.keyUse();
  }

  function update(dt, active) {
    P.throwCooldown = Math.max(0, P.throwCooldown - dt);
    updateBottles(dt);
    if (P.hidden) {
      updateCamera(dt);
      if (window.UI && UI.setPrompt) UI.setPrompt(null);
      return;
    }
    if (active) {
      updateMovement(dt);
      updateFocus();
    } else {
      P.moving = false;
      P.vel.x = 0; P.vel.z = 0;
    }
    updateCamera(dt);
  }

  function reset() {
    P.bottles = 3;
    P.stamina = 100;
    P.hidden = false;
    P.closetId = null;
    P.flashlightOn = true;
    P.crouch = false;
    P.focus = null;
    P.vel.set(0, 0, 0);
    P.vy = 0;
    P.yaw = Math.PI;
    P.pitch = 0;
    P.bottleList.forEach(b => { if (b.mesh.parent) b.mesh.parent.remove(b.mesh); });
    P.bottleList = [];
    if (window.UI) UI.setBottles(P.bottles);
  }

  return {
    init, update, look, setPosition, getEye, getEyeHeight, reset,
    throwBottle, toggleFlashlight, enterCloset, exitCloset,
    emitNoise,
    get pos() { return P.pos; },
    get yaw() { return P.yaw; },
    get pitch() { return P.pitch; },
    get hidden() { return P.hidden; },
    get focus() { return P.focus; },
    get bottles() { return P.bottles; },
    get stamina() { return P.stamina; },
    get sprinting() { return P.sprinting; },
    get moving() { return P.moving; },
    get crouch() { return P.crouch; },
    get onGround() { return P.onGround; },
    get flashlightOn() { return P.flashlightOn; },
    get inside() { return P.inside; },
    get closetId() { return P.closetId; },
    set noiseCallback(fn) { P.noiseCallback = fn; },
    get state() { return P; }
  };
})();
