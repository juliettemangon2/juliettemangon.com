/*
  Media constellation — camera.
  The camera is a translate + scale transform on the #world layer. This file
  owns that transform, animated camera moves, and the pan/zoom gestures
  (mouse drag, touch drag, pinch, wheel, trackpad).
*/
(function () {
  const CN = window.CN;
  const L = CN.layout;
  const geo = CN.geo;

  const cam = { x: 0, y: 0, s: 1, min: 0.2, max: 3, gen: 0 };
  const scaleListeners = [];
  let world = null;
  let lastS = NaN;

  cam.init = function (worldEl) {
    world = worldEl;
  };

  cam.onScale = function (fn) {
    scaleListeners.push(fn);
  };

  cam.apply = function () {
    world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
    if (cam.s !== lastS) {
      lastS = cam.s;
      world.style.setProperty("--inv", String(1 / cam.s));
      scaleListeners.forEach((fn) => fn(cam.s));
    }
  };

  cam.set = function (x, y, s) {
    cam.x = x;
    cam.y = y;
    cam.s = s;
    cam.apply();
  };

  cam.clampScale = (s) => L.clamp(s, cam.min, cam.max);

  cam.toWorld = (px, py) => ({ x: (px - cam.x) / cam.s, y: (py - cam.y) / cam.s });

  // World point currently at the middle of the screen, plus the scale.
  cam.focusPoint = function () {
    const p = cam.toWorld(geo.vw / 2, geo.vh / 2);
    return { x: p.x, y: p.y, s: cam.s };
  };

  // Put world point (wx, wy) at the middle of the screen at scale s.
  cam.look = function (wx, wy, s) {
    cam.set(geo.vw / 2 - wx * s, geo.vh / 2 - wy * s, s);
  };

  // Blend between two focus points (scale blends geometrically so zooms feel even).
  cam.lookLerp = function (from, to, e) {
    cam.look(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, from.s * Math.pow(to.s / from.s, e));
  };

  cam.zoomAt = function (px, py, factor) {
    const s = cam.clampScale(cam.s * factor);
    const w = cam.toWorld(px, py);
    cam.set(px - w.x * s, py - w.y * s, s);
  };

  cam.panBy = function (dx, dy) {
    cam.set(cam.x + dx, cam.y + dy, cam.s);
  };

  // What part of the world is on screen right now.
  cam.viewBox = function () {
    const a = cam.toWorld(0, 0);
    return { x: a.x, y: a.y, w: geo.vw / cam.s, h: geo.vh / cam.s };
  };

  function stageRect() {
    return CN.scene.els.stage.getBoundingClientRect();
  }

  // The part of the stage that's actually on screen, as insets: while the
  // header is showing, the bottom of the stage is below the fold.
  function insets() {
    const p = L.clamp(Math.min(geo.vw, geo.vh) * 0.04, 10, 48);
    const r = stageRect();
    const hiddenTop = Math.max(0, -r.top);
    const hiddenBottom = Math.max(0, r.bottom - window.innerHeight);
    return { t: p + hiddenTop, r: p, b: p + 20 + hiddenBottom, l: p };
  }

  // Pointer events report window coordinates; the camera works in stage ones.
  cam.fromClient = function (cx, cy) {
    const r = stageRect();
    return { x: cx - r.left, y: cy - r.top };
  };

  // Vertical movement scrolls the page first (tucking the header away, or
  // bringing it back), and only what's left over moves the camera.
  // `amount` is in page-scroll terms: positive = scroll down.
  function scrollPageFirst(amount) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const room = amount > 0 ? max - y : -y;
    if (Math.abs(room) < 0.5 || Math.sign(room) !== Math.sign(amount)) return amount;
    const used = amount > 0 ? Math.min(amount, room) : Math.max(amount, room);
    window.scrollTo(0, y + used);
    return amount - used;
  }

  // Focus point + scale that fits `box` in the free area (never zooming past maxS).
  cam.fit = function (box, maxS = 1) {
    const i = insets();
    const aw = geo.vw - i.l - i.r;
    const ah = geo.vh - i.t - i.b;
    const s = L.clamp(Math.min(aw / box.w, ah / box.h), cam.min, maxS);
    // The free area's middle isn't the screen's middle, so shift to compensate.
    const offX = i.l + aw / 2 - geo.vw / 2;
    const offY = i.t + ah / 2 - geo.vh / 2;
    return { x: box.x + box.w / 2 - offX / s, y: box.y + box.h / 2 - offY / s, s };
  };

  // The ring, centered in whatever part of the stage is on screen.
  cam.homeTarget = () => cam.fit(L.ringBox(), 1);

  cam.fitAllTarget = function () {
    let box = L.ringBox();
    CN.sections.forEach((s) => {
      if (s.el.bubble) box = L.union(box, L.bubbleBox(s));
    });
    return cam.fit(box);
  };

  // Any camera animation stops as soon as a newer one starts or the user
  // grabs the camera themselves.
  cam.claim = () => ++cam.gen;
  cam.interrupt = () => cam.gen++;

  cam.flyTo = function (target, dur = 700) {
    const gen = cam.claim();
    const from = cam.focusPoint();
    return CN.anim.tween(dur, (e) => cam.lookLerp(from, target, e), {
      ease: CN.anim.ease.inOutCubic,
      alive: () => cam.gen === gen,
    });
  };

  // ---- gestures ----

  const DRAG_THRESHOLD = 5; // px of movement before a press becomes a drag
  const gesture = {
    pointers: new Map(),
    moved: false,
    start: null,
    pinch: null,
    suppressUntil: 0,
    downTarget: null,
  };

  function normalizeWheel(e) {
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.deltaMode === 1) {
      dx *= 16;
      dy *= 16;
    } else if (e.deltaMode === 2) {
      dx *= geo.vw;
      dy *= geo.vh;
    }
    return { dx, dy };
  }

  // Best guess at "this came from a notched mouse wheel" (vs. a trackpad
  // two-finger swipe, which should pan instead of zoom).
  function looksLikeMouseWheel(e) {
    if (e.deltaMode !== 0) return true;
    const legacy = e.wheelDeltaY;
    return e.deltaX === 0 && typeof legacy === "number" && legacy !== 0 && legacy % 120 === 0;
  }

  function pinchInfo() {
    const [a, b] = [...gesture.pointers.values()];
    const mid = cam.fromClient((a.x + b.x) / 2, (a.y + b.y) / 2);
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: mid.x, y: mid.y };
  }

  // Presses that belong to something else: scrolling inside an opened
  // circle, or selecting its text with a mouse.
  function ignorePress(e) {
    const t = e.target;
    if (!(t instanceof Element)) return false;
    if (t.closest(".cn-bubble-scroll.is-scrollable")) return true;
    if (e.pointerType === "mouse" && t.closest(".cn-bubble-body")) return true;
    return false;
  }

  function initGestures(stage) {
    stage.addEventListener("pointerdown", (e) => {
      CN.ix.lastPointerType = e.pointerType;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (ignorePress(e)) return;
      gesture.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cam.interrupt();
      if (gesture.pointers.size === 1) {
        gesture.moved = false;
        gesture.start = { x: e.clientX, y: e.clientY };
        gesture.downTarget = e.target;
      } else if (gesture.pointers.size === 2) {
        gesture.moved = true;
        gesture.pinch = pinchInfo();
        gesture.pointers.forEach((_, id) => {
          try {
            stage.setPointerCapture(id);
          } catch (_) {}
        });
      }
    });

    stage.addEventListener("pointermove", (e) => {
      const prev = gesture.pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      gesture.pointers.set(e.pointerId, cur);

      if (gesture.pointers.size >= 2 && gesture.pinch) {
        const next = pinchInfo();
        cam.zoomAt(gesture.pinch.x, gesture.pinch.y, next.dist / gesture.pinch.dist);
        cam.panBy(next.x - gesture.pinch.x, next.y - gesture.pinch.y);
        gesture.pinch = next;
        return;
      }

      if (!gesture.moved) {
        if (Math.hypot(cur.x - gesture.start.x, cur.y - gesture.start.y) < DRAG_THRESHOLD) return;
        gesture.moved = true;
        stage.classList.add("is-dragging");
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
      // Dragging down scrolls the page up (and vice versa) before panning.
      const restY = -scrollPageFirst(-(cur.y - prev.y));
      cam.panBy(cur.x - prev.x, restY);
    });

    function end(e) {
      if (!gesture.pointers.has(e.pointerId)) return;
      gesture.pointers.delete(e.pointerId);
      if (gesture.pointers.size === 1) {
        // Pinch → one finger left: keep panning from where it is now.
        gesture.pinch = null;
        return;
      }
      if (gesture.pointers.size > 0) return;
      stage.classList.remove("is-dragging");
      if (gesture.moved) {
        // The click that follows a drag must not open anything.
        gesture.suppressUntil = performance.now() + 400;
      } else if (e.type === "pointerup") {
        const t = gesture.downTarget;
        if (t instanceof Element && !t.closest(".cn-dot, .cn-label, .cn-bubble")) CN.ix.onEmptyTap();
      }
      gesture.pinch = null;
    }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);

    stage.addEventListener(
      "click",
      (e) => {
        if (performance.now() < gesture.suppressUntil) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true
    );

    stage.addEventListener(
      "wheel",
      (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!e.ctrlKey && t && t.closest(".cn-bubble-scroll.is-scrollable")) return; // scroll the circle
        e.preventDefault();
        cam.interrupt();
        const { dx, dy } = normalizeWheel(e);
        const at = cam.fromClient(e.clientX, e.clientY);
        if (e.ctrlKey) {
          // Trackpad pinch (and ctrl + wheel) arrive as ctrl-wheel events.
          cam.zoomAt(at.x, at.y, Math.exp(-dy * 0.01));
          return;
        }
        // Any ordinary scroll moves the page first, so the nav scrolls away
        // (or comes back) like on every other page. Only what's left over
        // zooms (mouse wheel) or pans (trackpad) the constellation.
        const restY = scrollPageFirst(dy);
        if (looksLikeMouseWheel(e)) {
          if (restY) cam.zoomAt(at.x, at.y, Math.exp(-restY * 0.0015));
        } else {
          cam.panBy(-dx, -restY);
        }
      },
      { passive: false }
    );

    // Desktop Safari reports trackpad pinches as gesture events instead of
    // ctrl-wheel. On iOS these fire alongside touch pointers, which already
    // handle the pinch, so only zoom here when no touch is active.
    let gestureScale = 1;
    stage.addEventListener("gesturestart", (e) => {
      e.preventDefault();
      gestureScale = 1;
    });
    stage.addEventListener("gesturechange", (e) => {
      e.preventDefault();
      if (gesture.pointers.size) return;
      cam.interrupt();
      const at = cam.fromClient(e.clientX, e.clientY);
      cam.zoomAt(at.x, at.y, e.scale / gestureScale);
      gestureScale = e.scale;
    });
    stage.addEventListener("gestureend", (e) => e.preventDefault());

    // Tabbing to something inside a transformed layer can make the browser
    // scroll the stage; undo that, the camera handles framing instead.
    stage.addEventListener("scroll", () => {
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
    });
  }

  cam.gesture = gesture;
  CN.cam = cam;
  CN.gestures = { init: initGestures };
})();
