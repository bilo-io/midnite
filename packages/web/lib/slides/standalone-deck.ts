import type { Slide } from './markdown';

// A fully self-contained HTML slide deck (all CSS + JS inlined, no external
// requests) — the offline/downloadable twin of the in-app <Deck> presenter.
// Placeholders __DECK_TITLE__ and __SLIDES_JSON__ are filled per deck.
//
// The palette here is a neutral, self-contained one (the app's HSL design
// tokens don't exist in an exported file), so the download looks tidy on its
// own without carrying midnite's runtime theme.

const TEMPLATE = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__DECK_TITLE__</title>
<style>
:root{
  --font-serif:ui-serif,Georgia,"Times New Roman",serif;
  --font-sans:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --font-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --ease:cubic-bezier(0.22,0.61,0.36,1);
}
html[data-theme="dark"]{
  --bg:#0f1115;--bg-2:#171a21;--text:#e7e9ee;--muted:#a0a6b2;--accent:#7c9cff;--accent-2:#9db3ff;
  --accent-soft:rgba(124,156,255,0.16);--glow:rgba(124,156,255,0.5);--border:rgba(231,233,238,0.13);
  --chip-bg:rgba(124,156,255,0.15);--chip-border:rgba(124,156,255,0.3);--kw-bg:rgba(231,233,238,0.07);
  --kw-border:rgba(231,233,238,0.15);--dot:rgba(231,233,238,0.26);--dot-seen:rgba(231,233,238,0.45);
}
html[data-theme="light"]{
  --bg:#f7f8fa;--bg-2:#eceef2;--text:#1a1d24;--muted:#5a606c;--accent:#3b5bdb;--accent-2:#2f4bc0;
  --accent-soft:rgba(59,91,219,0.1);--glow:rgba(59,91,219,0.4);--border:rgba(26,29,36,0.13);
  --chip-bg:rgba(59,91,219,0.1);--chip-border:rgba(59,91,219,0.28);--kw-bg:rgba(26,29,36,0.05);
  --kw-border:rgba(26,29,36,0.13);--dot:rgba(26,29,36,0.22);--dot-seen:rgba(26,29,36,0.42);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:var(--font-sans);color:var(--text);background:var(--bg);
  background-image:radial-gradient(1200px 800px at 78% 18%,var(--accent-soft),transparent 60%),radial-gradient(900px 700px at 12% 88%,var(--bg-2),transparent 65%);
  overflow:hidden;-webkit-font-smoothing:antialiased;transition:background-color 0.5s var(--ease),color 0.5s var(--ease)}
:focus{outline:none}
#stage{position:relative;height:100vh;overflow:hidden;cursor:default}
.slide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.slide-inner{width:100%;max-width:1400px;padding:0 clamp(2.5rem,8vw,7rem) 0 clamp(4.5rem,10vw,8.5rem)}
.title{font-family:var(--font-serif);font-weight:600;line-height:1.04;letter-spacing:-0.015em;font-size:clamp(2.6rem,6.4vw,4.8rem);color:var(--text);margin-bottom:2.1rem;min-height:1.04em}
.caret{display:inline-block;width:0.06em;min-width:2px;height:0.92em;margin-left:0.06em;background:var(--accent);vertical-align:-0.06em;animation:blink 1s step-end infinite}
@keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
.steps{list-style:none;display:flex;flex-direction:column;gap:1.2rem}
.step{font-size:clamp(1.15rem,2.1vw,1.7rem);line-height:1.5;color:var(--muted);padding-left:1.5rem;position:relative}
.step::before{content:"";position:absolute;left:0;top:0.72em;width:7px;height:7px;border-radius:50%;background:var(--accent);transform:translateY(-50%)}
.slide.cover .slide-inner{text-align:center;padding:0 8vw}
.slide.cover .title{font-size:clamp(3.2rem,8.8vw,6.6rem);margin-bottom:1.6rem}
.slide.cover .steps{align-items:center}
.slide.cover .step{padding-left:0}
.slide.cover .step::before{display:none}
.lede{font-family:var(--font-serif);font-style:italic;font-size:clamp(1.25rem,2.6vw,1.9rem);line-height:1.45;color:var(--muted);max-width:34ch;display:inline-block}
code.cmd,a.cmd,code.kw{font-family:var(--font-mono);font-size:0.86em;padding:0.12em 0.5em;border-radius:7px;white-space:nowrap}
code.cmd,a.cmd{color:var(--accent-2);background:var(--chip-bg);border:1px solid var(--chip-border)}
code.kw{color:var(--text);background:var(--kw-bg);border:1px solid var(--kw-border)}
a.cmd{text-decoration:underline;text-decoration-color:var(--chip-border);text-underline-offset:2px;text-decoration-thickness:1.5px;cursor:pointer;transition:background-color 0.2s var(--ease),border-color 0.2s var(--ease)}
a.cmd:hover{background:var(--accent-soft);border-color:var(--accent);text-decoration-color:var(--accent)}
a.link{color:var(--accent-2);text-decoration:underline;text-decoration-color:var(--chip-border);text-underline-offset:3px;text-decoration-thickness:1.5px;cursor:pointer;transition:color 0.2s var(--ease),text-decoration-color 0.2s var(--ease)}
a.link::after{content:"\\2197";font-size:0.78em;margin-left:0.1em;opacity:0.7}
a.link:hover{color:var(--accent);text-decoration-color:var(--accent)}
.md-code-wrap{font-family:var(--font-mono);font-size:0.5em;margin:0.4em 0;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--kw-bg)}
.md-code-head{display:flex;align-items:center;gap:0.5em;padding:0.4em 0.8em;border-bottom:1px solid var(--border)}
.md-code-lang{font-size:0.85em;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)}
.md-copy{margin-left:auto;font-family:inherit;font-size:0.85em;color:var(--muted);background:transparent;border:1px solid var(--border);border-radius:6px;padding:0.15em 0.6em;cursor:pointer;transition:color 0.2s var(--ease),border-color 0.2s var(--ease),background-color 0.2s var(--ease)}
.md-copy:hover{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}
.md-copy.copied{color:var(--accent);border-color:var(--accent)}
.md-code{line-height:1.55;color:var(--text);padding:0.85em 1em;overflow-x:auto;white-space:pre}
.md-code code{font-family:inherit;background:none;border:none;padding:0;white-space:pre}
/* highlight.js palette — an inlined copy of the shared @midnite/ui/code-highlight.css
   (the exported file has no app tokens); keep the hue set in sync. */
.md-code .hljs{background:transparent;color:var(--text)}
.hljs-comment,.hljs-quote{color:var(--muted);font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-subst,.hljs-doctag{color:hsl(280 60% 66%)}
.hljs-name,.hljs-selector-id,.hljs-selector-class,.hljs-symbol,.hljs-bullet,.hljs-deletion{color:hsl(350 75% 66%)}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-meta .hljs-string{color:hsl(140 50% 55%)}
.hljs-title,.hljs-title.function_,.hljs-title.class_,.hljs-built_in,.hljs-section{color:hsl(210 75% 65%)}
.hljs-number,.hljs-literal,.hljs-type{color:hsl(30 85% 62%)}
.hljs-attr,.hljs-attribute,.hljs-variable,.hljs-template-variable,.hljs-property{color:hsl(190 65% 58%)}
.hljs-meta,.hljs-operator,.hljs-punctuation{color:var(--muted)}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:600}
.md-table-wrap{overflow-x:auto;margin:0.4em 0}
.md-table{border-collapse:collapse;font-size:0.6em;width:max-content;max-width:100%}
.md-table th,.md-table td{border:1px solid var(--border);padding:0.4em 0.75em;text-align:left;vertical-align:top}
.md-table th{color:var(--text);font-weight:600}
.md-table td{color:var(--muted)}
.step:has(.md-code),.step:has(.md-table-wrap){padding-left:0}
.step:has(.md-code)::before,.step:has(.md-table-wrap)::before{display:none}
.title{opacity:0;transform:translateY(-22px);transition:opacity 0.6s var(--ease),transform 0.6s var(--ease)}
.step{opacity:0;transform:translateY(16px);transition:opacity 0.55s var(--ease),transform 0.55s var(--ease)}
.title.in,.step.in{opacity:1;transform:translateY(0)}
.slide.leaving{opacity:0;transform:translateY(-14px)}
.slide{transition:opacity 0.28s var(--ease),transform 0.28s var(--ease)}
.rail{position:fixed;left:clamp(1.5rem,2.6vw,2.4rem);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:0.95rem;z-index:20}
.dot{display:flex;align-items:center;gap:0.6rem}
.dot-core{position:relative;width:9px;height:9px;padding:0;border:none;border-radius:50%;background:var(--dot);flex:0 0 auto;cursor:pointer;transition:background-color 0.35s var(--ease),transform 0.35s var(--ease),box-shadow 0.35s var(--ease)}
.dot-core::after{content:"";position:absolute;inset:-8px;border-radius:50%}
.dot.seen .dot-core{background:var(--dot-seen)}
.dot.active .dot-core{background:var(--accent);transform:scale(1.35);box-shadow:0 0 14px 2px var(--glow)}
.dot-core:hover{background:var(--accent-2)}
.dot-core:focus-visible{box-shadow:0 0 12px 2px var(--glow)}
.subdots{display:flex;align-items:center;gap:0.42rem;max-width:0;opacity:0;overflow:hidden;transition:max-width 0.4s var(--ease),opacity 0.35s var(--ease)}
.dot.active .subdots{max-width:260px;opacity:1;overflow:visible}
.subdot{position:relative;width:6px;height:6px;padding:0;border-radius:50%;background:transparent;border:1.5px solid var(--dot-seen);flex:0 0 auto;cursor:pointer;transition:background-color 0.3s var(--ease),border-color 0.3s var(--ease),transform 0.3s var(--ease),box-shadow 0.3s var(--ease)}
.subdot::after{content:"";position:absolute;inset:-7px;border-radius:50%}
.subdot:hover{border-color:var(--accent-2)}
.subdot.filled{background:var(--accent);border-color:var(--accent);transform:scale(1.15)}
.subdot:focus-visible{box-shadow:0 0 9px 1px var(--glow)}
.theme-toggle{position:fixed;top:clamp(1.2rem,2.4vw,2rem);right:clamp(1.2rem,2.4vw,2rem);width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--kw-bg);border:1px solid var(--border);color:var(--text);cursor:pointer;z-index:20;transition:background-color 0.3s var(--ease),transform 0.2s var(--ease),box-shadow 0.3s var(--ease)}
.theme-toggle:hover{transform:translateY(-1px);background:var(--accent-soft)}
.theme-toggle:focus-visible{box-shadow:0 0 14px 2px var(--glow)}
.theme-toggle svg{width:20px;height:20px}
html[data-theme="dark"] .icon-moon{display:none}
html[data-theme="light"] .icon-sun{display:none}
.hint{position:fixed;bottom:clamp(1.2rem,2.5vw,2rem);left:50%;transform:translateX(-50%);font-size:0.8rem;color:var(--muted);letter-spacing:0.02em;opacity:0.75;z-index:20;transition:opacity 0.6s var(--ease);pointer-events:none;text-align:center}
.hint.gone{opacity:0}
.hint kbd{font-family:var(--font-mono);font-size:0.78em;padding:0.15em 0.45em;border-radius:5px;background:var(--kw-bg);border:1px solid var(--kw-border)}
.deck-progress{position:fixed;bottom:clamp(1.2rem,2.5vw,2rem);right:clamp(1.5rem,2.6vw,2.4rem);font-family:var(--font-mono);font-size:0.78rem;letter-spacing:0.04em;color:var(--muted);z-index:20}
.help-overlay{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)}
.help-overlay[hidden]{display:none}
.help-card{background:var(--bg-2);border:1px solid var(--border);border-radius:16px;padding:1.6rem 1.8rem;max-width:420px;width:calc(100% - 3rem);box-shadow:0 20px 60px -20px rgba(0,0,0,0.6)}
.help-card h2{font-family:var(--font-serif);font-weight:600;font-size:1.5rem;margin-bottom:1rem}
.help-card dl{display:grid;grid-template-columns:auto 1fr;gap:0.55rem 1.2rem;margin-bottom:1.3rem}
.help-card dt{font-family:var(--font-mono);font-size:0.82rem;color:var(--accent);white-space:nowrap}
.help-card dd{font-size:0.9rem;color:var(--muted)}
.help-card .btn-close{font:inherit;font-size:0.9rem;padding:0.55rem 1rem;border-radius:11px;border:1px solid var(--border);background:var(--kw-bg);color:var(--text);cursor:pointer}
.help-card .btn-close:hover{background:var(--accent-soft);border-color:var(--accent)}
@media (prefers-reduced-motion:reduce){.title,.step{transform:none!important;transition-duration:0.2s}.slide.leaving{transform:none}.caret{animation:none}}
</style>
</head>
<body>
<nav class="rail" id="rail" aria-label="Slide navigation"></nav>
<button class="theme-toggle" id="themeToggle" aria-label="Toggle light and dark theme" title="Toggle theme">
<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>
<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
</button>
<main id="stage"></main>
<div class="hint" id="hint">Press <kbd>&rarr;</kbd> / <kbd>Space</kbd> to advance &nbsp;&middot;&nbsp; <kbd>&larr;</kbd> to go back &nbsp;&middot;&nbsp; <kbd>F</kbd> fullscreen &nbsp;&middot;&nbsp; <kbd>?</kbd> shortcuts</div>
<div class="deck-progress" id="progress" aria-hidden="true"></div>
<div class="help-overlay" id="help" hidden>
<div class="help-card">
<h2>Keyboard shortcuts</h2>
<dl><dt>&rarr; / Space / Enter</dt><dd>Next step or slide</dd><dt>&larr; / Backspace</dt><dd>Previous step or slide</dd><dt>Home / End</dt><dd>First / last slide</dd><dt>F</dt><dd>Toggle fullscreen</dd><dt>?</dt><dd>Toggle this help</dd></dl>
<button class="btn-close" id="helpClose" type="button">Close</button>
</div>
</div>
<script>
var slides = __SLIDES_JSON__;
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var current = 0, reveal = 0, busy = false, typing = false, typeTimer = null, current_el = null;
var stage = document.getElementById("stage");
var rail = document.getElementById("rail");
var hint = document.getElementById("hint");
var progress = document.getElementById("progress");
var help = document.getElementById("help");

slides.forEach(function (slide, i) {
  var dot = document.createElement("div");
  dot.className = "dot";
  var core = document.createElement("button");
  core.type = "button";
  core.className = "dot-core";
  core.setAttribute("aria-label", "Slide " + (i + 1) + ": " + slide.title);
  core.addEventListener("click", function (e) { e.stopPropagation(); jumpToStep(i, 0); });
  dot.appendChild(core);
  var sub = document.createElement("span");
  sub.className = "subdots";
  (slide.steps || []).forEach(function (_, j) {
    var s = document.createElement("button");
    s.type = "button";
    s.className = "subdot";
    s.tabIndex = -1;
    s.setAttribute("aria-label", "Slide " + (i + 1) + ", step " + (j + 1));
    s.addEventListener("click", function (e) { e.stopPropagation(); jumpToStep(i, j + 1); });
    sub.appendChild(s);
  });
  dot.appendChild(sub);
  rail.appendChild(dot);
});
var railDots = Array.prototype.slice.call(rail.children);

function buildSlide(slide) {
  var el = document.createElement("div");
  el.className = "slide" + (slide.cover ? " cover" : "");
  var inner = document.createElement("div");
  inner.className = "slide-inner";
  el.appendChild(inner);
  var title = document.createElement("h1");
  title.className = "title";
  title.dataset.text = slide.title || "";
  inner.appendChild(title);
  var ul = document.createElement("ul");
  ul.className = "steps";
  (slide.steps || []).forEach(function (html) {
    var li = document.createElement("li");
    li.className = "step";
    li.innerHTML = html;
    li.querySelectorAll("a").forEach(function (a) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.addEventListener("click", function (e) { e.stopPropagation(); });
    });
    ul.appendChild(li);
  });
  inner.appendChild(ul);
  return el;
}

function typeTitle(titleEl, text, instant) {
  clearInterval(typeTimer);
  typing = false;
  titleEl.textContent = "";
  if (instant || !text) { titleEl.textContent = text || ""; return; }
  typing = true;
  var caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  titleEl.appendChild(caret);
  var total = text.length;
  var perChar = Math.max(16, Math.min(42, Math.round(720 / total)));
  var i = 0;
  typeTimer = setInterval(function () {
    caret.insertAdjacentText("beforebegin", text[i]);
    i++;
    if (i >= total) {
      clearInterval(typeTimer);
      typing = false;
      setTimeout(function () { if (caret.isConnected) caret.remove(); }, 650);
    }
  }, perChar);
}

function completeTitle() {
  if (!typing) return;
  clearInterval(typeTimer);
  typing = false;
  var titleEl = current_el.querySelector(".title");
  var caret = titleEl.querySelector(".caret");
  if (caret) caret.remove();
  titleEl.textContent = titleEl.dataset.text || "";
}

function renderSlide(index, opts) {
  opts = opts || {};
  var revealAll = !!opts.revealAll;
  var revealUpTo = opts.revealUpTo == null ? null : opts.revealUpTo;
  current = index;
  updateProgress();
  var slide = slides[index];
  var el = buildSlide(slide);
  stage.appendChild(el);
  current_el = el;
  var titleEl = el.querySelector(".title");
  var steps = Array.prototype.slice.call(el.querySelectorAll(".step"));
  var target = revealAll ? steps.length : (revealUpTo != null ? Math.max(0, Math.min(revealUpTo, steps.length)) : 0);
  void el.offsetWidth;
  requestAnimationFrame(function () {
    titleEl.classList.add("in");
    typeTitle(titleEl, titleEl.dataset.text || "", reducedMotion || target > 0);
    steps.forEach(function (s, i) {
      if (i < target) { s.style.transitionDelay = (revealAll ? 0.1 + i * 0.05 : 0) + "s"; s.classList.add("in"); }
    });
    reveal = target;
    updateRail();
  });
}

function goToSlide(index, opts) {
  if (busy || index < 0 || index >= slides.length) return;
  var old = current_el;
  if (old) {
    busy = true;
    old.classList.add("leaving");
    setTimeout(function () { old.remove(); busy = false; }, 300);
  }
  renderSlide(index, opts);
}

function setReveal(n) {
  var steps = Array.prototype.slice.call(current_el.querySelectorAll(".step"));
  n = Math.max(0, Math.min(n, steps.length));
  steps.forEach(function (s, idx) {
    if (idx < n) { s.style.transitionDelay = "0s"; s.classList.add("in"); }
    else s.classList.remove("in");
  });
  reveal = n;
  updateRail();
}

function jumpToStep(i, stepCount) {
  if (busy) return;
  if (typing) completeTitle();
  if (i === current) setReveal(Math.max(0, Math.min(stepCount, slides[current].steps.length)));
  else goToSlide(i, { revealUpTo: stepCount });
}

function updateRail() {
  railDots.forEach(function (dot, i) {
    var active = i === current;
    dot.classList.toggle("active", active);
    dot.classList.toggle("seen", i < current);
    dot.querySelectorAll(".subdot").forEach(function (s, j) {
      s.classList.toggle("filled", active && j < reveal);
      s.tabIndex = active ? 0 : -1;
    });
  });
}

function next() {
  if (busy) return;
  if (typing) { completeTitle(); return; }
  var stepCount = slides[current].steps ? slides[current].steps.length : 0;
  if (reveal < stepCount) setReveal(reveal + 1);
  else if (current < slides.length - 1) goToSlide(current + 1);
}

function prev() {
  if (busy) return;
  if (typing) { completeTitle(); return; }
  if (reveal > 0) setReveal(reveal - 1);
  else if (current > 0) goToSlide(current - 1, { revealAll: true });
}

function dismissHint() { if (hint && !hint.classList.contains("gone")) hint.classList.add("gone"); }
function updateProgress() { if (progress) progress.textContent = (current + 1) + " / " + slides.length; }

function copyCode(btn) {
  var wrap = btn.closest(".md-code-wrap");
  var code = wrap ? wrap.querySelector("code") : null;
  if (!code || !navigator.clipboard) return;
  navigator.clipboard.writeText(code.textContent || "").then(function () {
    var prev = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(function () { btn.textContent = prev; btn.classList.remove("copied"); }, 1400);
  }).catch(function () {});
}

function toggleHelp(force) {
  var show = force == null ? help.hasAttribute("hidden") : force;
  if (show) help.removeAttribute("hidden"); else help.setAttribute("hidden", "");
}
document.getElementById("helpClose").addEventListener("click", function (e) { e.stopPropagation(); toggleHelp(false); });
help.addEventListener("click", function (e) { if (e.target === help) toggleHelp(false); });

document.addEventListener("keydown", function (e) {
  // While help is open, only ? / Esc respond.
  if (!help.hasAttribute("hidden") && e.key !== "?" && e.key !== "Escape") return;
  switch (e.key) {
    case "?": e.preventDefault(); toggleHelp(); break;
    case "Escape": if (!help.hasAttribute("hidden")) toggleHelp(false); break;
    case "ArrowRight": case "ArrowDown": case " ": case "Enter": case "PageDown":
      e.preventDefault(); dismissHint(); next(); break;
    case "ArrowLeft": case "ArrowUp": case "Backspace": case "PageUp":
      e.preventDefault(); dismissHint(); prev(); break;
    case "Home": e.preventDefault(); dismissHint(); goToSlide(0); break;
    case "End": e.preventDefault(); dismissHint(); goToSlide(slides.length - 1, { revealAll: true }); break;
    case "f": case "F": toggleFullscreen(); break;
  }
});

stage.addEventListener("click", function (e) {
  if (e.target.closest("a")) return;
  var cp = e.target.closest(".md-copy");
  if (cp) { copyCode(cp); return; }
  dismissHint();
  next();
});

var root = document.documentElement;
var THEME_KEY = "midnite-standalone-deck-theme";
var saved = null;
try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
document.getElementById("themeToggle").addEventListener("click", function (e) {
  e.stopPropagation();
  var nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", nextTheme);
  try { localStorage.setItem(THEME_KEY, nextTheme); } catch (err) {}
});

function toggleFullscreen() {
  if (!document.fullscreenElement) { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }
  else if (document.exitFullscreen) document.exitFullscreen();
}

renderSlide(0);
setTimeout(dismissHint, 6000);
</script>
</body>
</html>`;

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderStandaloneDeck(title: string, slides: Slide[]): string {
  const json = JSON.stringify(slides, null, 2).replace(/<\//g, '<\\/');
  return TEMPLATE.replaceAll('__DECK_TITLE__', escAttr(title)).replace('__SLIDES_JSON__', json);
}
