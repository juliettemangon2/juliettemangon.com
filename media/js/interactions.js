/*
  Media constellation — interactions.
  Hover/focus previews, click/tap/keyboard to open, Escape to close, the
  recenter / fit-all controls, and keeping the URL hash in sync.

  Mouse:     hover = preview, click = open.
  Touch:     first tap = preview, second tap (or tap the title) = open,
             tap empty space = clear preview.
  Keyboard:  Tab/focus = preview, Enter/Space = open, Escape = close newest.
*/
(function () {
  const CN = window.CN;
  const L = CN.layout;
  const seq = () => CN.seq;

  CN.state = { openOrder: [] };

  const ix = {
    lastPointerType: "",
    touchPreview: null,
    quietFocus: false,
    lastPointerDown: 0,
  };

  function maybeUnpreview(sec) {
    if (sec.hovered || sec.focused || ix.touchPreview === sec) return;
    seq().unpreview(sec);
  }

  function setTouchPreview(sec) {
    const prev = ix.touchPreview;
    ix.touchPreview = sec;
    if (prev && prev !== sec) maybeUnpreview(prev);
    if (sec) seq().preview(sec);
  }

  function activate(sec, pointerType) {
    if (sec.open && !sec.closing) {
      seq().open(sec); // already open: fly the camera to it
      return;
    }
    if (pointerType === "touch" && !(ix.touchPreview === sec && sec.phase === "preview")) {
      setTouchPreview(sec);
      return;
    }
    if (ix.touchPreview === sec) ix.touchPreview = null;
    seq().open(sec);
  }

  function bindSection(sec) {
    const { btn, label } = sec.el;
    const inGroup = (node) => node instanceof Node && (btn.contains(node) || label.contains(node));
    const dragging = () => CN.cam.gesture.moved && CN.cam.gesture.pointers.size > 0;

    const enter = (e) => {
      if (e.pointerType === "touch" || dragging()) return;
      sec.hovered = true;
      seq().preview(sec);
    };
    const leave = (e) => {
      if (e.pointerType === "touch") return;
      if (inGroup(e.relatedTarget)) return;
      sec.hovered = false;
      maybeUnpreview(sec);
    };
    btn.addEventListener("pointerenter", enter);
    btn.addEventListener("pointerleave", leave);
    label.addEventListener("pointerenter", enter);
    label.addEventListener("pointerleave", leave);

    btn.addEventListener("focus", () => {
      if (ix.quietFocus) return;
      sec.focused = true;
      seq().preview(sec);
    });
    btn.addEventListener("blur", () => {
      sec.focused = false;
      maybeUnpreview(sec);
    });

    btn.addEventListener("click", (e) => {
      // Keyboard-triggered clicks have detail 0.
      const type = e.detail === 0 ? "keyboard" : e.pointerType || ix.lastPointerType;
      activate(sec, type);
    });
    // Tapping/clicking a visible title opens its section.
    label.addEventListener("click", () => {
      if (ix.touchPreview === sec) ix.touchPreview = null;
      seq().open(sec);
    });
  }

  // Return focus to a dot without re-triggering its preview.
  ix.focusDotQuietly = function (sec) {
    ix.quietFocus = true;
    sec.el.btn.focus({ preventScroll: true });
    ix.quietFocus = false;
  };

  ix.onEmptyTap = function () {
    if (ix.touchPreview) setTouchPreview(null);
  };

  // ---- URL hash: media.html#films,ins-and-outs ----

  CN.hash = {
    read() {
      let raw = "";
      try {
        raw = decodeURIComponent(location.hash.slice(1));
      } catch (_) {}
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
    write() {
      const ids = CN.state.openOrder.map((s) => s.id);
      const url = ids.length ? "#" + ids.join(",") : location.pathname + location.search;
      try {
        history.replaceState(null, "", url);
      } catch (_) {}
    },
  };

  function restoreFromHash() {
    const ids = CN.hash.read().filter((id) => CN.byId[id]);
    if (!ids.length) return false;
    ids.forEach((id) => seq().open(CN.byId[id], { instant: true }));
    // Show the whole constellation if it's still readable; otherwise frame
    // the last circle in the link.
    let t = CN.cam.fitAllTarget();
    if (t.s < 0.55) t = seq().cameraTargetFor(CN.byId[ids[ids.length - 1]]);
    CN.cam.look(t.x, t.y, t.s);
    return true;
  }

  // Someone edited the URL or went back/forward: open whatever is newly
  // listed and close whatever is no longer there.
  function onHashChange() {
    const wanted = new Set(CN.hash.read().filter((id) => CN.byId[id]));
    CN.state.openOrder.filter((s) => !wanted.has(s.id)).forEach((s) => seq().close(s));
    const fresh = [...wanted].map((id) => CN.byId[id]).filter((s) => !s.open || s.closing);
    if (!fresh.length) return;
    fresh.forEach((s) => seq().open(s, { instant: true }));
    CN.cam.flyTo(CN.cam.fitAllTarget(), 700);
  }

  // ---- keyboard ----

  function onKeydown(e) {
    if (e.key === "Escape") {
      const open = CN.state.openOrder.filter((s) => !s.closing);
      const last = open[open.length - 1];
      if (last) {
        e.preventDefault();
        seq().close(last);
      } else if (ix.touchPreview) {
        setTouchPreview(null);
      }
    }
  }

  // Keep keyboard focus on screen: if Tab lands on something the camera
  // can't see, glide over to it.
  function onFocusIn(e) {
    if (performance.now() - ix.lastPointerDown < 500) return;
    const t = e.target;
    if (!(t instanceof Element) || !CN.scene.els.world.contains(t)) return;
    const rect = t.getBoundingClientRect();
    const margin = 24;
    const visible =
      rect.left >= margin &&
      rect.top >= margin &&
      rect.right <= window.innerWidth - margin &&
      rect.bottom <= window.innerHeight - margin;
    if (visible) return;
    const s = CN.cam.fromClient(rect.left, rect.top);
    const r = { left: s.x, top: s.y, width: rect.width, height: rect.height };
    const bubble = t.closest(".cn-bubble");
    const sec = bubble && CN.sections.find((s) => s.el.bubble === bubble);
    if (sec) {
      CN.cam.flyTo(seq().cameraTargetFor(sec), 500);
    } else {
      const w = CN.cam.toWorld(r.left + r.width / 2, r.top + r.height / 2);
      CN.cam.flyTo({ x: w.x, y: w.y, s: CN.cam.s }, 500);
    }
  }

  function init() {
    CN.sections.forEach(bindSection);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", () => (ix.lastPointerDown = performance.now()), true);

    const recenter = document.getElementById("btnRecenter");
    const fitAll = document.getElementById("btnFitAll");
    if (recenter) recenter.addEventListener("click", () => CN.cam.flyTo(CN.cam.homeTarget(), 750));
    if (fitAll) fitAll.addEventListener("click", () => CN.cam.flyTo(CN.cam.fitAllTarget(), 750));
  }

  ix.init = init;
  ix.restoreFromHash = restoreFromHash;
  CN.ix = ix;
})();
