// KuuStore gallery lightbox (2026-11-16): tap any gallery tile to view that photo large.
(function () {
  var overlay = null, imgEl = null, capEl = null, items = [], idx = 0;

  function largest(img) {
    var best = img.currentSrc || img.src, bw = 0;
    if (img.srcset) {
      img.srcset.split(',').forEach(function (p) {
        var m = p.trim().match(/(\S+)\s+(\d+)w/);
        if (m && +m[2] > bw) { bw = +m[2]; best = m[1]; }
      });
    }
    return best;
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Photo viewer');
    imgEl = document.createElement('img');
    imgEl.alt = '';
    capEl = document.createElement('div');
    capEl.className = 'lb-cap';
    var close = document.createElement('button');
    close.className = 'lb-btn lb-close';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close');
    var prev = document.createElement('button');
    prev.className = 'lb-btn lb-prev';
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Previous photo');
    var next = document.createElement('button');
    next.className = 'lb-btn lb-next';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next photo');
    overlay.appendChild(imgEl);
    overlay.appendChild(capEl);
    overlay.appendChild(close);
    overlay.appendChild(prev);
    overlay.appendChild(next);
    document.body.appendChild(overlay);
    close.addEventListener('click', hide);
    prev.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  function show() {
    var it = items[idx];
    imgEl.src = it.src;
    imgEl.alt = it.alt;
    capEl.textContent = it.cap;
  }
  function step(d) { idx = (idx + d + items.length) % items.length; show(); }
  function hide() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('.photo-grid figure img') : null;
    if (!img) return;
    if (!overlay) build();
    var grid = img.closest('.photo-grid');
    var figs = grid.querySelectorAll('figure');
    items = Array.prototype.map.call(figs, function (f) {
      var im = f.querySelector('img');
      var cap = f.querySelector('figcaption');
      return { src: largest(im), alt: im.alt || '', cap: cap ? cap.textContent.trim() : '' };
    });
    idx = Array.prototype.indexOf.call(grid.querySelectorAll('figure img'), img);
    show();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
})();
