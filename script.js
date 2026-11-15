// Progressive enhancement only: the page is complete without this file.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Landing: streamed answer ---------- */

  // Wrap each word in a span so CSS can reveal them in turn.
  function stream(el, start, step) {
    var parts = el.textContent.replace(/\s+/g, " ").trim().split(" ");
    var frag = document.createDocumentFragment();
    parts.forEach(function (part, i) {
      var span = document.createElement("span");
      span.textContent = part;
      span.style.setProperty("--d", (start + i * step).toFixed(3) + "s");
      frag.appendChild(span);
      if (i < parts.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    el.textContent = "";
    el.appendChild(frag);
    return start + parts.length * step;
  }

  function delay(el, seconds) {
    if (el) el.style.setProperty("--d", seconds.toFixed(3) + "s");
  }

  var landing = document.querySelector(".landing");
  var retrieval = null;   // when the graph should run its retrieval, in ms
  if (landing && !reduce) {
    var begin = 0.1;
    delay(landing.querySelector("h1"), begin);
    var answered = stream(landing.querySelector(".summary"), begin + 0.6, 0.026);
    delay(landing.querySelector(".actions"), begin + 0.75);
    delay(landing.querySelector(".retrieved p"), answered);
    landing.querySelectorAll(".retrieved li").forEach(function (li, i) {
      delay(li, answered + 0.12 + i * 0.15);
    });
    retrieval = { start: begin * 1000, end: (answered + 0.9) * 1000 };
    landing.classList.add("play");
  }

  /* ---------- Landing: the knowledge graph, as a rotating sphere ----------
     The site as a graph in three dimensions. The centre node is the person,
     the five labelled nodes are the sections, the small nodes are what each
     section holds, and the faint mesh is the rest of the index. It turns on
     its own, can be spun by dragging, and lights up whichever section faces
     the visitor. As the answer on the left streams in, a retrieval
     runs across it: centre, Work, then the three cases the answer cites. */

  function graph(nav, timing) {
    var canvas = nav.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var anchors = Array.prototype.slice.call(nav.querySelectorAll("a[data-node]"));
    var SIZE = 450, R = 142, INNER = 108, OUTER = 174, FOCAL = 620;
    var TEAL = "15,109,115", SLATE = "88,98,102", INK = "35,41,43";

    var DIRS = { work: [-0.6, -0.45, 0.66], projects: [0.66, -0.52, 0.55], skills: [0.93, 0.3, -0.22],
                 contact: [-0.05, 0.84, -0.54], experience: [-0.84, 0.32, -0.44] };
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

    function unit(v) {
      var d = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
      return [v[0] / d, v[1] / d, v[2] / d];
    }
    function cross3(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function make(kind, dir, radius, extra) {
      var n = { kind: kind, p: [dir[0] * radius, dir[1] * radius, dir[2] * radius], sx: 0, sy: 0, z: 0, k: 1, flash: -9 };
      for (var key in extra) n[key] = extra[key];
      return n;
    }

    var nodes = [], edges = [], mesh = [], meshEdges = [], byLabel = {}, byTarget = {};
    var centre = make("centre", [0, 0, 0], 0, { section: -1 });
    nodes.push(centre);
    anchors.forEach(function (a, i) {
      var d = unit(DIRS[a.dataset.node]);
      var section = make("section", d, INNER, { el: a, section: i });
      a.node = section;
      nodes.push(section);
      edges.push({ a: centre, b: section, section: i });
      var u = unit(cross3(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      var v = cross3(d, u);
      var list = LEAVES[a.dataset.node] || [];
      list.forEach(function (leaf, j) {
        var angle = 0.6 + j * (Math.PI * 2 / list.length);
        var spread = list.length > 3 ? 0.68 : 0.58;
        var dir = unit([d[0] + spread * (Math.cos(angle) * u[0] + Math.sin(angle) * v[0]),
                        d[1] + spread * (Math.cos(angle) * u[1] + Math.sin(angle) * v[1]),
                        d[2] + spread * (Math.cos(angle) * u[2] + Math.sin(angle) * v[2])]);
        var node = make("leaf", dir, OUTER, { label: leaf[0], target: leaf[1], section: i });
        nodes.push(node);
        byLabel[leaf[0]] = node;
        if (!byTarget[leaf[1]]) byTarget[leaf[1]] = node;
        edges.push({ a: section, b: node, section: i });
      });
    });
    CROSS.forEach(function (pair) {
      edges.push({ a: byLabel[pair[0]], b: byLabel[pair[1]], cross: true });
    });
    // The rest of the index: an even lattice of faint points on the sphere
    var MESH = 96;
    for (var m = 0; m < MESH; m++) {
      var y = 1 - (m + 0.5) * 2 / MESH, ring = Math.sqrt(1 - y * y), phi = m * 2.399963;
      mesh.push(make("mesh", [Math.cos(phi) * ring, y, Math.sin(phi) * ring], R, {}));
    }
    mesh.forEach(function (a, i) {
      mesh.map(function (b, j) {
        return [(a.p[0] - b.p[0]) * (a.p[0] - b.p[0]) + (a.p[1] - b.p[1]) * (a.p[1] - b.p[1]) + (a.p[2] - b.p[2]) * (a.p[2] - b.p[2]), j];
      }).sort(function (p, q) { return p[0] - q[0]; }).slice(1, 3).forEach(function (near) {
        if (near[1] > i) meshEdges.push([a, mesh[near[1]]]);
      });
    });

    // The retrieval that accompanies the streamed answer
    var workNode = anchors.filter(function (a) { return a.dataset.node === "work"; })[0].node;
    var route = [[centre, workNode], [workNode, byLabel["Document QA Agent"]],
                 [workNode, byLabel["Maintenance RAG"]], [workNode, byLabel["Skin analysis"]]];
    var HOP = 430;

    var heat = anchors.map(function () { return 0; });
    var w = 0, h = 0, scale = 1;
    var yaw = -0.9, pitch = -0.2, spin = 0.004, spinP = 0;
    var active = -1, hovered = null, spot = null, drag = null, suppressClick = false;
    var visible = true, frameId = 0, born = 0;

    function layout() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w, h) / SIZE;
    }

    function project(n, grow) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var x = n.p[0] * grow, y = n.p[1] * grow, z = n.p[2] * grow;
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      n.k = FOCAL / (FOCAL - z2);
      n.sx = w / 2 + x1 * n.k * scale;
      n.sy = h / 2 + y2 * n.k * scale;
      n.z = z2;
    }

    // Turn towards a node so that it faces the visitor
    function face(n, rate) {
      var frontYaw = Math.atan2(-n.p[0], n.p[2]);
      var z1 = -n.p[0] * Math.sin(frontYaw) + n.p[2] * Math.cos(frontYaw);
      // Not dead centre: up and to the right, clear of the centre node
      var wantYaw = frontYaw + 0.5;
      var wantPitch = Math.max(-0.9, Math.min(0.9, Math.atan2(n.p[1], z1) + 0.36));
      var dy = wantYaw - yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw += dy * rate;
      pitch += (wantPitch - pitch) * rate;
    }

    function depth(n) {            // 0 at the back, 1 at the front
      return Math.max(0, Math.min(1, (n.z / OUTER + 1) / 2));
    }

    function setActive(section) {
      if (section === active) return;
      active = section;
      anchors.forEach(function (a, i) { a.classList.toggle("on", i === section); });
    }

    function draw(now, still) {
      var t = now - born;
      var i, e, n;
      var grow = still ? 1 : 1 - Math.pow(1 - Math.min(1, t / 1300), 3);      // expands from the centre
      var shown = still ? 1 : Math.min(1, t / 700);
      var retrieving = !still && timing && t >= timing.start && t < timing.end;
      var hop = retrieving ? (t - timing.start) / HOP : -1;

      if (!still && !drag) {
        if (retrieving) {
          face(workNode, 0.06);
        } else if (spot) {
          face(spot, 0.07);
        } else {
          spin += ((hovered ? 0 : 0.004) - spin) * 0.05;
          spinP *= 0.92;
          yaw += spin;
          pitch += spinP + (-0.2 - pitch) * 0.01;
        }
      }
      pitch = Math.max(-1.2, Math.min(1.2, pitch));

      nodes.forEach(function (node) { project(node, grow); });
      mesh.forEach(function (node) { project(node, grow); });

      // Light the section in focus: the one pointed at, cited, or facing the visitor
      if (retrieving) {
        setActive(workNode.section);
      } else if (spot) {
        setActive(spot.section);
      } else if (hovered && hovered.section >= 0) {
        setActive(hovered.section);
      } else if (!drag || active < 0) {
        var front = anchors[0].node;
        anchors.forEach(function (a) { if (a.node.z > front.z + (a.node.section === active ? 0 : 14)) front = a.node; });
        if (active < 0 || anchors[active].node.z < front.z - 14) setActive(front.section);
      }
      for (i = 0; i < heat.length; i++) {
        var goal = i === active ? 1 : 0;
        heat[i] = still ? goal : heat[i] + (goal - heat[i]) * 0.12;
      }
      var anyHeat = Math.max.apply(null, heat);

      anchors.forEach(function (a) {
        var s = a.node, d = depth(s);
        a.style.setProperty("--tx", s.sx.toFixed(1) + "px");
        a.style.setProperty("--ty", s.sy.toFixed(1) + "px");
        a.style.setProperty("--grow", (s.k * (0.72 + 0.28 * d) * (s.section === active ? 1.08 : 1) * Math.max(grow, 0.3)).toFixed(3));
        a.style.opacity = ((s.section === active ? 1 : 0.1 + 0.9 * d * d) * shown).toFixed(3);   // the far side recedes
        a.style.zIndex = String(10 + Math.round(d * 10));
      });

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";

      // The faint mesh
      ctx.lineWidth = 1;
      for (i = 0; i < meshEdges.length; i++) {
        var ma = meshEdges[i][0], mb = meshEdges[i][1];
        ctx.strokeStyle = "rgba(" + SLATE + "," + ((0.03 + 0.1 * depth(ma)) * shown).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(ma.sx, ma.sy);
        ctx.lineTo(mb.sx, mb.sy);
        ctx.stroke();
      }
      for (i = 0; i < mesh.length; i++) {
        n = mesh[i];
        ctx.fillStyle = "rgba(" + SLATE + "," + ((0.1 + 0.3 * depth(n)) * shown).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, 1.5 * n.k * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Links
      for (i = 0; i < edges.length; i++) {
        e = edges[i];
        var hot = e.cross ? Math.max(heat[e.a.section], heat[e.b.section]) * 0.6 : heat[e.section];
        var d2 = (depth(e.a) + depth(e.b)) / 2;
        var base = (e.cross ? 0.08 : 0.26) * (0.45 + 0.55 * d2);
        var alpha = (base - base * 0.4 * (anyHeat - hot) + 0.5 * hot * (0.5 + 0.5 * d2)) * shown;
        ctx.strokeStyle = "rgba(" + (hot > 0.2 ? TEAL : SLATE) + "," + alpha.toFixed(3) + ")";
        ctx.lineWidth = e.cross ? 1 : 1.4;
        ctx.setLineDash(e.cross ? [3, 4] : []);
        ctx.beginPath();
        ctx.moveTo(e.a.sx, e.a.sy);
        ctx.lineTo(e.b.sx, e.b.sy);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Idle signals running outwards
      if (!still && !retrieving && shown >= 1) {
        for (i = 0; i < edges.length; i++) {
          e = edges[i];
          if (e.cross) continue;
          var lit = e.section === active;
          var cycle = ((t / (lit ? 1100 : 2600)) + i * 0.37) % 1;
          if (!lit && (i * 7 + Math.floor(t / 2600)) % 3) continue;
          ctx.fillStyle = "rgba(" + TEAL + "," + (0.9 * Math.sin(cycle * Math.PI) * (0.4 + 0.6 * depth(e.b))).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(e.a.sx + (e.b.sx - e.a.sx) * cycle, e.a.sy + (e.b.sy - e.a.sy) * cycle, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // The retrieval path
      if (retrieving) {
        ctx.shadowColor = "rgba(" + TEAL + ",0.9)";
        for (i = 0; i < route.length; i++) {
          var progress = Math.max(0, Math.min(1, hop - i));
          if (progress <= 0) continue;
          var from = route[i][0], to = route[i][1];
          var hx = from.sx + (to.sx - from.sx) * progress, hy = from.sy + (to.sy - from.sy) * progress;
          ctx.shadowBlur = 10;
          ctx.strokeStyle = "rgba(" + TEAL + ",0.95)";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(from.sx, from.sy);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          if (progress < 1) {
            ctx.shadowBlur = 18;
            ctx.fillStyle = "rgba(" + TEAL + ",1)";
            ctx.beginPath();
            ctx.arc(hx, hy, 4.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (to.flash < timing.start) {
            to.flash = t;                       // arrived: this node has been retrieved
          }
        }
        ctx.shadowBlur = 0;
      }

      // Leaf nodes and, for the section in focus, their names
      var leaves = nodes.filter(function (node) { return node.kind === "leaf"; }).sort(function (p, q) { return p.z - q.z; });
      ctx.font = "600 " + Math.max(11.5, 13 * Math.min(scale, 1.05)).toFixed(1) + "px 'Source Sans 3', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      for (i = 0; i < leaves.length; i++) {
        n = leaves[i];
        var nh = heat[n.section], dn = depth(n);
        var cited = retrieving && n.flash >= timing.start;
        var focus = n === hovered || n === spot || cited;
        var dim = (0.5 - 0.2 * (anyHeat - nh)) * (0.4 + 0.6 * dn);
        ctx.fillStyle = (nh > 0.02 || cited)
          ? "rgba(" + TEAL + "," + (Math.min(1, dim + (1 - dim) * Math.max(nh, cited ? 1 : 0)) * shown).toFixed(3) + ")"
          : "rgba(" + SLATE + "," + (dim * shown).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, (4 + 1.6 * nh + (focus ? 1.8 : 0)) * n.k * Math.max(scale, 0.85), 0, Math.PI * 2);
        ctx.fill();
        var since = (t - n.flash) / 900;
        if (focus && (n === spot || (since >= 0 && since < 1))) {
          var ringT = n === spot ? (t % 1200) / 1200 : since;
          ctx.strokeStyle = "rgba(" + TEAL + "," + (0.7 * (1 - ringT)).toFixed(3) + ")";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(n.sx, n.sy, 6 + ringT * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
        var named = Math.max(nh, cited ? 1 : 0);
        if (named > 0.05) {
          var parent = anchors[n.section].node;
          var right = n.sx >= parent.sx;
          var tw = ctx.measureText(n.label).width;
          if (right && n.sx + 10 + tw > w - 3) right = false;     // no room: flip to the other side
          if (!right && n.sx - 10 - tw < 3) right = true;
          var tx = right ? n.sx + 10 : n.sx - 10 - tw;
          var la = named * (0.35 + 0.65 * dn);
          ctx.fillStyle = "rgba(250,246,236," + (0.85 * la).toFixed(3) + ")";
          ctx.fillRect(tx - 3, n.sy - 9, tw + 6, 18);
          ctx.fillStyle = "rgba(" + (focus ? TEAL : INK) + "," + la.toFixed(3) + ")";
          ctx.fillText(n.label, tx, n.sy + 0.5);
        }
      }

      // Centre node
      var cr = 20 * centre.k * Math.max(scale, 0.85) * Math.max(grow, 0.4);
      var beat = still ? 0.3 : (t % 2400) / 2400;
      ctx.strokeStyle = "rgba(" + TEAL + "," + (0.4 * (1 - beat) * shown).toFixed(3) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centre.sx, centre.sy, cr + beat * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(" + TEAL + "," + shown.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(centre.sx, centre.sy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,253,247," + shown.toFixed(3) + ")";
      ctx.font = "650 " + (15 * Math.max(scale, 0.85)).toFixed(1) + "px 'Schibsted Grotesk', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WH", centre.sx, centre.sy + 1);
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
      var link = event.target.closest ? event.target.closest("a[data-node]") : null;
      if (link) return link.node;
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left, y = event.clientY - rect.top;
      var best = null, score = Infinity;
      nodes.forEach(function (n) {
        if (n.kind === "section") return;
        var reach = n.kind === "leaf" ? 16 : 24;
        var d = Math.sqrt((n.sx - x) * (n.sx - x) + (n.sy - y) * (n.sy - y));
        if (d < reach && d - n.z * 0.05 < score) { best = n; score = d - n.z * 0.05; }   // prefer the nearer side
      });
      return best;
    }

    function go(node) {
      if (node.kind === "section") { node.el.click(); return; }
      window.location.hash = "#" + (node.kind === "centre" ? "top" : node.target);
    }

    nav.addEventListener("pointerdown", function (event) {
      if (event.button) return;
      drag = { x: event.clientX, y: event.clientY, node: nodeAt(event), moved: false };
      nav.setPointerCapture(event.pointerId);
    });
    nav.addEventListener("pointermove", function (event) {
      if (drag) {
        var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
        if (drag.moved) {
          spin = dx * 0.008;
          spinP = -dy * 0.006;
          yaw += spin;
          pitch += spinP;
          drag.x = event.clientX; drag.y = event.clientY;
          nav.classList.add("turning");
          redraw();
        }
        return;
      }
      hovered = nodeAt(event);
      nav.style.cursor = hovered ? "pointer" : "";
      redraw();
    });
    function release(event) {
      if (!drag) return;
      var was = drag;
      drag = null;
      nav.classList.remove("turning");
      if (was.moved) {
        suppressClick = true;                    // a spin is not a click
        setTimeout(function () { suppressClick = false; }, 60);
      } else if (event.type === "pointerup" && was.node) {
        // Pointer capture retargets the click to the container, so follow
        // the node's link here instead of relying on the native click.
        go(was.node);
      }
    }
    nav.addEventListener("pointerup", release);
    nav.addEventListener("pointercancel", release);
    nav.addEventListener("pointerleave", function () {
      if (drag) return;
      hovered = null;
      redraw();
    });
    nav.addEventListener("click", function (event) {
      if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    anchors.forEach(function (a) {
      a.addEventListener("focus", function () { spot = a.node; redraw(); });
      a.addEventListener("blur", function () { spot = null; redraw(); });
      a.addEventListener("dragstart", function (event) { event.preventDefault(); });
    });

    // The Sources on the left point at their nodes on the sphere
    document.querySelectorAll(".retrieved a").forEach(function (chip) {
      var node = byTarget[chip.getAttribute("href").slice(1)];
      if (!node) return;
      function on() { spot = node; if (reduce) { face(node, 1); redraw(); } }
      function off() { spot = null; redraw(); }
      chip.addEventListener("pointerenter", on);
      chip.addEventListener("pointerleave", off);
      chip.addEventListener("focus", on);
      chip.addEventListener("blur", off);
    });

    layout();
    born = performance.now();
    if (reduce) {
      face(workNode, 1);
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
  if (graphNav) graph(graphNav, retrieval);

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
