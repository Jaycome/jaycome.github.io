// Progressive enhancement only: the page is complete without this file.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  // Mark the section being read in the masthead.
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
