(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const section = document.getElementById("snake-section");
    if (!section) return;

    const canvas = document.getElementById("snake-canvas");
    const ctx = canvas.getContext("2d");
    const playBtn = document.getElementById("snake-play");
    const scoreEl = document.getElementById("snake-score");

    // Make canvas keyboard-focusable so arrows control the game without scrolling the page
    canvas.tabIndex = 0;

    // Grid config
    const GRID_W = 24; // number of cells horizontally
    const GRID_H = 24; // number of cells vertically
    const CELL = 10; // internal pixels per cell
    const FRAME_INTERVAL = 100; // ms between ticks
    const INITIAL_LENGTH = 3;

    // Ensure crisp internal resolution
    canvas.width = GRID_W * CELL;
    canvas.height = GRID_H * CELL;

    // Colors from theme variables
    let colors = { snake: "#000", food: "#fff", board: "#ddd" };
    function refreshColors() {
      const css = getComputedStyle(document.documentElement);
      colors.snake = (css.getPropertyValue("--text") || "#000").trim();
      colors.food = (css.getPropertyValue("--bg") || "#fff").trim();
      colors.board = (css.getPropertyValue("--highlight") || "#ddd").trim();
    }

    // Watch for theme changes (your applyTheme mutates :root style)
    const root = document.documentElement;
    const themeObserver = new MutationObserver(() => {
      refreshColors();
      if (!running) renderFrame(); // keep frozen board consistent with theme
    });
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // Also handle your theme button directly
    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        setTimeout(() => {
          refreshColors();
          if (!running) renderFrame();
        }, 0);
      });
    }

    // Directions
    const DIRS = {
      UP: { axis: "y", value: -1 },
      RIGHT: { axis: "x", value: 1 },
      DOWN: { axis: "y", value: 1 },
      LEFT: { axis: "x", value: -1 },
    };
    const KEY_DIR = {
      ArrowUp: "UP",
      ArrowRight: "RIGHT",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      w: "UP",
      d: "RIGHT",
      s: "DOWN",
      a: "LEFT",
      W: "UP",
      D: "RIGHT",
      S: "DOWN",
      A: "LEFT",
    };

    // Game state
    let score = 0;
    let snake = [];
    let direction = DIRS.RIGHT;
    let changeQueue = [];
    let grow = 0;
    let apple = null;
    let interval = null;
    let running = false;

    // Utils
    function modulo(a, b) {
      const r = a % b;
      return r < 0 ? r + b : r;
    }

    function posEq(a, b) {
      return a.x === b.x && a.y === b.y;
    }
    function collides(pos, arr) {
      return arr.some((p) => posEq(p, pos));
    }

    function randomApple() {
      let p;
      do {
        p = {
          x: Math.floor(Math.random() * GRID_W),
          y: Math.floor(Math.random() * GRID_H),
        };
      } while (collides(p, snake));
      return p;
    }

    function drawCell({ x, y }, fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }

    function renderFrame() {
      // Board background uses --highlight
      ctx.fillStyle = colors.board;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apple uses --bg
      if (apple) drawCell(apple, colors.food);

      // Snake uses --text
      for (const seg of snake) drawCell(seg, colors.snake);
    }

    function tick() {
      const [head, ...tail] = snake;

      const queued = changeQueue.shift();
      if (queued && queued.axis !== direction.axis) direction = queued;

      const axis = direction.axis;
      const newHead = {
        ...head,
        [axis]: modulo(
          head[axis] + direction.value,
          axis === "x" ? GRID_W : GRID_H
        ),
      };

      // Self-collision
      if (collides(newHead, tail)) {
        return lose();
      }

      // Apple
      if (apple && posEq(newHead, apple)) {
        grow = 1;
        apple = randomApple();
        scoreEl.textContent = "Score: " + ++score;
      }

      snake.unshift(newHead);
      if (grow > 0) {
        grow--;
      } else {
        snake.pop();
      }

      renderFrame();
    }

    // Arrow key handler: only when game is running and focus is in the snake section
    function keyHandler(e) {
      const dirName = KEY_DIR[e.key];
      if (!dirName) return;

      // Ignore if typing in a form control
      const t = e.target;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (typing) return;

      const hasFocus = section.contains(document.activeElement);
      if (!running || !hasFocus) return;

      // Prevent page scroll when using arrows during the game
      if (e.key.startsWith("Arrow")) e.preventDefault();

      changeQueue.push(DIRS[dirName]);
    }

    // Reset to initial frozen state (no movement)
    function resetFrozen({ focusButton = false } = {}) {
      if (interval) clearInterval(interval);
      window.removeEventListener("keydown", keyHandler);

      running = false;
      section.classList.remove("lost");

      score = 0;
      scoreEl.textContent = "Score: 0";
      direction = DIRS.RIGHT;
      changeQueue = [];
      snake = [{ x: 3, y: 3 }];
      grow = INITIAL_LENGTH - snake.length;
      apple = randomApple();

      refreshColors();
      renderFrame();

      playBtn.textContent = "Play";

      if (focusButton) {
        // Keep keyboard-friendly restart without jumping the page
        playBtn.focus({ preventScroll: true });
      }
    }

    function start() {
      // Begin moving from the initial state
      if (interval) clearInterval(interval);
      section.classList.remove("lost");

      // If not already at initial, re-init
      score = 0;
      scoreEl.textContent = "Score: 0";
      direction = DIRS.RIGHT;
      changeQueue = [];
      snake = [{ x: 3, y: 3 }];
      grow = INITIAL_LENGTH - snake.length;
      apple = randomApple();

      refreshColors();
      renderFrame();

      interval = setInterval(tick, FRAME_INTERVAL);
      running = true;
      playBtn.textContent = "Restart";

      // Focus canvas so arrows control the game, not the page
      canvas.focus();
      window.addEventListener("keydown", keyHandler);
    }

    function lose() {
      if (interval) clearInterval(interval);
      running = false;
      section.classList.add("lost");
      playBtn.textContent = "Play";
      window.removeEventListener("keydown", keyHandler);
    }

    // Button behavior:
    // - If running: clicking acts as "Restart" -> freeze to initial starting state for next round
    // - If not running: clicking acts as "Play" -> start movement
    playBtn.addEventListener("click", function () {
      if (running) {
        // Restart: freeze to initial and keep focus on button (no scroll)
        resetFrozen({ focusButton: true });
      } else {
        start();
      }
    });

    // Initial frozen board on page load.
    // Delay one frame so your theme's applyTheme (also on DOMContentLoaded) can set CSS vars first.
    requestAnimationFrame(() => {
      refreshColors();
      resetFrozen({ focusButton: false });
    });
  });
})();
