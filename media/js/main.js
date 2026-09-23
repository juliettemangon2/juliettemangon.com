/*
  Media constellation — boot.
  Reads window.MEDIA_PAGE, builds the scene, wires the camera and
  interactions, and keeps everything in place on resize.
*/
(function () {
  const CN = window.CN;
  const L = CN.layout;
  const geo = CN.geo;

  function setIntro(data) {
    const el = document.getElementById("cnIntro");
    if (!el) return;
    const touchOnly = window.matchMedia("(hover: none)").matches;
    el.textContent = (touchOnly && data.introTouch) || data.intro || "";
    el.hidden = !el.textContent;
  }

  // On resize/rotation: re-measure, re-place open circles, and keep the same
  // part of the world in the middle of the screen.
  function onResize(stage) {
    const oldR = geo.R;
    const focus = CN.cam.focusPoint();
    L.measure(stage);
    const k = oldR ? geo.R / oldR : 1;
    L.placeAll(CN.sections.filter((s) => s.el.bubble));
    CN.scene.renderAll();
    CN.cam.look(focus.x * k, focus.y * k, CN.cam.s);
  }

  function boot() {
    const data = window.MEDIA_PAGE;
    const stage = document.getElementById("stage");
    if (!data || !stage) return;

    setIntro(data);
    L.measure(stage);
    CN.cam.init(document.getElementById("world"));
    CN.cam.onScale(CN.scene.onScale);
    CN.scene.build(data);
    const home = CN.cam.homeTarget();
    CN.cam.look(home.x, home.y, home.s);
    CN.scene.renderAll();

    CN.gestures.init(stage);
    CN.ix.init();
    CN.ix.restoreFromHash();
    document.body.classList.add("cn-ready");

    let pending = 0;
    const schedule = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => onResize(stage));
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", schedule);
    // The header can change height on its own (fonts loading, intro text
    // re-wrapping), which resizes the stage without a window resize.
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(stage);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
