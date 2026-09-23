/*
  Media constellation — animations.
  A tiny requestAnimationFrame tween helper, the blob/particle effects, and
  the choreography for preview → open → close. Each section carries its own
  animation state (inner/outer line progress, circle scale, wobble) and the
  scene redraws it from that state every frame.
*/
(function () {
  const CN = window.CN;
  const L = CN.layout;
  const geo = CN.geo;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => motionQuery.matches;

  const T = {
    line: 400, // dot → center
    label: 220,
    spring: 560,
    wobble: 420,
    pop: 200,
    particles: 620,
    retract: 340,
    fade: 250, // reduced-motion fades
  };

  const ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t) => {
      const c1 = 1.55;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };

  // Runs fn(easedProgress, rawProgress) every frame for `dur` ms.
  // Resolves true when finished, false if alive() turned false first.
  // Under reduced motion it jumps straight to the end.
  function tween(dur, fn, opts = {}) {
    const easing = opts.ease || ease.outCubic;
    const alive = opts.alive || (() => true);
    if (dur <= 0 || reduced()) {
      if (!alive()) return Promise.resolve(false);
      fn(1, 1);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const t0 = performance.now();
      function frame(now) {
        if (!alive()) return resolve(false);
        const t = Math.min(1, Math.max(0, (now - t0) / dur));
        fn(easing(t), t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve(true);
      }
      requestAnimationFrame(frame);
    });
  }

  function wait(ms, alive = () => true) {
    return new Promise((resolve) => setTimeout(() => resolve(alive()), ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  // ---- shapes ----

  function circlePath(r) {
    return `M${r},0A${r},${r} 0 1 1 ${-r},0A${r},${r} 0 1 1 ${r},0Z`;
  }

  // Jelly outline: a few sine modes around the circle whose amplitude swells
  // and whose phase rolls over time t (0..1).
  function blobPath(r, t) {
    const amp = 0.075 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.025 * t;
    const ph = t * Math.PI * 4.4;
    const breathe = 1 + 0.035 * Math.sin(t * Math.PI * 3);
    const n = 96;
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k =
        1 +
        amp *
          (0.55 * Math.sin(3 * a + ph) +
            0.35 * Math.sin(2 * a - 1.6 * ph + 1.3) +
            0.2 * Math.sin(5 * a + 2.2 * ph + 0.4));
      const rr = r * breathe * k;
      d += (i ? "L" : "M") + (Math.cos(a) * rr).toFixed(2) + "," + (Math.sin(a) * rr).toFixed(2);
    }
    return d + "Z";
  }

  // A handful of dots flying outward from a circle's edge, fading as they go.
  function burst(center, r) {
    const group = CN.scene.els.gParticles;
    const size = 1 / Math.pow(CN.cam.s, 0.7);
    const parts = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const start = r * (0.92 + Math.random() * 0.1);
      const travel = r * (0.14 + Math.random() * 0.24);
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      el.setAttribute("class", "cn-particle");
      el.setAttribute("r", ((2.2 + Math.random() * 1.8) * size).toFixed(2));
      group.appendChild(el);
      parts.push({ el, a, start, travel });
    }
    return tween(
      T.particles,
      (e) => {
        parts.forEach((p) => {
          const rr = p.start + p.travel * e;
          p.el.setAttribute("cx", (center.x + Math.cos(p.a) * rr).toFixed(2));
          p.el.setAttribute("cy", (center.y + Math.sin(p.a) * rr).toFixed(2));
          p.el.style.opacity = String(1 - e);
        });
      },
      { ease: ease.outCubic }
    ).then(() => parts.forEach((p) => p.el.remove()));
  }

  // ---- choreography ----

  // Each new sequence on a section invalidates the previous one.
  function claim(sec) {
    const token = {};
    sec.token = token;
    return () => sec.token === token;
  }

  function animate(sec, key, to, fullDur, alive, easing) {
    const from = sec[key];
    if (from === to) return Promise.resolve(alive());
    return tween(
      fullDur * Math.abs(to - from),
      (e) => {
        sec[key] = from + (to - from) * e;
        CN.scene.render(sec);
      },
      { alive, ease: easing }
    );
  }

  async function preview(sec) {
    if (sec.open || sec.phase === "preview") return;
    sec.phase = "preview";
    const alive = claim(sec);
    CN.scene.setHot(sec, true);
    if (!(await animate(sec, "inner", 1, T.line, alive, ease.outCubic))) return;
    CN.scene.showLabel(sec, true);
  }

  async function unpreview(sec) {
    if (sec.open || sec.phase !== "preview") return;
    sec.phase = "idle";
    const alive = claim(sec);
    CN.scene.setHot(sec, false);
    if (sec.labelShown) {
      CN.scene.showLabel(sec, false);
      if (!(await wait(T.label * 0.8, alive))) return;
    }
    await animate(sec, "inner", 0, T.line * 0.85, alive, ease.inOutCubic);
  }

  // Camera target for an opened circle: centered on the circle, zoomed out a
  // little if that lets its ring dot stay in view too.
  function cameraTargetFor(sec) {
    const c = L.bubbleCenter(sec);
    const dot = L.dotPos(sec);
    const r = geo.d / 2;
    const hw = Math.max(r, Math.abs(dot.x - c.x) + 28);
    const hh = Math.max(r, Math.abs(dot.y - c.y) + 28);
    const withDot = CN.cam.fit({ x: c.x - hw, y: c.y - hh, w: hw * 2, h: hh * 2 });
    const circleOnly = CN.cam.fit(L.bubbleBox(sec));
    return withDot.s >= circleOnly.s * 0.8 ? withDot : circleOnly;
  }

  function focusBubble(sec) {
    const title = sec.el.bubble && sec.el.bubble.querySelector(".cn-bubble-title");
    if (title) title.focus({ preventScroll: true });
  }

  async function open(sec, { instant = false } = {}) {
    const state = CN.state;

    if (sec.open && !sec.closing) {
      await CN.cam.flyTo(cameraTargetFor(sec), 650);
      focusBubble(sec);
      return;
    }

    // Fresh open, or re-opening something mid-close.
    if (sec.el.bubble) CN.scene.removeBubble(sec);
    sec.open = true;
    sec.closing = false;
    sec.phase = "open";
    state.openOrder = state.openOrder.filter((s) => s !== sec).concat(sec);
    L.place(sec, CN.sections.filter((s) => s.el.bubble));
    CN.scene.buildBubble(sec);
    CN.scene.setHot(sec, true);
    CN.hash.write();
    const alive = claim(sec);

    if (instant) {
      sec.inner = 1;
      sec.outer = 1;
      sec.pop = 1;
      sec.shapeOpacity = 1;
      CN.scene.showLabel(sec, true);
      CN.scene.showBody(sec, true);
      CN.scene.render(sec);
      return;
    }

    await nextFrame(); // let the hidden circle paint once so fades can run
    if (!alive()) return;

    if (!(await animate(sec, "inner", 1, T.line, alive, ease.outCubic))) return;
    CN.scene.showLabel(sec, true);

    // Outward line, with the camera riding along to the destination.
    const from = CN.cam.focusPoint();
    const target = cameraTargetFor(sec);
    const camGen = CN.cam.claim();
    const length = sec.dist - geo.d / 2 - geo.R;
    const startOuter = sec.outer;
    const ok = await tween(
      L.clamp(length * 1.1, 450, 950) * (1 - startOuter),
      (e) => {
        sec.outer = startOuter + (1 - startOuter) * e;
        CN.scene.render(sec);
        if (CN.cam.gen === camGen) CN.cam.lookLerp(from, target, e);
      },
      { alive, ease: ease.inOutCubic }
    );
    if (!ok) return;

    // Circle springs open.
    sec.shapeOpacity = 1;
    if (!(await tween(T.spring, (e) => ((sec.pop = e), CN.scene.render(sec)), { alive, ease: ease.outBack })))
      return;
    CN.scene.showBody(sec, true);
    focusBubble(sec);
  }

  async function close(sec) {
    if (!sec.open || sec.closing) return;
    const state = CN.state;
    sec.closing = true;
    const alive = claim(sec);

    state.openOrder = state.openOrder.filter((s) => s !== sec);
    CN.hash.write();
    sec.el.btn.setAttribute("aria-expanded", "false");
    if (sec.el.bubble.contains(document.activeElement)) CN.ix.focusDotQuietly(sec);
    CN.scene.showBody(sec, false);

    const center = L.bubbleCenter(sec);
    if (reduced()) {
      sec.shapeOpacity = 0;
      CN.scene.render(sec);
      if (!(await wait(T.fade, alive))) return;
    } else {
      if (!(await wait(110, alive))) return;
      if (!(await tween(T.wobble, (e, t) => ((sec.wobble = t), CN.scene.render(sec)), { alive, ease: ease.linear })))
        return;
      const p0 = sec.pop; // < 1 if closed before it finished opening
      if (p0 > 0.5) burst(center, (geo.d / 2) * p0 * 1.05);
      const popped = await tween(
        T.pop,
        (e) => {
          sec.pop = p0 * (1 + 0.1 * e);
          sec.shapeOpacity = 1 - e;
          CN.scene.render(sec);
        },
        { alive, ease: ease.outCubic }
      );
      if (!popped) return;
    }
    CN.scene.removeBubble(sec);
    easeHomeIfLost(sec);

    if (!(await animate(sec, "outer", 0, T.retract * 1.4, alive, ease.inOutCubic))) return;
    sec.open = false;
    sec.closing = false;
    sec.dist = 0;

    // If the pointer/focus is still on this dot, settle into its preview.
    if (sec.hovered || sec.focused || CN.ix.touchPreview === sec) {
      sec.phase = "preview";
      return;
    }
    sec.phase = "idle";
    CN.scene.setHot(sec, false);
    CN.scene.showLabel(sec, false);
    if (!(await wait(T.label * 0.8, alive))) return;
    await animate(sec, "inner", 0, T.retract, alive, ease.inOutCubic);
  }

  // Only move the camera after a close if nothing else is left on screen.
  function easeHomeIfLost(closed) {
    const view = CN.cam.viewBox();
    const bubbleInView = CN.sections.some(
      (s) => s !== closed && s.el.bubble && L.intersects(view, L.bubbleBox(s))
    );
    const dotInView = CN.sections.some((s) => L.intersects(view, L.pointBox(L.dotPos(s), 1)));
    if (!bubbleInView && !dotInView) CN.cam.flyTo(CN.cam.homeTarget(), 800);
  }

  CN.anim = {
    T,
    ease,
    reduced,
    tween,
    wait,
    nextFrame,
    circlePath,
    blobPath,
    burst,
  };
  CN.seq = { preview, unpreview, open, close, cameraTargetFor, focusBubble };
})();
