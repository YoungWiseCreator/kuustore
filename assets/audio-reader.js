/* audio-reader.js — fleet article audio reader (Cameron, 2026-11-18).
 *
 * Drop-in: one <script src=".../audio-reader.js" defer></script> on any
 * article page. Zero dependencies, zero paid services: reads the article
 * aloud with the browser Web Speech API (speechSynthesis), in the language
 * the visitor picked on the site language toggle (fleet set:
 * en · es · fr · pt · ru · zh · he), using the most natural voice the
 * visitor's device offers for that language.
 *
 * Behavior:
 *  - Builds a player at the TOP of the article (right under the headline /
 *    byline) and a second one at the END of the article. Both drive one
 *    shared reading engine.
 *  - If the article has NO embedded YouTube video of our own, the top
 *    player is PROMINENT (accent border + "no time to read?" callout) so
 *    nobody misses that they can listen instead of reading. With a video
 *    it is still present, in the standard compact form.
 *  - Reads the text exactly as displayed: blocks are collected from the
 *    live DOM at play time, so a language-toggle swap is what gets read.
 *    Switching the toggle mid-reading restarts the reading in the new
 *    language.
 *  - Long articles are chunked at sentence boundaries (~180 chars per
 *    utterance, chained one at a time) so browser speech never stalls or
 *    cuts off; a watchdog resume() covers the known Chrome long-speech
 *    pause bug.
 *  - The player lives in a data-i18n-skip subtree so index-based i18n
 *    text walkers (BST / lead sites) never see its strings; its own UI
 *    labels are localized in the 7 fleet languages.
 *  - Controls: play / pause / resume + stop, a progress bar and a
 *    "part X of N" reading state.
 */
(function () {
  'use strict';
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  if (document.querySelector('.audio-reader')) return; // idempotent

  var LANGS = ['en', 'es', 'fr', 'pt', 'ru', 'zh', 'he'];
  var BCP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN', he: 'he-IL' };
  var L = {
    en: { listen: 'Listen to this article', sub: 'No time to read? Press play and listen instead.', play: 'Play', pause: 'Pause', stop: 'Stop', reading: 'Reading', paused: 'Paused', done: 'Finished', tap: 'Tap play to listen' },
    es: { listen: 'Escucha este artículo', sub: '¿Sin tiempo para leer? Pulsa reproducir y escúchalo.', play: 'Reproducir', pause: 'Pausar', stop: 'Detener', reading: 'Leyendo', paused: 'En pausa', done: 'Terminado', tap: 'Pulsa reproducir para escuchar' },
    fr: { listen: 'Écouter cet article', sub: 'Pas le temps de lire ? Appuyez sur lecture et écoutez.', play: 'Lecture', pause: 'Pause', stop: 'Arrêter', reading: 'Lecture en cours', paused: 'En pause', done: 'Terminé', tap: 'Appuyez sur lecture pour écouter' },
    pt: { listen: 'Ouça este artigo', sub: 'Sem tempo para ler? Aperte o play e ouça.', play: 'Ouvir', pause: 'Pausar', stop: 'Parar', reading: 'Lendo', paused: 'Pausado', done: 'Terminado', tap: 'Aperte o play para ouvir' },
    ru: { listen: 'Слушать эту статью', sub: 'Нет времени читать? Нажмите play и слушайте.', play: 'Слушать', pause: 'Пауза', stop: 'Стоп', reading: 'Читаю', paused: 'Пауза', done: 'Готово', tap: 'Нажмите play, чтобы слушать' },
    zh: { listen: '收听这篇文章', sub: '没时间读？点播放，听这篇文章。', play: '播放', pause: '暂停', stop: '停止', reading: '正在朗读', paused: '已暂停', done: '朗读完毕', tap: '点播放开始收听' },
    he: { listen: 'האזינו לכתבה', sub: 'אין זמן לקרוא? לחצו על הפעלה והאזינו.', play: 'הפעלה', pause: 'השהיה', stop: 'עצירה', reading: 'מקריא', paused: 'מושהה', done: 'הסתיים', tap: 'לחצו על הפעלה כדי להאזין' }
  };
  var SKIP_SEL = 'script,style,noscript,iframe,button,nav,footer,form,[data-i18n-skip],' +
    '.photo-credits,.audio-reader,.lang-switch,.share,.related,.keep-reading,.explain,.post-nav,.byline';
  var MAXCHUNK = 180;
  var synth = window.speechSynthesis;

  /* ---------------- styles (single-file drop-in; audio-reader.css is the
     same sheet for sites that prefer a <link>) ---------------- */
  var CSS = [
    '.audio-reader{--ar-accent:var(--color-accent,#c8401f);--ar-edge:var(--color-edge-strong,rgba(130,130,130,.5));--ar-muted:var(--color-muted,#8a8378);border:1px solid var(--ar-edge);border-radius:14px;padding:12px 14px;margin:16px 0;background:rgba(127,127,127,.07);font:inherit;box-sizing:border-box}',
    '.audio-reader *{box-sizing:border-box}',
    '.audio-reader.ar-prominent{border:2px solid var(--ar-accent);padding:16px 16px 14px;background:rgba(127,127,127,.10)}',
    '.audio-reader .ar-head{display:flex;align-items:center;gap:9px;font-weight:700;font-size:1.02rem;line-height:1.25}',
    '.audio-reader .ar-head svg{flex:0 0 auto;width:22px;height:22px;fill:var(--ar-accent)}',
    '.audio-reader.ar-prominent .ar-head{font-size:1.15rem}',
    '.audio-reader .ar-sub{margin:6px 0 2px;color:var(--ar-muted);font-size:.92rem;line-height:1.4}',
    '.audio-reader .ar-controls{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}',
    '.audio-reader .ar-btn{appearance:none;border:1px solid var(--ar-edge);background:transparent;color:inherit;border-radius:999px;min-width:44px;height:44px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font:inherit;font-size:.9rem}',
    '.audio-reader .ar-btn svg{width:16px;height:16px;fill:currentColor}',
    '.audio-reader .ar-play{background:var(--ar-accent);border-color:var(--ar-accent);color:#fff;min-width:52px}',
    '.audio-reader .ar-progress{flex:1 1 120px;height:6px;border-radius:3px;background:rgba(127,127,127,.25);overflow:hidden}',
    '.audio-reader .ar-bar{height:100%;width:0%;background:var(--ar-accent);transition:width .3s ease}',
    '.audio-reader .ar-status{font-size:.85rem;color:var(--ar-muted);white-space:nowrap}',
    '@media (max-width:480px){.audio-reader .ar-status{white-space:normal}.audio-reader .ar-progress{flex-basis:100%;order:5}}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'audio-reader-styles';
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ---------------- language ---------------- */
  function normLang(v) {
    if (!v) return null;
    var c = String(v).toLowerCase().replace('_', '-').slice(0, 2);
    return LANGS.indexOf(c) >= 0 ? c : null;
  }
  function detectLang() {
    // The fleet language system persists the visitor's choice to
    // localStorage 'nmt_lang' on every toggle click — that is the
    // authoritative signal. (The static HTML hardcodes the English
    // button as .active, so the button class alone can lie on load.)
    try { var s = normLang(window.localStorage.getItem('nmt_lang')); if (s) return s; } catch (e) {}
    var active = document.querySelector('.lang-btn.active,[data-lang].active,.lang-btn[aria-pressed="true"]');
    if (active && active.getAttribute('data-lang')) { var a = normLang(active.getAttribute('data-lang')); if (a) return a; }
    var d = normLang(document.documentElement.getAttribute('lang'));
    return d || 'en';
  }
  function pickVoice(lang) {
    var vs = [];
    try { vs = synth.getVoices() || []; } catch (e) { return null; }
    var target = (BCP[lang] || 'en-US').toLowerCase();
    var matches = vs.filter(function (v) {
      return v.lang && v.lang.toLowerCase().replace('_', '-').indexOf(lang) === 0;
    });
    if (!matches.length) return null;
    function score(v) {
      var n = (v.name || '').toLowerCase(), s = 0;
      if (/natural|neural/.test(n)) s += 50;
      if (/google/.test(n)) s += 40;
      if (/premium|enhanced/.test(n)) s += 30;
      if (/microsoft/.test(n)) s += 20;
      if (!v.localService) s += 10;
      if (v.lang.toLowerCase().replace('_', '-') === target) s += 15;
      if (/compact|eloquence|whisper|novelty|zarvox|bubbles/.test(n)) s -= 60;
      return s;
    }
    matches.sort(function (x, y) { return score(y) - score(x); });
    return matches[0];
  }

  /* ---------------- article text ---------------- */
  function findRoot() {
    return document.querySelector('[data-audio-reader-root]') ||
      document.querySelector('main.post') ||
      document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('.post');
  }
  function blockText(el) {
    var clone = el.cloneNode(true);
    var slugs = clone.querySelectorAll('.slug');
    for (var i = 0; i < slugs.length; i++) slugs[i].remove();
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function collectBlocks(root) {
    var els = root.querySelectorAll('h1,h2,h3,h4,h5,p,li,blockquote');
    var out = [], seen = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest(SKIP_SEL)) continue;
      var t = blockText(el);
      if (t.length < 2) continue;
      // A paragraph that is nothing but one short link is navigation
      // (e.g. "← All deep dives"), not article content — never read it.
      if (t.length < 60 && el.children.length === 1 && el.children[0].tagName === 'A') continue;
      if (seen[t]) continue;
      seen[t] = 1;
      out.push(t);
    }
    return out;
  }
  function chunkText(text) {
    var parts = text.match(/[^.!?…。！？;；]+[.!?…。！？;；]*["'»”’)]?\s*/g) || [text];
    var chunks = [], cur = '';
    function pushLong(s) {
      var words = s.split(/\s+/), c = '';
      words.forEach(function (w) {
        if ((c + ' ' + w).trim().length > MAXCHUNK) { if (c) chunks.push(c); c = w; }
        else c = c ? c + ' ' + w : w;
      });
      if (c) chunks.push(c);
    }
    parts.forEach(function (raw) {
      var s = raw.trim();
      if (!s) return;
      if (s.length > MAXCHUNK) { if (cur) { chunks.push(cur); cur = ''; } pushLong(s); return; }
      if ((cur + ' ' + s).trim().length > MAXCHUNK) { chunks.push(cur); cur = s; }
      else cur = cur ? cur + ' ' + s : s;
    });
    if (cur) chunks.push(cur);
    return chunks;
  }
  function buildChunks(root) {
    var blocks = collectBlocks(root), chunks = [];
    blocks.forEach(function (b) { chunks = chunks.concat(chunkText(b)); });
    return chunks;
  }

  /* ---------------- engine (one per page, both players drive it) -------- */
  var S = { state: 'idle', chunks: [], idx: 0, lang: detectLang(), root: null, watchdog: null };

  function labels() { return L[S.lang] || L.en; }

  function updateUI() {
    var lab = labels(), total = S.chunks.length;
    document.querySelectorAll('.audio-reader').forEach(function (p) {
      var playBtn = p.querySelector('.ar-play');
      var icon = playBtn.querySelector('svg');
      var status = p.querySelector('.ar-status');
      var bar = p.querySelector('.ar-bar');
      var title = p.querySelector('.ar-title');
      var sub = p.querySelector('.ar-sub');
      if (title) title.textContent = lab.listen;
      if (sub) sub.textContent = lab.sub;
      p.setAttribute('dir', S.lang === 'he' ? 'rtl' : 'ltr');
      if (S.state === 'playing') {
        icon.innerHTML = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
        playBtn.setAttribute('aria-label', lab.pause);
        status.textContent = lab.reading + ' · ' + Math.min(S.idx + 1, total) + ' / ' + total;
      } else if (S.state === 'paused') {
        icon.innerHTML = '<path d="M7 4l13 8-13 8z"/>';
        playBtn.setAttribute('aria-label', lab.play);
        status.textContent = lab.paused + ' · ' + Math.min(S.idx + 1, total) + ' / ' + total;
      } else if (S.state === 'done') {
        icon.innerHTML = '<path d="M7 4l13 8-13 8z"/>';
        playBtn.setAttribute('aria-label', lab.play);
        status.textContent = lab.done;
      } else {
        icon.innerHTML = '<path d="M7 4l13 8-13 8z"/>';
        playBtn.setAttribute('aria-label', lab.play);
        status.textContent = total ? lab.tap : lab.tap;
      }
      bar.style.width = total ? Math.round((S.idx / total) * 100) + '%' : '0%';
      var stopBtn = p.querySelector('.ar-stop');
      if (stopBtn) stopBtn.setAttribute('aria-label', lab.stop);
    });
  }

  function startWatchdog() {
    stopWatchdog();
    S.watchdog = window.setInterval(function () {
      if (S.state === 'playing' && synth.speaking && !synth.paused) {
        try { synth.resume(); } catch (e) {}
      }
    }, 10000);
  }
  function stopWatchdog() { if (S.watchdog) { window.clearInterval(S.watchdog); S.watchdog = null; } }

  function speakCurrent() {
    if (S.idx >= S.chunks.length) { finish(); return; }
    var u = new SpeechSynthesisUtterance(S.chunks[S.idx]);
    var v = pickVoice(S.lang);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = BCP[S.lang] || 'en-US'; }
    u.rate = 1.0; u.pitch = 1.0;
    u.onend = function () {
      if (S.state !== 'playing') return;
      S.idx++; updateUI(); speakCurrent();
    };
    u.onerror = function (e) {
      if (S.state !== 'playing') return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      S.idx++; updateUI(); speakCurrent();
    };
    synth.speak(u);
    updateUI();
  }
  function start() {
    S.lang = detectLang();
    S.chunks = buildChunks(S.root);
    S.idx = 0;
    if (!S.chunks.length) { updateUI(); return; }
    try { synth.cancel(); } catch (e) {}
    S.state = 'playing';
    startWatchdog();
    updateUI();
    // Chrome can drop a speak() issued in the same tick as cancel().
    window.setTimeout(function () { if (S.state === 'playing' && S.idx === 0) speakCurrent(); }, 60);
  }
  function pause() {
    if (S.state !== 'playing') return;
    try { synth.pause(); } catch (e) {}
    S.state = 'paused'; stopWatchdog(); updateUI();
  }
  function resume() {
    if (S.state !== 'paused') return;
    S.state = 'playing'; startWatchdog();
    try { synth.resume(); } catch (e) {}
    updateUI();
  }
  function stopAll() {
    try { synth.cancel(); } catch (e) {}
    S.state = 'idle'; S.idx = 0; stopWatchdog(); updateUI();
  }
  function finish() {
    S.state = 'done'; S.idx = 0; stopWatchdog(); updateUI();
  }
  function onPlayPressed() {
    if (S.state === 'playing') pause();
    else if (S.state === 'paused') resume();
    else start();
  }

  /* ---------------- players ---------------- */
  var SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 8.6a4.5 4.5 0 010 6.8M19 6a8 8 0 010 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  function makePlayer(prominent, isTop) {
    var lab = labels();
    var d = document.createElement('div');
    d.className = 'audio-reader' + (prominent ? ' ar-prominent' : '') + (isTop ? ' ar-top' : ' ar-bottom');
    d.setAttribute('data-i18n-skip', '');
    d.setAttribute('role', 'region');
    d.setAttribute('aria-label', lab.listen);
    d.setAttribute('dir', S.lang === 'he' ? 'rtl' : 'ltr');
    d.innerHTML =
      '<div class="ar-head">' + SPEAKER + '<span class="ar-title">' + lab.listen + '</span></div>' +
      (prominent ? '<p class="ar-sub">' + lab.sub + '</p>' : '') +
      '<div class="ar-controls">' +
      '<button type="button" class="ar-btn ar-play" aria-label="' + lab.play + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg></button>' +
      '<button type="button" class="ar-btn ar-stop" aria-label="' + lab.stop + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg></button>' +
      '<div class="ar-progress"><div class="ar-bar"></div></div>' +
      '<span class="ar-status">' + lab.tap + '</span>' +
      '</div>';
    d.querySelector('.ar-play').addEventListener('click', onPlayPressed);
    d.querySelector('.ar-stop').addEventListener('click', stopAll);
    return d;
  }

  function init() {
    var root = findRoot();
    if (!root) return;
    var blocks = collectBlocks(root);
    var totalChars = blocks.join(' ').length;
    if (totalChars < 120) return; // not an article page
    S.root = root;
    var hasVideo = !!root.querySelector('iframe[src*="youtube"],iframe[src*="youtu.be"],.bst-short-embed,.video-box,[data-video-id]');
    var top = makePlayer(!hasVideo, true);
    var h1 = root.querySelector('h1');
    var anchor = h1;
    if (h1) {
      var n = h1.nextElementSibling;
      if (n && /byline|post-meta|hint|meta|lede/i.test(n.className || '')) anchor = n;
    }
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(top, anchor.nextSibling);
    else root.insertBefore(top, root.firstChild);
    var bottom = makePlayer(false, false);
    var credits = root.querySelector('.photo-credits');
    if (credits && credits.parentNode) credits.parentNode.insertBefore(bottom, credits);
    else root.appendChild(bottom);
    updateUI();
    try { synth.getVoices(); } catch (e) {}
    if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = function () { updateUI(); };
    // Some site walkers restore the stored language after this script
    // runs; re-detect once the page has fully loaded and relabel.
    window.addEventListener('load', function () {
      if (S.state === 'idle') { S.lang = detectLang(); updateUI(); }
    });
  }

  /* Language toggle: restart in the new language if a reading is live. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('.lang-btn,[data-lang]') : null;
    if (!btn) return;
    window.setTimeout(function () {
      var nl = detectLang();
      if (nl !== S.lang) {
        var wasPlaying = S.state === 'playing' || S.state === 'paused';
        try { synth.cancel(); } catch (err) {}
        S.state = 'idle'; S.idx = 0; stopWatchdog();
        S.lang = nl;
        updateUI();
        if (wasPlaying) start();
      }
    }, 150);
  }, true);

  window.addEventListener('pagehide', function () { try { synth.cancel(); } catch (e) {} });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
