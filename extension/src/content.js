// NameShield — yazı alanlarını izler, gerçek isimleri takma adla değiştirir ve
// gönder/yanıtla anında son bir kontrol yapar.
(function () {
  "use strict";
  if (window.__nameShieldLoaded) return;
  window.__nameShieldLoaded = true;

  const api = globalThis.browser || globalThis.chrome;
  const NS = globalThis.NameShield;

  let settings = { ...NS.DEFAULT_SETTINGS };
  let matcher = null;

  const SUBMIT_WORDS = /^(post|reply|tweet|send|share|publish|comment|submit|respond|gönder|yanıtla|cevapla|paylaş|yayınla|yorum yap|yorumla|tümünü gönder|post all)$/i;

  function siteDisabled() {
    return (settings.disabledSites || []).includes(location.hostname);
  }

  function active() {
    return settings.enabled && matcher && !siteDisabled();
  }

  function rebuild() {
    matcher = NS.buildMatcher(NS.collectRules(settings), { replaceParts: settings.replaceParts });
  }

  api.storage.local.get(NS.DEFAULT_SETTINGS, (s) => {
    settings = { ...NS.DEFAULT_SETTINGS, ...s };
    rebuild();
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const k in changes) settings[k] = changes[k].newValue;
    rebuild();
  });

  // ---------- Düzenlenebilir alan tespiti ----------

  function isTextInput(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") {
      const t = (el.type || "text").toLowerCase();
      return ["text", "search", ""].includes(t);
    }
    return false;
  }

  function editableRoot(el) {
    if (!el || el.nodeType !== 1) el = el && el.parentElement;
    if (!el) return null;
    if (isTextInput(el)) return el;
    if (el.isContentEditable) {
      let r = el;
      while (r.parentElement && r.parentElement.isContentEditable) r = r.parentElement;
      return r;
    }
    return null;
  }

  function deepActiveElement() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }

  // ---------- textarea / input ----------

  function replaceInTextInput(el) {
    const value = el.value;
    const { text, count } = matcher.replace(value);
    if (!count) return 0;

    // İmleci, kendisinden önceki değişikliklerin uzunluk farkı kadar kaydır.
    const caret = el.selectionStart;
    let newCaret = caret;
    if (caret != null) {
      newCaret = matcher.replace(value.slice(0, caret)).text.length;
    }

    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, text); // React gibi framework'lerin değişikliği görmesi için yerel setter
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (caret != null && document.activeElement === el) {
      try { el.setSelectionRange(newCaret, newCaret); } catch (_) {}
    }
    return count;
  }

  // ---------- contenteditable (X, Facebook, LinkedIn, Instagram vb.) ----------

  function textNodes(rootEl) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    const out = [];
    let n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  // Seçimi/imleci kök içindeki düz metin ofseti olarak kaydeder.
  function getCaretOffset(rootEl) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const r = sel.getRangeAt(0);
    if (!rootEl.contains(r.endContainer)) return null;
    const pre = document.createRange();
    pre.selectNodeContents(rootEl);
    pre.setEnd(r.endContainer, r.endOffset);
    return pre.toString().length;
  }

  function setCaretOffset(rootEl, offset) {
    let remaining = offset;
    for (const node of textNodes(rootEl)) {
      const len = node.nodeValue.length;
      if (remaining <= len) {
        const sel = window.getSelection();
        const r = document.createRange();
        r.setStart(node, remaining);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        return;
      }
      remaining -= len;
    }
  }

  function replaceInContentEditable(rootEl) {
    const caret = getCaretOffset(rootEl);
    const hadFocus = rootEl.contains(deepActiveElement()) || rootEl === deepActiveElement();
    let total = 0;
    let caretShift = 0;

    // Her turda ilk eşleşmeyi bul ve değiştir; DOM editör tarafından yeniden kurulabileceği için
    // her seferinde düğümleri tazeden tara.
    for (let guard = 0; guard < 50; guard++) {
      let found = null;
      let offsetBefore = 0;
      for (const node of textNodes(rootEl)) {
        matcher.regex.lastIndex = 0;
        const m = matcher.regex.exec(node.nodeValue);
        if (m) { found = { node, index: m.index, match: m[0] }; break; }
        offsetBefore += node.nodeValue.length;
      }
      matcher.regex.lastIndex = 0;
      if (!found) break;

      const alias = matcher.aliasFor(found.match);
      const range = document.createRange();
      range.setStart(found.node, found.index);
      range.setEnd(found.node, found.index + found.match.length);

      let ok = false;
      if (hadFocus) {
        // execCommand, Draft.js / Lexical / ProseMirror editörlerinin dahili durumunu da günceller.
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        ok = document.execCommand("insertText", false, alias);
      }
      if (!ok) {
        found.node.nodeValue =
          found.node.nodeValue.slice(0, found.index) + alias + found.node.nodeValue.slice(found.index + found.match.length);
        rootEl.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText", data: alias }));
      }

      if (caret != null && offsetBefore + found.index + found.match.length <= caret) {
        caretShift += alias.length - found.match.length;
      }
      total++;
    }

    if (total && hadFocus && caret != null) {
      try { setCaretOffset(rootEl, caret + caretShift); } catch (_) {}
    }
    return total;
  }

  function sanitize(el) {
    if (!active() || !el) return 0;
    try {
      if (isTextInput(el)) return replaceInTextInput(el);
      if (el.isContentEditable) return replaceInContentEditable(el);
    } catch (e) {
      console.warn("[NameShield]", e);
    }
    return 0;
  }

  function hasRealName(el) {
    if (!active() || !el) return false;
    const text = isTextInput(el) ? el.value : el.innerText || el.textContent || "";
    return matcher.test(text);
  }

  // ---------- Bildirim ----------

  let toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!settings.showToast) return;
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      Object.assign(toastEl.style, {
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        zIndex: 2147483647, background: "#111827", color: "#fff", padding: "10px 16px",
        borderRadius: "10px", font: "500 13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)", pointerEvents: "none", transition: "opacity .2s", opacity: "0"
      });
      (document.body || document.documentElement).appendChild(toastEl);
    }
    toastEl.textContent = "🛡️ " + msg;
    toastEl.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.opacity = "0"; }, 2600);
  }

  // ---------- Canlı değiştirme ----------

  let debounceTimer = null;
  document.addEventListener("input", (e) => {
    if (!active() || !settings.liveReplace) return;
    if (e.isComposing) return;
    const el = editableRoot(e.composedPath ? e.composedPath()[0] : e.target);
    if (!el) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const n = sanitize(el);
      if (n) toast(n === 1 ? "İsim takma adla değiştirildi" : n + " isim takma adla değiştirildi");
    }, 450);
  }, true);

  // Odak kaybında da temizle (ör. başka bir alana geçerken).
  document.addEventListener("focusout", (e) => {
    const el = editableRoot(e.target);
    if (el && hasRealName(el)) sanitize(el);
  }, true);

  // ---------- Gönderim koruması ----------

  function allEditables() {
    const list = Array.from(document.querySelectorAll("textarea, input[type=text], input:not([type]), [contenteditable=''], [contenteditable=true], [contenteditable=plaintext-only]"));
    const roots = new Set();
    for (const el of list) {
      const r = editableRoot(el);
      if (r && r.offsetParent !== null) roots.add(r);
    }
    return [...roots];
  }

  function looksLikeSubmit(target) {
    const btn = target.closest && target.closest("button, [role=button], input[type=submit], a[role=link][data-testid]");
    if (!btn) return null;
    if (btn.type === "submit") return btn;
    const testid = (btn.getAttribute("data-testid") || "").toLowerCase();
    if (/tweetbutton|reply|post|submit|send|comment/.test(testid)) return btn;
    const label = (btn.getAttribute("aria-label") || btn.innerText || btn.value || "").trim();
    if (label && label.length < 30 && SUBMIT_WORDS.test(label)) return btn;
    return null;
  }

  let blockClicksUntil = 0;

  function guard(e, editables) {
    const dirty = editables.filter(hasRealName);
    if (!dirty.length) return false;
    // İsim hâlâ duruyorsa gönderimi durdur, temizle; kullanıcı tekrar gönderir.
    e.preventDefault();
    e.stopImmediatePropagation();
    let n = 0;
    dirty.forEach((el) => { n += sanitize(el); });
    toast(`Gönderim durduruldu: ${n} isim değiştirildi. Kontrol edip tekrar gönderin.`);
    return true;
  }

  // Tıklama: Post / Reply / Gönder / Yanıtla gibi düğmeler.
  // pointerdown'da durdurulan bir gönderimin ardından gelen click de engellenir,
  // böylece editör yeni metni işlemeden gönderim olmaz.
  const onPointer = (e) => {
    if (!active()) return;
    if (!looksLikeSubmit(e.target)) return;
    if (e.type === "click" && Date.now() < blockClicksUntil) {
      e.preventDefault();
      e.stopImmediatePropagation();
      blockClicksUntil = 0;
      return;
    }
    if (guard(e, allEditables()) && e.type === "pointerdown") blockClicksUntil = Date.now() + 1500;
  };
  document.addEventListener("pointerdown", onPointer, true);
  document.addEventListener("click", onPointer, true);

  // Klavye: Enter ve Cmd/Ctrl+Enter.
  document.addEventListener("keydown", (e) => {
    if (!active() || e.key !== "Enter" || e.isComposing) return;
    const el = editableRoot(deepActiveElement());
    if (!el) return;
    if (e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      // Shift+Enter genelde yeni satırdır; yine de canlı temizliği tetikle.
      return;
    }
    guard(e, [el]);
  }, true);

  // Form gönderimi.
  document.addEventListener("submit", (e) => {
    if (!active()) return;
    const form = e.target;
    const fields = Array.from(form.querySelectorAll("textarea, input, [contenteditable]")).map(editableRoot).filter(Boolean);
    guard(e, fields);
  }, true);
})();
