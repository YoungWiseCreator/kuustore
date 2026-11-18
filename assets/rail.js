// KuuStore mirror rail (home): the fixed photograph in the rail changes
// with the service row being read. Opacity crossfade only. Reduced motion
// or no IntersectionObserver: the first frame stays, page fully readable.
(function () {
  var frames = document.querySelectorAll(".rail-frame");
  if (!frames.length) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;
  var byKey = {};
  frames.forEach(function (f) { byKey[f.getAttribute("data-frame")] = f; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var f = byKey[e.target.getAttribute("data-rail")];
      if (!f) return;
      frames.forEach(function (x) { x.classList.toggle("is-on", x === f); });
    });
  }, { threshold: 0.45 });
  document.querySelectorAll("[data-rail]").forEach(function (s) { io.observe(s); });
})();
