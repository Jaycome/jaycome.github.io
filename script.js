// Progressive enhancement only: the page is complete without this file.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Landing: typed question, streamed answer ---------- */

  // Wrap each word (or character) in a span so CSS can reveal them in turn.
  function stream(el, start, step) {
    var byChar = el.dataset.stream === "char";
    var text = el.textContent.replace(/\s+/g, " ").trim();
    var parts = byChar ? Array.from(text) : text.split(" ");
    var frag = document.createDocumentFragment();
    var n = 0;
    parts.forEach(function (part, i) {
      if (byChar && part === " ") {
        frag.appendChild(document.createTextNode(" "));
        return;
      }
      var span = document.createElement("span");
      span.textContent = part;
      span.style.setProperty("--d", (start + n * step).toFixed(3) + "s");
      frag.appendChild(span);
      if (!byChar && i < parts.length - 1) frag.appendChild(document.createTextNode(" "));
      n += 1;
    });
    el.textContent = "";
    el.appendChild(frag);
    return start + n * step;
  }

  function delay(el, seconds) {
    if (el) el.style.setProperty("--d", seconds.toFixed(3) + "s");
  }

  var landing = document.querySelector(".landing");
  if (landing && !reduce) {
    var query = landing.querySelector(".query");
    var typed = stream(landing.querySelector("[data-stream='char']"), 0.45, 0.03);
    delay(query, 0.1);
    delay(landing.querySelector("h1"), typed + 0.15);
    var answered = stream(landing.querySelector(".summary"), typed + 0.75, 0.026);
    delay(landing.querySelector(".actions"), typed + 0.9);
    delay(landing.querySelector(".retrieved p"), answered);
    landing.querySelectorAll(".retrieved li").forEach(function (li, i) {
      delay(li, answered + 0.12 + i * 0.15);
    });
    landing.classList.add("play");
  }

  /* ---------- Landing: retrieval field ----------
     Points drift like document chunks in an embedding space. The teal query
     point links to its nearest neighbours, and follows the pointer. */

  function field(canvas, section) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var K = 5;
    var w = 0, h = 0, wide = true;
    var points = [];
    var q = { x: 0, y: 0, placed: false };
    var pointer = null;
    var visible = true;
    var frameId = 0;

    function random(seed) {
      return function () {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
    }

    function layout() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      wide = w >= 900;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rand = random(20261115);
      var count = Math.max(34, Math.min(130, Math.round((w * h) / 9500)));
      points = [];
      for (var i = 0; i < count; i++) {
        points.push({
          x: rand(), y: rand(),
          phase: rand() * Math.PI * 2,
          speed: 0.25 + rand() * 0.45,
          r: 1.6 + rand() * 1.8,
          heat: 0, px: 0, py: 0, d: 0
        });
      }
    }

    function draw(now, snap) {
      var t = now / 1000;
      var tx, ty;
      if (pointer) {
        tx = pointer.x;
        ty = pointer.y;
      } else {
        // Wander on its own, on the open side of the layout
        tx = (wide ? w * 0.74 : w * 0.5) + (wide ? w * 0.19 : w * 0.34) * Math.sin(t * 0.31);
        ty = h * 0.5 + h * 0.33 * Math.sin(t * 0.47 + 1.3);
      }
      if (!q.placed || snap) {
        q.x = tx; q.y = ty; q.placed = true;
      } else {
        q.x += (tx - q.x) * 0.07;
        q.y += (ty - q.y) * 0.07;
      }

      var i, p;
      for (i = 0; i < points.length; i++) {
        p = points[i];
        p.px = p.x * w + Math.sin(t * p.speed + p.phase) * 12;
        p.py = p.y * h + Math.cos(t * p.speed * 0.8 + p.phase) * 12;
        p.d = (p.px - q.x) * (p.px - q.x) + (p.py - q.y) * (p.py - q.y);
      }
      var ranked = points.slice().sort(function (a, b) { return a.d - b.d; });
      for (i = 0; i < ranked.length; i++) {
        var target = i < K ? 1 : 0;
        ranked[i].heat = snap ? target : ranked[i].heat + (target - ranked[i].heat) * 0.12;
      }

      ctx.clearRect(0, 0, w, h);

      ctx.lineWidth = 1.2;
      for (i = 0; i < points.length; i++) {
        p = points[i];
        if (p.heat < 0.02) continue;
        ctx.strokeStyle = "rgba(15,109,115," + (0.5 * p.heat).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(p.px, p.py);
        ctx.stroke();
      }

      for (i = 0; i < points.length; i++) {
        p = points[i];
        ctx.fillStyle = "rgba(88,98,102,0.3)";
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.heat > 0.02) {
          ctx.fillStyle = "rgba(15,109,115," + p.heat.toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(p.px, p.py, p.r + 2.2 * p.heat, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Query point with a slow pulse
      var pulse = snap ? 0.35 : (t % 1.8) / 1.8;
      ctx.strokeStyle = "rgba(15,109,115," + (0.45 * (1 - pulse)).toFixed(3) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 8 + pulse * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#faf6ec";
      ctx.beginPath();
      ctx.arc(q.x, q.y, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f6d73";
      ctx.beginPath();
      ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop(now) {
      draw(now, false);
      frameId = requestAnimationFrame(loop);
    }

    function start() {
      if (reduce || frameId || !visible || document.hidden) return;
      frameId = requestAnimationFrame(loop);
    }

    function stop() {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    layout();
    if (reduce) {
      draw(4000, true);
    } else {
      start();
      section.addEventListener("pointermove", function (event) {
        if (event.pointerType !== "mouse") return;
        var rect = canvas.getBoundingClientRect();
        pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      });
      section.addEventListener("pointerleave", function () { pointer = null; });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else start();
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) start(); else stop();
        }).observe(section);
      }
    }

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        layout();
        if (reduce) draw(4000, true);
      }, 150);
    });
  }

  var canvas = document.querySelector(".field");
  if (canvas && landing) field(canvas, landing);

  /* ---------- Pipelines and results run when scrolled into view ---------- */

  var staged = document.querySelectorAll(".flow, .results");

  function countUp(el) {
    var to = Number(el.dataset.count);
    var from = Number(el.dataset.from || 0);
    var start = null;
    var duration = 1100;
    function tick(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    el.textContent = from;
    requestAnimationFrame(tick);
  }

  function run(el) {
    el.classList.add("run");
    if (!reduce) el.querySelectorAll("[data-count]").forEach(countUp);
  }

  if (!("IntersectionObserver" in window)) {
    staged.forEach(function (el) { el.classList.add("run"); });
    return;
  }

  var stage = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      run(entry.target);
      stage.unobserve(entry.target);
    });
  }, { threshold: 0.35 });
  staged.forEach(function (el) { stage.observe(el); });

  /* ---------- Mark the section being read in the masthead ---------- */

  var links = {};
  document.querySelectorAll(".masthead nav a[href^='#']").forEach(function (a) {
    links[a.getAttribute("href").slice(1)] = a;
  });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var link = links[entry.target.id];
      if (!link) return;
      if (entry.isIntersecting) {
        Object.keys(links).forEach(function (id) { links[id].removeAttribute("aria-current"); });
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  Object.keys(links).forEach(function (id) {
    var section = document.getElementById(id);
    if (section) spy.observe(section);
  });
})();
