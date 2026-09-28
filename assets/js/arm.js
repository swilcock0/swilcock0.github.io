// Planar two-link arm with a vertical tool on the home page. Left alone, it builds a small running-bond brick wall
// from a pallet, then clears it and starts again. Moving the pointer over it takes over: the tip
// follows the pointer within reach. Either way, no link, the tool or a carried brick may enter
// the floor or a brick: any step that would is refused.
(function () {
  var canvas = document.getElementById('arm');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var dark = matchMedia('(prefers-color-scheme: dark)');

  var FRAME_MS = 1000 / 30 - 4;     // capped at ~30 fps; the slack absorbs rAF jitter on 60/120 Hz screens
  var IDLE_MS = 2500, TRAIL_MS = 1400, DWELL_MS = 180, DONE_MS = 2200, RESET_MS = 900;
  var COURSES = [4, 3, 4];          // bricks per course, bottom up; a shorter course is offset half a brick
  var PALLET = [6, 5];              // bricks per pallet column: near column, far column
  var TOTAL = 11;                   // bricks in the wall (= sum of COURSES = sum of PALLET)

  var W, H, R, L, g, colors;        // canvas size, reach, link length, scene geometry
  var q = null;                     // joint angles [shoulder, elbow], radians, y up
  var trail = [], target = null, lastPointer = -Infinity, last = performance.now();
  var visible = true, running = false, started = false;

  // Build state
  var placed = 0, carrying = false, step = 0, wait = 0, phase = 'build', phaseT = 0;
  var escape = null, blocked = 0;   // lift-clear move used when a move stays blocked

  // ---------- geometry ----------

  // Returns false while the canvas has no size yet (e.g. mid page load): nothing can be laid out
  function layout() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    if (r.width < 1 || r.height < 1) return false;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(H * 0.8, W * 0.44);
    L = R / 2;
    var floor = H * 0.92;
    g = {
      floor: floor,
      sx: W * 0.5, sy: floor - R * 0.09,          // shoulder
      bw: R * 0.15, bh: R * 0.065, gap: R * 0.012, // brick size and mortar gap
      w: Math.max(9, R * 0.07),                     // link thickness
      tool: R * 0.1                                 // vertical tool from wrist down to the gripper
    };
    g.palletX = g.sx - R * 0.5;                     // centre of the near pallet column
    g.wallX = g.sx + R * 0.3;                       // left edge of the wall
    g.palletSafe = floor - (PALLET[0] + 1) * g.bh - R * 0.07;
    g.wallSafe = floor - (COURSES.length + 1) * g.bh - R * 0.07;
    return true;
  }

  // Rectangles: { x, y (top), w, h }
  function palletBrick(i) {          // i-th brick picked; the near column empties first, top down
    var col = i < PALLET[0] ? 0 : 1, row = col ? PALLET[0] + PALLET[1] - 1 - i : PALLET[0] - 1 - i;
    var cx = g.palletX - col * (g.bw + g.gap);
    return { x: cx - g.bw / 2, y: g.floor - (row + 1) * g.bh, w: g.bw, h: g.bh };
  }
  function wallBrick(k) {            // k-th brick placed; each course is laid far end first
    var c = 0, n = k;
    while (n >= COURSES[c]) { n -= COURSES[c]; c++; }
    var j = COURSES[c] - 1 - n, off = COURSES[c] < COURSES[0] ? (g.bw + g.gap) / 2 : 0;
    var x = g.wallX + off + j * (g.bw + g.gap);
    return { x: x, y: g.floor - (c + 1) * g.bh, w: g.bw, h: g.bh };
  }

  // Waypoints for the brick being moved. The tip grips the brick at the middle of its top face.
  // 'j' = joint move (transfers), 'l' = straight line (approach and retreat).
  function waypoints(k) {
    var p = palletBrick(k), w = wallBrick(k);
    var px = p.x + p.w / 2, wx = w.x + w.w / 2;
    return [
      { x: px, y: g.palletSafe, m: 'j' },
      { x: px, y: p.y, m: 'l' },
      { grip: true },
      { x: px, y: g.palletSafe, m: 'l' },
      { x: wx, y: g.wallSafe, m: 'j' },
      { x: wx, y: w.y, m: 'l' },
      { release: true },
      { x: wx, y: g.wallSafe, m: 'l' }
    ];
  }

  // ---------- kinematics ----------

  // Elbow e, wrist w and gripper tip t. A third joint keeps the tool pointing straight down.
  function fk(a) {
    var e = { x: g.sx + L * Math.cos(a[0]), y: g.sy - L * Math.sin(a[0]) };
    var w = { x: e.x + L * Math.cos(a[0] + a[1]), y: e.y - L * Math.sin(a[0] + a[1]) };
    return { e: e, w: w, t: { x: w.x, y: w.y + g.tool } };
  }

  // Joint angles putting the tip at p. s = -1 puts the elbow above the line for a wrist to the
  // right of the shoulder, +1 for one to the left. q1 is unwrapped to stay near `near`.
  function ik(p, s, near) {
    var dx = p.x - g.sx, dy = g.sy - (p.y - g.tool), d = Math.hypot(dx, dy);
    var c2 = Math.max(-1, Math.min(1, (d * d - 2 * L * L) / (2 * L * L)));
    var q2 = s * Math.acos(c2);
    var q1 = Math.atan2(dy, dx) - Math.atan2(L * Math.sin(q2), L + L * Math.cos(q2));
    if (near) {
      while (q1 - near[0] > Math.PI) q1 -= 2 * Math.PI;
      while (near[0] - q1 > Math.PI) q1 += 2 * Math.PI;
    }
    return [q1, q2];
  }
  function side(p) { return p.x >= g.sx ? -1 : 1; }

  // Keep a tip target inside the reach (the wrist must stay within R of the shoulder)
  function clampReach(p) {
    var dx = p.x - g.sx, dy = Math.min(p.y, g.floor - 2) - g.tool - g.sy;
    var d = Math.hypot(dx, dy), max = R * 0.99, min = R * 0.15;
    var k = d > max ? max / d : d < min ? min / d : 1;
    return { x: g.sx + dx * k, y: g.sy + dy * k + g.tool };
  }

  // ---------- collision ----------

  // Bricks the arm must avoid: the wall so far and what is left on the pallet
  function obstacles() {
    var list = [], i;
    for (i = 0; i < placed; i++) list.push(wallBrick(i));
    for (i = placed + (carrying ? 1 : 0); i < TOTAL; i++) list.push(palletBrick(i));
    return list;
  }
  function near(x, y, r, m) {
    return x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;
  }
  function overlap(a, b) {
    var e = 0.75; // faces may touch
    return a.x < b.x + b.w - e && a.x + a.w > b.x + e && a.y < b.y + b.h - e && a.y + a.h > b.y + e;
  }

  // Does pose a hit the floor or a brick? Links are sampled as thick lines. The gripper pad at the
  // very end of the tool may touch the brick it is picking or placing, so it is left out.
  function collides(a) {
    var k = fk(a), obs = obstacles(), n = 14;
    var links = [[{ x: g.sx, y: g.sy }, k.e, 0.18, 1, g.w / 2], [k.e, k.w, 0, 1, g.w * 0.39], [k.w, k.t, 0, 0.8, 3]];
    for (var i = 0; i < links.length; i++) {
      var A = links[i][0], B = links[i][1], rad = links[i][4];
      for (var j = 0; j <= n; j++) {
        var t = links[i][2] + (links[i][3] - links[i][2]) * j / n;
        var x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
        if (y + rad > g.floor + 0.5) return true;
        for (var o = 0; o < obs.length; o++) if (near(x, y, obs[o], rad - 1)) return true;
      }
    }
    if (carrying) {
      var b = { x: k.t.x - g.bw / 2, y: k.t.y, w: g.bw, h: g.bh };
      if (b.y + b.h > g.floor + 0.5) return true;
      for (var m = 0; m < obs.length; m++) if (overlap(b, obs[m])) return true;
    }
    return false;
  }

  // ---------- motion ----------

  // Each step returns 'done', 'moved' or 'blocked' (the next pose would collide)

  // Move joints toward goal, easing in over the last stretch
  function jointStep(goal, dt, wmax) {
    var d0 = goal[0] - q[0], d1 = goal[1] - q[1], s = Math.max(Math.abs(d0), Math.abs(d1));
    var v = Math.min(wmax, 0.6 + 6 * s) * dt / 1000, f = Math.min(1, v / s || 1);
    var n = [q[0] + d0 * f, q[1] + d1 * f];
    if (collides(n) && !collides(q)) return 'blocked';
    q = n;
    return f >= 1 ? 'done' : 'moved';
  }

  // Move the tip along a straight line toward p
  function lineStep(p, dt) {
    var t = fk(q).t, dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy);
    var v = Math.min(R * 1.1, R * 0.15 + 6 * d) * dt / 1000;
    var goal = d <= v ? p : { x: t.x + dx * v / d, y: t.y + dy * v / d };
    // Near full stretch (q2 ~ 0) the elbow side is ambiguous, so take it from the goal's side
    var n = ik(goal, Math.abs(q[1]) < 0.05 ? side(goal) : q[1] < 0 ? -1 : 1, q), got = fk(n).t;
    // An out-of-reach goal comes back as the straight arm pointing at it: don't count that as progress
    if (Math.hypot(got.x - goal.x, got.y - goal.y) > 1 || (collides(n) && !collides(q))) return 'blocked';
    q = n;
    return d <= v ? 'done' : 'moved';
  }

  // A point above the bricks, pulled in from the edge of the reach so it is always reachable
  function liftClear() {
    var t = fk(q).t, dx = Math.max(-R * 0.8, Math.min(R * 0.8, t.x - g.sx)), top = R * 0.95;
    var y = Math.max(g.palletSafe - g.bh, g.sy - Math.sqrt(top * top - dx * dx) + g.tool);
    return { x: g.sx + dx, y: Math.min(t.y, y) };
  }

  function scriptStep(now, dt) {
    if (phase === 'done') { if (now - phaseT > DONE_MS) { phase = 'reset'; phaseT = now; } return; }
    if (phase === 'reset') {
      if (now - phaseT > RESET_MS) { phase = 'build'; placed = 0; step = 0; }
      return;
    }
    if (escape) {
      var r = lineStep(escape, dt);
      blocked = r === 'blocked' ? blocked + 1 : 0;
      if (r === 'done' || blocked > 30) { escape = null; blocked = 0; }
      return;
    }
    // The release (step 6) counts the brick as placed, so the retreat after it belongs to placed - 1
    var wp = waypoints(step > 6 ? placed - 1 : placed)[step];
    if (wp.grip || wp.release) {
      if (!wait) wait = now;
      if (now - wait < DWELL_MS) return;
      wait = 0;
      if (wp.grip) carrying = true;
      else { carrying = false; placed++; }
      step++;
    } else {
      var res = wp.m === 'j' ? jointStep(ik(wp, side(wp), q), dt, 4.5) : lineStep(wp, dt);
      if (res === 'done') step++;
      blocked = res === 'blocked' ? blocked + 1 : 0;
      if (blocked > 30) { escape = liftClear(); blocked = 0; }
    }
    if (step >= 8) {
      step = 0;
      if (placed >= TOTAL) { phase = 'done'; phaseT = now; }
    }
  }

  // When the pointer lets go: lift clear, then carry on from the nearest safe waypoint
  function resume() {
    wait = 0; blocked = 0;
    if (phase !== 'build') return;
    if (placed >= TOTAL) { phase = 'done'; phaseT = performance.now(); step = 0; return; }
    step = carrying ? 4 : 0; escape = liftClear();
  }

  // Follow the pointer with whichever elbow pose is higher, or the other if that one is blocked
  function pointerStep(dt) {
    var a = ik(target, -1, q), b = ik(target, 1, q);
    var goal = fk(a).e.y <= fk(b).e.y ? a : b, alt = goal === a ? b : a;
    if (collides(goal) && !collides(alt)) goal = alt;
    jointStep(goal, dt, 5);
  }

  // ---------- drawing ----------

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors = {};
    ['paper', 'paper-2', 'ink', 'ink-2', 'rule', 'robot'].forEach(function (k) {
      colors[k] = s.getPropertyValue('--' + k).trim();
    });
  }
  function isDark() {
    var t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : dark.matches;
  }

  function drawBrick(r, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors['paper-2']; ctx.strokeStyle = colors['ink-2']; ctx.lineWidth = 1.25;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    // reach envelope
    ctx.setLineDash([3, 6]); ctx.strokeStyle = colors.rule; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(g.sx, g.sy, R, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    // floor, hatched like a fixed support on a drawing
    var x0 = g.palletX - g.bw * 2, x1 = g.wallX + (g.bw + g.gap) * 4 + g.bw * 0.5;
    ctx.strokeStyle = colors['ink-2']; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, g.floor); ctx.lineTo(x1, g.floor); ctx.stroke();
    ctx.lineWidth = 1;
    for (var x = x0 + 8; x <= x1; x += 9) {
      ctx.beginPath(); ctx.moveTo(x, g.floor); ctx.lineTo(x - 8, g.floor + 8); ctx.stroke();
    }

    // bricks; during the reset the wall fades out while the pallet fades back in
    var f = phase === 'reset' ? Math.min(1, (now - phaseT) / RESET_MS) : 0, i;
    for (i = 0; i < placed; i++) drawBrick(wallBrick(i), 1 - f);
    for (i = placed + (carrying ? 1 : 0); i < TOTAL; i++) drawBrick(palletBrick(i), 1);
    if (phase === 'reset') for (i = 0; i < placed; i++) drawBrick(palletBrick(i), f);

    drawTrail(now);
    if (target && now - lastPointer < IDLE_MS) drawTarget(target);
    drawArm();
  }

  function drawTrail(now) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = colors.robot; ctx.lineWidth = 3;
    if (isDark()) { ctx.shadowColor = colors.robot; ctx.shadowBlur = 10; }
    for (var i = 1; i < trail.length; i++) {
      ctx.globalAlpha = Math.max(0, 1 - (now - trail[i].t) / TRAIL_MS) * 0.9;
      ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  function drawTarget(p) {
    ctx.strokeStyle = colors['ink-2']; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 7, p.y); ctx.lineTo(p.x + 7, p.y);
    ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x, p.y + 7);
    ctx.stroke();
  }

  function drawArm() {
    var k = fk(q), w = g.w, s = { x: g.sx, y: g.sy };
    if (carrying) drawBrick({ x: k.t.x - g.bw / 2, y: k.t.y, w: g.bw, h: g.bh }, 1);
    // pedestal
    ctx.fillStyle = colors.ink;
    ctx.beginPath();
    ctx.moveTo(s.x - w * 1.3, g.floor); ctx.lineTo(s.x + w * 1.3, g.floor);
    ctx.lineTo(s.x + w * 0.7, s.y); ctx.lineTo(s.x - w * 0.7, s.y);
    ctx.closePath(); ctx.fill();
    // links: ink outline, yellow body
    ctx.lineCap = 'round';
    [[s, k.e, w], [k.e, k.w, w * 0.78]].forEach(function (l) {
      ctx.strokeStyle = colors.ink; ctx.lineWidth = l[2] + 3;
      ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke();
      ctx.strokeStyle = colors.robot; ctx.lineWidth = l[2];
      ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke();
    });
    // joints
    [[s, w * 0.42], [k.e, w * 0.36]].forEach(function (j) {
      ctx.fillStyle = colors.paper; ctx.strokeStyle = colors.ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(j[0].x, j[0].y, j[1], 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    });
    // tool and gripper pad
    ctx.strokeStyle = colors.ink; ctx.lineWidth = 4; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(k.w.x, k.w.y); ctx.lineTo(k.t.x, k.t.y - 3); ctx.stroke();
    ctx.fillStyle = colors.ink;
    ctx.fillRect(k.t.x - g.bw * 0.28, k.t.y - 4, g.bw * 0.56, 4);
    ctx.fillStyle = colors.paper; ctx.strokeStyle = colors.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(k.w.x, k.w.y, w * 0.24, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }

  // ---------- loop ----------

  // Starting pose: above the first brick on the pallet
  function home() { var p = palletBrick(0); return ik({ x: p.x + p.w / 2, y: g.palletSafe }, 1); }

  function frame(now) {
    running = false;
    if (!visible || still.matches) return;
    if (!g && !layout()) { schedule(); return; }
    if (!q || !q.every(isFinite)) { q = home(); placed = 0; carrying = false; step = 0; phase = 'build'; escape = null; }
    if (now - last < FRAME_MS) { schedule(); return; }
    var dt = Math.min(50, now - last); last = now;
    if (target && now - lastPointer < IDLE_MS) pointerStep(dt);
    else {
      if (target) { target = null; resume(); }
      scriptStep(now, dt);
    }
    var t = fk(q).t;
    trail.push({ x: t.x, y: t.y, t: now });
    while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift();
    draw(now);
    schedule();
  }
  function schedule() { if (started && !running) { running = true; requestAnimationFrame(frame); } }

  // Reduced motion: one still frame, halfway through the wall with a brick on its way
  function drawStill() {
    placed = 6; carrying = true; step = 4; phase = 'build'; trail = [];
    var w = wallBrick(6);
    q = ik({ x: w.x + w.w / 2, y: g.wallSafe }, -1);
    draw(0);
  }

  function resize() {
    if (!layout()) return;
    trail = [];
    if (!q) q = home();
    if (still.matches) drawStill();
    else if (!started) draw(performance.now()); // resizing clears the canvas; redraw until the loop runs
  }

  addEventListener('pointermove', function (ev) {
    var r = canvas.getBoundingClientRect();
    var p = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    // Only a pointer inside the drawn reach arc takes over; leaving it hands back to the wall at once
    if (!g || Math.hypot(p.x - g.sx, p.y - g.sy) > R || p.y > g.floor) { lastPointer = -Infinity; return; }
    target = clampReach(p);
    lastPointer = performance.now();
  }, { passive: true });

  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) { last = performance.now(); schedule(); }
  }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);

  function restyle() { readColors(); if (still.matches && g) drawStill(); else schedule(); }
  dark.addEventListener('change', restyle);
  still.addEventListener('change', restyle);
  document.addEventListener('themechange', restyle);
  readColors();
  resize();
  // Animate only once the page has loaded, so the arm doesn't compete with first paint
  function start() { started = true; last = performance.now(); schedule(); }
  if (document.readyState === 'complete') start();
  else addEventListener('load', function () {
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1000 }); else setTimeout(start, 200);
  });

  // Read-only hook for tests
  canvas.armState = function () {
    if (!g || !q) return { q: [0, 0], placed: placed, carrying: carrying, step: step, phase: phase, waiting: true };
    return { q: q, placed: placed, carrying: carrying, step: step, phase: phase, tip: fk(q).t,
      colliding: collides(q) };
  };
})();
