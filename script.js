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

  /* ---------- Landing: the knowledge graph ----------
     The site as a small force-directed graph. The centre node is the person,
     the five labelled nodes are the sections, and the small nodes are what
     each section holds. Nodes spring into place on load, signals travel
     along the links, sections light up in turn until the visitor points at
     one, any node can be dragged, and a click goes to that part of the page. */

  function graph(nav) {
    var canvas = nav.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var anchors = Array.prototype.slice.call(nav.querySelectorAll("a[data-node]"));
    var GW = 400, GH = 360, CX = 200, CY = 180;      // graph space
    var TEAL = "15,109,115", SLATE = "88,98,102";

    var LEAVES = {
      work: [["Document QA Agent", "doc-qa"], ["Maintenance RAG", "maintenance-rag"], ["Skin analysis", "skin-analysis"]],
      projects: [["Harness", "projects"], ["Calico MCTS", "projects"], ["tw50-quant-data", "projects"]],
      experience: [["Elite Material", "experience"], ["Jubilee Biomedical", "experience"], ["King’s College London", "experience"]],
      skills: [["RAG", "skills"], ["vLLM", "skills"], ["Python", "skills"], ["Docker", "skills"], ["FastAPI", "skills"]],
      contact: [["Email", "contact"], ["GitHub", "contact"], ["LinkedIn", "contact"]]
    };
    // Which skills were used where
    var CROSS = [["RAG", "Document QA Agent"], ["RAG", "Maintenance RAG"], ["vLLM", "Maintenance RAG"],
                 ["Docker", "Maintenance RAG"], ["Docker", "Harness"], ["Python", "Harness"], ["Python", "Calico MCTS"]];

    var nodes = [], edges = [], pulses = [], byLabel = {};
    var centre = { kind: "centre", x: CX, y: CY, vx: 0, vy: 0, charge: 3.2, section: -1, r: 21 };
    nodes.push(centre);
    anchors.forEach(function (a, i) {
      var angle = -2.5 + i * (Math.PI * 2 / anchors.length);
      var section = { kind: "section", el: a, section: i, charge: 2.6, r: 30, vx: 0, vy: 0,
                      x: CX + Math.cos(angle) * 8, y: CY + Math.sin(angle) * 8 };
      nodes.push(section);
      edges.push({ a: centre, b: section, len: 90, k: 0.03, section: i });
      (LEAVES[a.dataset.node] || []).forEach(function (leaf, j) {
        var node = { kind: "leaf", label: leaf[0], target: leaf[1], section: i, charge: 1, r: 4.2, vx: 0, vy: 0,
                     x: section.x + Math.cos(angle + j) * 4, y: section.y + Math.sin(angle + j) * 4 };
        nodes.push(node);
        byLabel[leaf[0]] = node;
        edges.push({ a: section, b: node, len: 62, k: 0.05, section: i });
      });
    });
    CROSS.forEach(function (pair) {
      edges.push({ a: byLabel[pair[0]], b: byLabel[pair[1]], len: 130, k: 0.0012, cross: true });
    });
    nodes.forEach(function (n, i) { n.phase = i * 1.7; });

    var heat = anchors.map(function () { return 0; });
    var w = 0, h = 0, scale = 1, ox = 0, oy = 0;
    var active = -1, hovered = null, dragging = null, moved = false, suppressClick = false;
    var visible = true, frameId = 0, born = 0, lastPulse = 0, ticks = 0;

    function layout() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w / GW, h / GH);
      ox = (w - GW * scale) / 2;
      oy = (h - GH * scale) / 2;
    }

    function step(t) {
      var i, j, a, b, dx, dy, d, f;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = b.x - a.x; dy = b.y - a.y;
          d = Math.max(Math.sqrt(dx * dx + dy * dy), 10);
          f = 620 * a.charge * b.charge / (d * d);
          dx /= d; dy /= d;
          a.vx -= dx * f; a.vy -= dy * f;
          b.vx += dx * f; b.vy += dy * f;
        }
      }
      edges.forEach(function (e) {
        dx = e.b.x - e.a.x; dy = e.b.y - e.a.y;
        d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        f = (d - e.len) * e.k;
        dx /= d; dy /= d;
        e.a.vx += dx * f; e.a.vy += dy * f;
        e.b.vx -= dx * f; e.b.vy -= dy * f;
      });
      centre.vx += (CX - centre.x) * 0.09;
      centre.vy += (CY - centre.y) * 0.09;
      nodes.forEach(function (n) {
        if (n === dragging) { n.vx = 0; n.vy = 0; return; }
        n.vx += (CX - n.x) * 0.0016 + Math.sin(t * 0.7 + n.phase) * 0.028;   // keeps it gently alive
        n.vy += (CY - n.y) * 0.0016 + Math.cos(t * 0.6 + n.phase) * 0.028;
        n.vx *= 0.8; n.vy *= 0.8;
        var speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 7) { n.vx *= 7 / speed; n.vy *= 7 / speed; }
        n.x += n.vx; n.y += n.vy;
        var padX = n.kind === "section" ? 36 : 12, padY = n.kind === "section" ? 16 : 12;
        n.x = Math.max(padX, Math.min(GW - padX, n.x));
        n.y = Math.max(padY, Math.min(GH - padY, n.y));
      });
    }

    function px(n) { return ox + n.x * scale; }
    function py(n) { return oy + n.y * scale; }

    function setActive(section) {
      if (section === active) return;
      active = section;
      anchors.forEach(function (a, i) { a.classList.toggle("on", i === section); });
    }

    function draw(now, settled) {
      var t = settled ? 99 : (now - born) / 1000;
      var i, e, n;
      if (!settled) { step(t); ticks += 1; }

      // Until the visitor points at something, light the sections up in turn
      if (!settled && !hovered && !dragging && t > 2.4) setActive(Math.floor((t - 2.4) / 2.4) % anchors.length);

      for (i = 0; i < heat.length; i++) {
        var goal = i === active ? 1 : 0;
        heat[i] = settled ? goal : heat[i] + (goal - heat[i]) * 0.12;
      }
      var anyHeat = Math.max.apply(null, heat);
      var shown = settled ? 1 : Math.max(0, Math.min(1, (t - 0.25) / 0.9));

      anchors.forEach(function (a) {
        a.style.setProperty("--tx", px(a.node).toFixed(1) + "px");
        a.style.setProperty("--ty", py(a.node).toFixed(1) + "px");
      });

      ctx.clearRect(0, 0, w, h);

      // Links
      for (i = 0; i < edges.length; i++) {
        e = edges[i];
        var hot = e.cross ? Math.max(heat[e.a.section], heat[e.b.section]) * 0.6 : heat[e.section];
        var base = e.cross ? 0.09 : 0.3;
        var alpha = (base - base * 0.45 * (anyHeat - hot) + 0.5 * hot) * shown;
        ctx.strokeStyle = "rgba(" + (hot > 0.2 ? TEAL : SLATE) + "," + alpha.toFixed(3) + ")";
        ctx.lineWidth = e.cross ? 1 : 1.3;
        if (e.cross) ctx.setLineDash([3, 4]); else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(px(e.a), py(e.a));
        ctx.lineTo(px(e.b), py(e.b));
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Signals travelling outwards along the links
      if (!settled && shown >= 1) {
        if (now - lastPulse > 150 && pulses.length < 16) {
          lastPulse = now;
          var pool = edges.filter(function (ed) { return !ed.cross && (active < 0 || ed.section === active || Math.random() < 0.25); });
          pulses.push({ edge: pool[Math.floor(Math.random() * pool.length)], t: 0 });
        }
        for (i = pulses.length - 1; i >= 0; i--) {
          var pulse = pulses[i];
          pulse.t += 0.028;
          if (pulse.t >= 1) { pulses.splice(i, 1); continue; }
          ctx.fillStyle = "rgba(" + TEAL + "," + (0.95 * Math.sin(pulse.t * Math.PI)).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(px(pulse.edge.a) + (px(pulse.edge.b) - px(pulse.edge.a)) * pulse.t,
                  py(pulse.edge.a) + (py(pulse.edge.b) - py(pulse.edge.a)) * pulse.t, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Leaf nodes and, for the active section, their names
      ctx.font = "600 " + Math.max(11.5, 13 * Math.min(scale, 1.05)).toFixed(1) + "px 'Source Sans 3', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.kind !== "leaf") continue;
        var nh = heat[n.section];
        var x = px(n), y = py(n);
        var isHovered = n === hovered || n === dragging;
        var dim = 0.6 - 0.25 * (anyHeat - nh);
        ctx.fillStyle = nh > 0.02
          ? "rgba(" + TEAL + "," + ((dim + (1 - dim) * nh) * shown).toFixed(3) + ")"
          : "rgba(" + SLATE + "," + (dim * shown).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(x, y, (n.r + 1.6 * nh + (isHovered ? 1.5 : 0)) * Math.max(scale, 0.85), 0, Math.PI * 2);
        ctx.fill();
        if (nh > 0.05) {
          var parent = anchors[n.section].node;
          var right = n.x >= parent.x;
          var tw = ctx.measureText(n.label).width;
          if (right && x + 9 + tw > w - 3) right = false;       // no room: flip to the other side
          if (!right && x - 9 - tw < 3) right = true;
          var tx = right ? x + 9 : x - 9 - tw;
          tx = Math.max(3, Math.min(w - tw - 3, tx));
          ctx.fillStyle = "rgba(250,246,236," + (0.85 * nh).toFixed(3) + ")";
          ctx.fillRect(tx - 3, y - 9, tw + 6, 18);
          ctx.fillStyle = "rgba(" + (isHovered ? TEAL : "35,41,43") + "," + nh.toFixed(3) + ")";
          ctx.fillText(n.label, tx, y + 0.5);
        }
      }

      // Centre node
      var cr = centre.r * Math.max(scale, 0.85);
      var beat = settled ? 0 : (t % 2.4) / 2.4;
      ctx.strokeStyle = "rgba(" + TEAL + "," + (0.4 * (1 - beat) * shown).toFixed(3) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px(centre), py(centre), cr + beat * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(" + TEAL + "," + shown.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(px(centre), py(centre), cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,253,247," + shown.toFixed(3) + ")";
      ctx.font = "650 " + (15 * Math.max(scale, 0.85)).toFixed(1) + "px 'Schibsted Grotesk', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WH", px(centre), py(centre) + 1);
      ctx.textAlign = "start";
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

    function nodeAt(event) {
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left, y = event.clientY - rect.top;
      var best = null, bestD = Infinity;
      nodes.forEach(function (n) {
        var reach = (n.kind === "leaf" ? 15 : n.kind === "section" ? 34 : 26);
        var d = Math.sqrt((px(n) - x) * (px(n) - x) + (py(n) - y) * (py(n) - y));
        if (d < reach && d < bestD) { best = n; bestD = d; }
      });
      return { node: best, gx: (x - ox) / scale, gy: (y - oy) / scale };
    }

    function point(node) {
      hovered = node;
      if (node && node.section >= 0) setActive(node.section);
      else if (reduce && !node) setActive(-1);
      nav.style.cursor = node ? (dragging ? "grabbing" : "pointer") : "";
      redraw();
    }

    function go(node) {
      if (node.kind === "section") { node.el.click(); return; }
      if (node.kind === "centre") { window.location.hash = "#top"; return; }
      window.location.hash = "#" + node.target;
    }

    anchors.forEach(function (a) { a.node = nodes.filter(function (n) { return n.el === a; })[0]; });

    nav.addEventListener("pointerdown", function (event) {
      var hit = nodeAt(event);
      if (!hit.node || reduce) return;
      dragging = hit.node;
      moved = false;
      dragging.grabX = hit.gx; dragging.grabY = hit.gy;
      nav.setPointerCapture(event.pointerId);
      nav.style.cursor = "grabbing";
    });
    nav.addEventListener("pointermove", function (event) {
      var hit = nodeAt(event);
      if (dragging) {
        if (Math.abs(hit.gx - dragging.grabX) + Math.abs(hit.gy - dragging.grabY) > 6) moved = true;
        if (moved) {
          dragging.x = Math.max(10, Math.min(GW - 10, hit.gx));
          dragging.y = Math.max(10, Math.min(GH - 10, hit.gy));
        }
        return;
      }
      point(hit.node);
    });
    function release(event) {
      if (!dragging) return;
      var node = dragging;
      dragging = null;
      nav.style.cursor = "";
      if (moved) {
        suppressClick = true;                    // a drag is not a click
        setTimeout(function () { suppressClick = false; }, 60);
      } else if (event.type === "pointerup") {
        // Pointer capture retargets the click to the container, so follow
        // the node's link here instead of relying on the native click.
        go(node);
      }
    }
    nav.addEventListener("pointerup", release);
    nav.addEventListener("pointercancel", release);
    nav.addEventListener("pointerleave", function () {
      if (dragging) return;
      point(null);
      born = performance.now() - 2400;           // resume the tour from the first section
    });
    nav.addEventListener("click", function (event) {
      if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    anchors.forEach(function (a) {
      a.addEventListener("focus", function () { point(a.node); });
      a.addEventListener("blur", function () { point(null); });
      a.addEventListener("dragstart", function (event) { event.preventDefault(); });
    });

    layout();
    born = performance.now();
    if (reduce) {
      for (var s = 0; s < 400; s++) step(0);    // settle without showing the motion
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

  var graphNav = document.querySelector(".graph");
  if (graphNav) graph(graphNav);

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
