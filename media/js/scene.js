/*
  Media constellation — scene.
  Builds the DOM from window.MEDIA_PAGE (ring dots, lines, titles, opened
  circles, and the screen-reader text version) and draws each section from
  its current animation state.
*/
(function () {
  const CN = window.CN;
  const L = CN.layout;
  const geo = CN.geo;
  const SVGNS = "http://www.w3.org/2000/svg";
  const CENTER_R = 4.2;

  const els = {};
  const sections = [];
  const byId = {};
  let noteCount = 0;

  // ---- tiny DOM helpers ----

  function svg(tag, attrs, parent) {
    const node = document.createElementNS(SVGNS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function h(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    [].concat(children).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function slug(str) {
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function entryObj(e) {
    return typeof e === "string" ? { text: e } : e || { text: "" };
  }

  // External links in notes open in a new tab, like they did before.
  function fixLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      if (/^https?:/i.test(a.getAttribute("href"))) {
        a.target = "_blank";
        a.rel = "noopener";
      }
    });
    return root;
  }

  function paragraphs(text) {
    return String(text)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // ---- build ----

  function build(data) {
    els.stage = document.getElementById("stage");
    els.world = document.getElementById("world");
    els.svg = document.getElementById("cnSvg");
    els.gLines = document.getElementById("gLines");
    els.gShapes = document.getElementById("gShapes");
    els.gDots = document.getElementById("gDots");
    els.gParticles = document.getElementById("gParticles");
    els.labels = document.getElementById("labels");
    els.dots = document.getElementById("dotButtons");
    els.bubbles = document.getElementById("bubbles");

    const visible = (data.sections || []).filter((s) => !s.hidden);
    // The center dot every ring line runs to. Decoration only, not clickable.
    els.center = svg("circle", { class: "cn-dot-mark", cx: 0, cy: 0, r: CENTER_R }, els.gDots);
    visible.forEach((d, i) => makeSection(d, i, visible.length));
    buildTextVersion(data, visible);
  }

  function makeSection(data, index, n) {
    const id = data.id ? slug(data.id) : slug(data.title);
    const title = data.title || id;
    const sec = {
      id,
      title,
      data,
      index,
      angle: L.ringAngle(index, n),
      r: L.dotRadius(id),
      // animation state
      inner: 0,
      outer: 0,
      pop: 0,
      shapeOpacity: 0,
      wobble: null,
      dist: 0,
      // interaction state
      phase: "idle",
      open: false,
      closing: false,
      hot: false,
      labelShown: false,
      hovered: false,
      focused: false,
      token: null,
      el: {},
    };

    sec.el.inner = svg("line", { class: "cn-line" }, els.gLines);
    sec.el.outer = svg("line", { class: "cn-line" }, els.gLines);
    sec.el.dot = svg("circle", { class: "cn-dot-mark" }, els.gDots);

    sec.el.btn = h("button", {
      class: "cn-dot",
      type: "button",
      id: "dot-" + id,
      "aria-label": title,
      "aria-expanded": "false",
      "data-id": id,
    });
    els.dots.appendChild(sec.el.btn);

    sec.el.label = h(
      "div",
      { class: "cn-label", "aria-hidden": "true", "data-id": id },
      h("span", { text: title })
    );
    els.labels.appendChild(sec.el.label);

    sections.push(sec);
    byId[id] = sec;
    render(sec);
    return sec;
  }

  // ---- render ----

  // Lines stay ~2.25px on screen at any zoom; dots shrink/grow a little
  // with zoom so they stay dot-like when zoomed far out.
  function dotScale() {
    return 1 / Math.pow(CN.cam.s, 0.7);
  }

  function setLine(line, a, b, p) {
    if (!line) return;
    const full = CN.anim.reduced(); // reduced motion: whole line fades instead of drawing
    const k = full ? 1 : p;
    line.setAttribute("x1", a.x.toFixed(2));
    line.setAttribute("y1", a.y.toFixed(2));
    line.setAttribute("x2", (a.x + (b.x - a.x) * k).toFixed(2));
    line.setAttribute("y2", (a.y + (b.y - a.y) * k).toFixed(2));
    line.style.opacity = p > 0.001 ? "1" : "0";
  }

  function renderDot(sec) {
    const r = sec.r * dotScale() * (sec.hot ? 1.3 : 1);
    sec.el.dot.setAttribute("r", r.toFixed(2));
  }

  function render(sec) {
    const p = L.dotPos(sec);
    sec.el.dot.setAttribute("cx", p.x.toFixed(2));
    sec.el.dot.setAttribute("cy", p.y.toFixed(2));
    renderDot(sec);
    sec.el.btn.style.left = p.x + "px";
    sec.el.btn.style.top = p.y + "px";
    sec.el.label.style.transform = L.labelTransform(sec, sec.r * 1.3);

    setLine(sec.el.inner, p, { x: 0, y: 0 }, sec.inner);
    if (sec.dist) setLine(sec.el.outer, p, L.outerEnd(sec), sec.outer);
    else sec.el.outer.style.opacity = "0";

    const b = sec.el.bubble;
    if (b) {
      const c = L.bubbleCenter(sec);
      const size = geo.d + "px";
      if (b.style.getPropertyValue("--d") !== size) b.style.setProperty("--d", size);
      b.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, -50%) scale(${sec.pop})`;
      sec.el.shape.setAttribute("transform", `translate(${c.x.toFixed(2)} ${c.y.toFixed(2)}) scale(${sec.pop})`);
      sec.el.shape.style.opacity = String(sec.shapeOpacity);
      const d = sec.wobble == null ? CN.anim.circlePath(geo.d / 2) : CN.anim.blobPath(geo.d / 2, sec.wobble);
      if (sec.el.path.getAttribute("d") !== d) sec.el.path.setAttribute("d", d);
    }
  }

  function renderAll() {
    sections.forEach(render);
  }

  function onScale(s) {
    els.svg.style.setProperty("--sw", (2.25 / s).toFixed(3) + "px");
    sections.forEach(renderDot);
    if (els.center) els.center.setAttribute("r", (CENTER_R * dotScale()).toFixed(2));
  }

  function setHot(sec, on) {
    sec.hot = on;
    sec.el.dot.classList.toggle("is-hot", on);
    renderDot(sec);
  }

  function showLabel(sec, on) {
    sec.labelShown = on;
    sec.el.label.classList.toggle("is-shown", on);
  }

  // ---- opened circles ----

  function buildBubble(sec) {
    const id = sec.id;
    const variant = sec.data.variant || "default";
    const type = sec.data.type || "list";

    sec.el.shape = svg("g", { class: "cn-shape" }, els.gShapes);
    sec.el.path = svg("path", { class: "cn-shape-path" }, sec.el.shape);
    sec.el.shape.style.opacity = "0";

    const scroll = h("div", { class: "cn-bubble-scroll", tabindex: "-1" }, h("div", { class: "cn-bubble-content" }, renderContent(sec)));
    const closeBtn = h("button", {
      class: "cn-bubble-close",
      type: "button",
      "aria-label": "Close " + sec.title,
      html: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
    });
    const body = h("div", { class: "cn-bubble-body" }, [
      h("h2", { class: "cn-bubble-title", id: "bubble-title-" + id, tabindex: "-1", text: sec.title }),
      scroll,
      closeBtn,
    ]);
    const bubble = h(
      "section",
      {
        class: "cn-bubble",
        id: "bubble-" + id,
        "aria-labelledby": "bubble-title-" + id,
        "data-type": type,
        "data-variant": variant,
      },
      body
    );
    els.bubbles.appendChild(bubble);
    sec.el.bubble = bubble;
    sec.el.scroll = scroll;
    sec.el.btn.setAttribute("aria-expanded", "true");
    sec.el.btn.setAttribute("aria-controls", bubble.id);

    closeBtn.addEventListener("click", () => CN.seq.close(sec));
    wireScrollFades(sec, scroll);
    render(sec);
  }

  function removeBubble(sec) {
    if (!sec.el.bubble) return;
    if (sec.el.scrollObserver) sec.el.scrollObserver.disconnect();
    sec.el.bubble.remove();
    sec.el.shape.remove();
    sec.el.bubble = sec.el.shape = sec.el.path = sec.el.scroll = sec.el.scrollObserver = null;
    sec.el.btn.removeAttribute("aria-controls");
    sec.wobble = null;
    sec.pop = 0;
    sec.shapeOpacity = 0;
  }

  function showBody(sec, on) {
    if (sec.el.bubble) sec.el.bubble.classList.toggle("is-open", on);
  }

  // Soft fade at the top/bottom only where there's more to scroll to.
  function wireScrollFades(sec, scroll) {
    const update = () => {
      const scrollable = scroll.scrollHeight > scroll.clientHeight + 1;
      scroll.classList.toggle("is-scrollable", scrollable);
      scroll.classList.toggle("fade-top", scrollable && scroll.scrollTop > 2);
      scroll.classList.toggle("fade-bottom", scrollable && scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 2);
    };
    scroll.addEventListener("scroll", update, { passive: true });
    const content = scroll.firstElementChild;
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(update);
      ro.observe(scroll);
      ro.observe(content);
      sec.el.scrollObserver = ro;
    }
    requestAnimationFrame(update);
  }

  // ---- circle content ----

  function renderContent(sec) {
    const data = sec.data;
    if (data.variant === "columns" && data.columns) {
      return h(
        "div",
        { class: "cn-columns" },
        data.columns.map((col) =>
          h("div", { class: "cn-column" }, [h("h3", { text: col.heading || "" }), renderEntries(sec, col.entries || [], "list")])
        )
      );
    }
    const parts = [];
    if (data.body) parts.push(renderBody(data.body));
    if (data.entries && data.entries.length) parts.push(renderEntries(sec, data.entries, data.type));
    return h("div", {}, parts);
  }

  function renderBody(text) {
    return fixLinks(h("div", { class: "cn-text" }, paragraphs(text).map((p) => h("p", { html: p }))));
  }

  function renderEntries(sec, entries, type) {
    const numbered = sec.data.variant === "numbered";
    const list = h(numbered ? "ol" : "ul", {
      class: "cn-entries" + (type === "media" ? " cn-entries--media" : " cn-entries--list") + (numbered ? " is-numbered" : ""),
    });
    entries.map(entryObj).forEach((entry, i) => {
      const num = numbered ? h("span", { class: "cn-num", "aria-hidden": "true", text: String(i + 1).padStart(2, "0") }) : null;
      if (entry.note || entry.image) {
        const noteId = `note-${sec.id}-${++noteCount}`;
        const toggle = h(
          "button",
          { class: "cn-entry-toggle", type: "button", "aria-expanded": "false", "aria-controls": noteId },
          [num, h("span", { class: "cn-entry-text", text: entry.text }), h("span", { class: "cn-entry-icon", "aria-hidden": "true" })]
        );
        const noteInner = h("div", { class: "cn-note-inner" });
        if (entry.image) noteInner.appendChild(h("img", { src: entry.image, alt: entry.text, loading: "lazy" }));
        if (entry.note) noteInner.appendChild(h("div", { html: entry.note }));
        if (entry.link) noteInner.appendChild(h("p", {}, h("a", { href: entry.link, class: "cn-entry-link", text: "link ↗" })));
        fixLinks(noteInner);
        const note = h("div", { class: "cn-note", id: noteId, inert: "" }, noteInner);
        toggle.addEventListener("click", () => {
          const open = toggle.getAttribute("aria-expanded") !== "true";
          toggle.setAttribute("aria-expanded", String(open));
          note.classList.toggle("is-open", open);
          note.inert = !open;
        });
        list.appendChild(h("li", { class: "cn-entry has-note" }, [toggle, note]));
      } else {
        const text = entry.link
          ? fixLinks(h("span", {}, h("a", { href: entry.link, text: entry.text })))
          : h("span", { class: "cn-entry-text", text: entry.text });
        list.appendChild(h("li", { class: "cn-entry" }, [num, text]));
      }
    });
    return list;
  }

  // ---- screen-reader text version ----

  function buildTextVersion(data, visible) {
    const root = document.getElementById("textVersion");
    if (!root) return;
    const kids = [h("h1", { text: "Media" })];

    visible.forEach((sec) => {
      kids.push(h("h2", { text: sec.title }));
      if (sec.body) paragraphs(sec.body).forEach((p) => kids.push(h("p", { html: p })));
      const lists = sec.columns ? sec.columns : [{ entries: sec.entries || [] }];
      lists.forEach((col) => {
        if (col.heading) kids.push(h("h3", { text: col.heading }));
        const ul = h("ul");
        (col.entries || []).map(entryObj).forEach((e) => {
          const li = h("li", { text: e.text });
          if (e.note) li.appendChild(h("div", { html: e.note }));
          if (e.link) li.appendChild(h("a", { href: e.link, text: "link" }));
          ul.appendChild(li);
        });
        if (ul.childElementCount) kids.push(ul);
      });
    });
    kids.forEach((k) => root.appendChild(k));
    // Readable by screen readers, but invisible links shouldn't catch Tab.
    fixLinks(root).querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
  }

  CN.sections = sections;
  CN.byId = byId;
  CN.scene = {
    els,
    build,
    render,
    renderAll,
    onScale,
    setHot,
    showLabel,
    buildBubble,
    removeBubble,
    showBody,
  };
})();
