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

  /* ---------- Landing: the brain ----------
     A point cloud in the shape of a brain. Each region is a section of the
     page: frontal = Work, parietal = Projects, temporal = Experience,
     occipital = Skills, cerebellum and brainstem = Contact. Points assemble
     on load, signals travel along the links, regions light up in turn until
     the visitor points at one, and a click goes to that section. */

  function brain(nav) {
    var canvas = nav.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll("a[data-region]"));
    var REGIONS = links.length;
    var BW = 400, BH = 330;            // brain space
    var TEAL = "15,109,115", SLATE = "88,98,102";

    // Outlines in brain space (the brain faces left, towards the text)
    var cerebrum = new Path2D("M62 188C40 120 95 45 195 40C285 36 365 85 372 165C376 205 350 228 318 230C290 232 270 236 245 246C210 262 150 268 118 244C100 232 78 222 62 188Z");
    var cerebellum = new Path2D();
    cerebellum.ellipse(300, 264, 54, 31, -0.18, 0, Math.PI * 2);
    var stem = new Path2D("M226 252C244 262 262 262 272 256C270 284 276 304 284 322L250 322C246 300 238 276 226 252Z");
    var probe = document.createElement("canvas").getContext("2d");

    function regionAt(x, y) {
      if (probe.isPointInPath(cerebrum, x, y)) {
        if (x > 96 && x < 272 && y > 207 - (x - 96) * 0.2) return 2;   // below the lateral fissure
        if (x > 312 - (y - 40) * 0.1) return 3;                         // rear
        if (x < 188 + (y - 40) * 0.14) return 0;                        // ahead of the central sulcus
        return 1;
      }
      if (probe.isPointInPath(cerebellum, x, y) || probe.isPointInPath(stem, x, y)) return 4;
      return -1;
    }

    function random(seed) {
      return function () {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
    }

    var points = [], edges = [], pulses = [], ripples = [];
    var heat = [], w = 0, h = 0, scale = 1, ox = 0, oy = 0;
    var active = -1, hovered = -1, pointer = null;
    var visible = true, frameId = 0, born = 0, lastPulse = 0;
    for (var r = 0; r < REGIONS; r++) heat.push(0);

    function build() {
      var rand = random(20261115);
      var target = w < 340 ? 230 : 350;
      var minDist = w < 340 ? 11.5 : 9.4;
      points = [];
      for (var tries = 0; tries < 40000 && points.length < target; tries++) {
        var x = 36 + rand() * 344, y = 32 + rand() * 294;
        var region = regionAt(x, y);
        if (region < 0) continue;
        var ok = true;
        for (var i = 0; i < points.length; i++) {
          var dx = points[i].bx - x, dy = points[i].by - y;
          if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
        }
        if (!ok) continue;
        points.push({
          bx: x, by: y, region: region,
          sx: -60 + rand() * 520, sy: -40 + rand() * 410,   // scattered start
          delay: region * 0.16 + rand() * 0.35,
          phase: rand() * Math.PI * 2, speed: 0.5 + rand() * 0.7,
          r: 1.25 + rand() * 1.1, x: 0, y: 0
        });
      }
      // Link each point to its nearest neighbours in the same region, so the
      // gaps between regions read as the fissures between lobes.
      edges = [];
      var seen = {};
      points.forEach(function (p, i) {
        var near = [];
        points.forEach(function (o, j) {
          if (i === j || o.region !== p.region) return;
          var d = (o.bx - p.bx) * (o.bx - p.bx) + (o.by - p.by) * (o.by - p.by);
          if (d < 34 * 34) near.push([d, j]);
        });
        near.sort(function (a, b) { return a[0] - b[0]; });
        near.slice(0, 3).forEach(function (n) {
          var key = Math.min(i, n[1]) + "-" + Math.max(i, n[1]);
          if (seen[key]) return;
          seen[key] = true;
          edges.push({ a: i, b: n[1], region: p.region });
        });
      });
      pulses = [];
    }

    function layout() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rebuilt = !points.length || (rect.width < 340) !== (w < 340);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w / BW, h / BH);
      ox = (w - BW * scale) / 2;
      oy = (h - BH * scale) / 2;
      if (rebuilt) build();
    }

    function ease(t) {
      t = Math.max(0, Math.min(1, t));
      return 1 - Math.pow(1 - t, 3);
    }

    function setActive(region) {
      if (region === active) return;
      active = region;
      links.forEach(function (a) {
        a.classList.toggle("on", Number(a.dataset.region) === region);
      });
    }

    function draw(now, settled) {
      var t = settled ? 99 : (now - born) / 1000;
      var i, p, e, a, b;

      // Until the visitor points at a region, light them up in turn
      if (!settled && hovered < 0 && t > 2.6) setActive(Math.floor((t - 2.6) / 2.4) % REGIONS);

      for (i = 0; i < REGIONS; i++) {
        var goal = i === active ? 1 : 0;
        heat[i] = settled ? goal : heat[i] + (goal - heat[i]) * 0.1;
      }
      var anyHeat = Math.max.apply(null, heat);

      var formed = 0;
      for (i = 0; i < points.length; i++) {
        p = points[i];
        var k = ease((t - 0.35 - p.delay) / 1.5);
        formed += k;
        var wob = settled ? 0 : 1.6;
        var tx = p.bx + Math.sin(t * p.speed + p.phase) * wob;
        var ty = p.by + Math.cos(t * p.speed * 0.8 + p.phase) * wob;
        var lift = heat[p.region] * 3;   // an active region swells slightly
        p.x = ox + (p.sx + (tx - p.sx) * k) * scale;
        p.y = oy + (p.sy + (ty - p.sy) * k - lift) * scale;
      }
      formed = points.length ? formed / points.length : 1;
      var wired = ease((formed - 0.75) / 0.25);

      ctx.clearRect(0, 0, w, h);

      // Links
      ctx.lineWidth = 1;
      for (i = 0; i < edges.length; i++) {
        e = edges[i];
        a = points[e.a]; b = points[e.b];
        var hot = heat[e.region];
        var alpha = (0.2 - 0.09 * (anyHeat - hot) + 0.45 * hot) * wired;
        if (alpha < 0.01) continue;
        ctx.strokeStyle = "rgba(" + (hot > 0.25 ? TEAL : SLATE) + "," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Signals travelling along the links
      if (!settled && wired > 0.9) {
        if (now - lastPulse > 70 && pulses.length < 46) {
          lastPulse = now;
          var pick = edges[Math.floor(Math.random() * edges.length)];
          if (active >= 0 && Math.random() < 0.7) {
            for (var n = 0; n < 6 && pick.region !== active; n++) {
              pick = edges[Math.floor(Math.random() * edges.length)];
            }
          }
          pulses.push({ edge: pick, t: 0, flip: Math.random() < 0.5 });
        }
        for (i = pulses.length - 1; i >= 0; i--) {
          var pulse = pulses[i];
          pulse.t += 0.035;
          if (pulse.t >= 1) { pulses.splice(i, 1); continue; }
          a = points[pulse.flip ? pulse.edge.b : pulse.edge.a];
          b = points[pulse.flip ? pulse.edge.a : pulse.edge.b];
          ctx.fillStyle = "rgba(" + TEAL + "," + (0.9 * Math.sin(pulse.t * Math.PI)).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(a.x + (b.x - a.x) * pulse.t, a.y + (b.y - a.y) * pulse.t, 1.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Points
      for (i = 0; i < points.length; i++) {
        p = points[i];
        var ph = heat[p.region];
        var dim = 0.62 - 0.27 * (anyHeat - ph);
        ctx.fillStyle = ph > 0.02
          ? "rgba(" + TEAL + "," + (dim + (1 - dim) * ph).toFixed(3) + ")"
          : "rgba(" + SLATE + "," + dim.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.r + 0.9 * ph) * Math.max(scale, 0.8), 0, Math.PI * 2);
        ctx.fill();
      }

      // The pointer links to its nearest points, like a query in a vector index
      if (pointer && wired > 0.9) {
        var near = points.map(function (q) {
          return [(q.x - pointer.x) * (q.x - pointer.x) + (q.y - pointer.y) * (q.y - pointer.y), q];
        }).sort(function (m, n2) { return m[0] - n2[0]; }).slice(0, 5);
        ctx.lineWidth = 1.2;
        near.forEach(function (m) {
          if (m[0] > 90 * 90) return;
          ctx.strokeStyle = "rgba(" + TEAL + ",0.55)";
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(m[1].x, m[1].y);
          ctx.stroke();
        });
      }

      // Ripples from a click or tap
      for (i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i];
        rp.t += 0.03;
        if (rp.t >= 1) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = "rgba(" + TEAL + "," + (0.6 * (1 - rp.t)).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 6 + rp.t * 70, 0, Math.PI * 2);
        ctx.stroke();
      }
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

    function redraw() {
      if (reduce) draw(0, true);
    }

    function regionFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      var px = event.clientX - rect.left, py = event.clientY - rect.top;
      var region = regionAt((px - ox) / scale, (py - oy) / scale);
      if (region < 0) {
        // Forgive near misses: take the region of the closest point
        var best = 26 * 26;
        points.forEach(function (p) {
          var d = (p.x - px) * (p.x - px) + (p.y - py) * (p.y - py);
          if (d < best) { best = d; region = p.region; }
        });
      }
      return { region: region, x: px, y: py };
    }

    function point(region) {
      hovered = region;
      if (region >= 0) setActive(region);
      else if (reduce) setActive(-1);
      canvas.style.cursor = region >= 0 ? "pointer" : "";
      redraw();
    }

    canvas.addEventListener("pointermove", function (event) {
      var hit = regionFromEvent(event);
      pointer = event.pointerType === "mouse" ? { x: hit.x, y: hit.y } : null;
      point(hit.region);
    });
    canvas.addEventListener("pointerleave", function () {
      pointer = null;
      point(-1);
      born = performance.now() - 2600;   // resume the tour from the first region
    });
    canvas.addEventListener("click", function (event) {
      var hit = regionFromEvent(event);
      if (hit.region < 0) return;
      setActive(hit.region);
      ripples.push({ x: hit.x, y: hit.y, t: 0 });
      var link = links[hit.region];
      setTimeout(function () { link.click(); }, reduce ? 0 : 320);
    });
    links.forEach(function (a) {
      var region = Number(a.dataset.region);
      a.addEventListener("pointerenter", function () { point(region); });
      a.addEventListener("pointerleave", function () { point(-1); });
      a.addEventListener("focus", function () { point(region); });
      a.addEventListener("blur", function () { point(-1); });
    });

    layout();
    born = performance.now();
    if (reduce) {
      draw(0, true);
    } else {
      start();
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else start();
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) start(); else stop();
        }).observe(nav);
      }
    }

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        layout();
        redraw();
      }, 150);
    });
  }

  var brainNav = document.querySelector(".brain");
  if (brainNav) brain(brainNav);

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
