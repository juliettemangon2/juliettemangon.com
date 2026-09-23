/*
  Media constellation — layout math.
  Pure geometry for the ring, the dots, and opened circles. Everything is in
  "world" units (CSS pixels at camera scale 1), with (0,0) at the center dot.
*/
(function () {
  const CN = (window.CN = window.CN || {});
  const DEG = Math.PI / 180;

  // Stage-derived sizes (vw/vh = the constellation box), refreshed by
  // measure() on load and resize.
  const geo = { vw: 0, vh: 0, R: 0, d: 0 };

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function measure(stage) {
    geo.vw = stage.clientWidth;
    geo.vh = stage.clientHeight;
    geo.R = Math.max(90, Math.min(geo.vw, geo.vh) * 0.38);
    // Opened circle diameter: ~90vw on phones, capped on large screens,
    // and never taller than a short landscape viewport.
    geo.d = clamp(Math.min(geo.vw * 0.9, geo.vh * 0.86), 250, 560);
    return geo;
  }

  function polar(angle, r) {
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Section i of n: first at 12 o'clock, the rest clockwise.
  function ringAngle(i, n) {
    return (-90 + (i * 360) / n) * DEG;
  }

  // Stable 0..1 value from a string, so each dot keeps its size across reloads.
  function seeded(str) {
    let h = 2166136261;
    for (const ch of str) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
  }

  // 6–8px dots with a hand-made wobble in size.
  function dotRadius(id) {
    return 3.1 + seeded(id) * 0.9;
  }

  function dotPos(sec) {
    return polar(sec.angle, geo.R);
  }

  function bubbleCenter(sec) {
    return polar(sec.angle, sec.dist);
  }

  // Where the outward line ends: the near edge of the opened circle.
  function outerEnd(sec) {
    return polar(sec.angle, sec.dist - geo.d / 2);
  }

  // Default distance from the center to an opened circle's center.
  // Odd sections sit further out so neighbours don't pile up.
  function baseDistance(sec) {
    const gap = Math.max(36, geo.R * 0.28);
    const stagger = sec.index % 2 ? geo.d * 0.55 : 0;
    return geo.R + gap + geo.d / 2 + stagger;
  }

  // Slide a circle out along its own ray until it clears every other circle.
  function place(sec, others) {
    const minSep = geo.d + Math.max(20, geo.d * 0.06);
    let d = baseDistance(sec);
    for (let i = 0; i < 600; i++) {
      const c = polar(sec.angle, d);
      if (!others.some((o) => o !== sec && o.dist && dist(c, bubbleCenter(o)) < minSep)) break;
      d += 16;
    }
    sec.dist = d;
    return d;
  }

  // Re-place every open circle, oldest first (used after a resize).
  function placeAll(openList) {
    const placed = [];
    openList.forEach((sec) => {
      sec.dist = 0;
      place(sec, placed);
      placed.push(sec);
    });
  }

  // Title sits beside the inner line, parallel to it. Titles on the left
  // half get an extra 180° so they're never upside down.
  function labelTransform(sec, dotR) {
    const mid = polar(sec.angle, geo.R / 2);
    let rot = sec.angle / DEG;
    if (Math.cos(sec.angle) < -1e-6) rot += 180;
    return `translate(${mid.x}px, ${mid.y}px) rotate(${rot}deg) translate(-50%, calc(-100% - 4px))`;
  }

  // ---- boxes (x, y = top-left) ----

  function ringBox() {
    const r = geo.R + 36;
    return { x: -r, y: -r, w: r * 2, h: r * 2 };
  }

  function bubbleBox(sec) {
    const c = bubbleCenter(sec);
    const r = geo.d / 2;
    return { x: c.x - r, y: c.y - r, w: geo.d, h: geo.d };
  }

  function pointBox(p, pad) {
    return { x: p.x - pad, y: p.y - pad, w: pad * 2, h: pad * 2 };
  }

  function union(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
      x,
      y,
      w: Math.max(a.x + a.w, b.x + b.w) - x,
      h: Math.max(a.y + a.h, b.y + b.h) - y,
    };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  CN.geo = geo;
  CN.layout = {
    clamp,
    measure,
    polar,
    ringAngle,
    dotRadius,
    dotPos,
    bubbleCenter,
    outerEnd,
    place,
    placeAll,
    labelTransform,
    ringBox,
    bubbleBox,
    pointBox,
    union,
    intersects,
  };
})();
