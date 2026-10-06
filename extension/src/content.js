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

  function countMatches(rootEl) {
    let n = 0;
    for (const node of textNodes(rootEl)) {
      const m = node.nodeValue.match(matcher.regex);
      if (m) n += m.length;
    }
    matcher.regex.lastIndex = 0;
    return n;
  }

  const tick = (ms) => new Promise((r) => setTimeout(r, ms));

  // Metni editörün KENDİ yapıştırma yolundan verir. X'in editörü (Draft.js) yapıştırmayı kendisi
  // işleyip iç durumunu ve ekranı birlikte günceller. execCommand ile tarayıcıya metni doğrudan
  // değiştirtmek ise ekran ile iç durumu birbirinden koparır (silme tuşu ekrana yansımaz).
  // Düzenleyici olayı karşıladıysa (preventDefault) dispatchEvent false döner.
  function pasteInto(rootEl, text) {
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
      return rootEl.dispatchEvent(ev) === false;
    } catch (_) {
      return false;
    }
  }

  const busy = new WeakSet();

  async function replaceInContentEditable(rootEl) {
    if (busy.has(rootEl)) return 0;
    let hadFocus = rootEl.contains(deepActiveElement()) || rootEl === deepActiveElement();
    if (!hadFocus) {
      rootEl.focus();
      hadFocus = rootEl.contains(deepActiveElement()) || rootEl === deepActiveElement();
      if (!hadFocus) return 0;
    }
    busy.add(rootEl);
    try {
      const startedAt = lastActivity;
      const caret = getCaretOffset(rootEl);
      let total = 0;
      let caretShift = 0;
      let remaining = countMatches(rootEl);

      while (remaining > 0) {
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
        const select = () => {
          const range = document.createRange();
          range.setStart(found.node, found.index);
          range.setEnd(found.node, found.index + found.match.length);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          return sel;
        };

        let sel = select();
        await tick(60); // editör seçimi (selectionchange) işlesin
        // Bu arada kullanıcı yazdıysa ya da seçim değiştiyse hiçbir şey yapma.
        if (!active() || lastActivity !== startedAt || sel.toString() !== found.match) break;

        const handled = pasteInto(rootEl, alias);
        await tick(80);
        let now = countMatches(rootEl);
        if (!handled && now >= remaining) {
          // Editör yapıştırmayı karşılamadı (DOM değişmedi); son çare olarak tarayıcının kendi yolu.
          if (lastActivity !== startedAt) break;
          sel = select();
          document.execCommand("insertText", false, alias);
          await tick(60);
          now = countMatches(rootEl);
        }
        if (now >= remaining) break; // editör değişikliği kabul etmedi; döngüye girme
        remaining = now;

        if (caret != null && offsetBefore + found.index + found.match.length <= caret) {
          caretShift += alias.length - found.match.length;
        }
        total++;
      }

      if (total && caret != null && lastActivity === startedAt) {
        try { setCaretOffset(rootEl, caret + caretShift); await tick(50); } catch (_) {}
      }
      return total;
    } finally {
      busy.delete(rootEl);
    }
  }

  async function sanitize(el) {
    if (!active() || !el) return 0;
    try {
      if (isTextInput(el)) return replaceInTextInput(el);
      if (el.isContentEditable) return await replaceInContentEditable(el);
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
  // Yalnızca yazma/yapıştırma sonrası çalışır. Silme ve geri alma (⌘Z) sırasında asla değiştirmez;
  // kullanıcı bir değişikliği geri aldıysa o alanda canlı değiştirme, alan odağı kaybedene kadar
  // durur (gönderim koruması yine çalışır). Bir alanda kısa sürede çok fazla değişiklik olursa
  // (editörle çekişme) canlı değiştirme o alan için duraklatılır.

  const paused = new WeakMap();   // el → duraklatmanın biteceği zaman (Infinity: odak kaybına kadar)
  const history = new WeakMap();  // el → son değiştirme zamanları

  function isPaused(el) {
    const until = paused.get(el);
    return until != null && Date.now() < until;
  }

  function noteReplacement(el) {
    const now = Date.now();
    const times = (history.get(el) || []).filter((t) => now - t < 5000);
    times.push(now);
    history.set(el, times);
    if (times.length > 4) {
      paused.set(el, now + 15000);
      toast("Bu alanda otomatik değiştirme 15 sn duraklatıldı; gönderirken yine kontrol edilecek.");
    }
  }

  // Editör "sakin" değilse (IME / macOS satır içi tahmin gibi bir kompozisyon sürüyorsa, seçili metin
  // varsa ya da kullanıcı az önce tuşa bastıysa) editöre dokunulmaz; zamanlayıcı yeniden kurulur.
  // Satır içi tahmin ve IME, metni "işaretli metin" olarak tutar; o sırada metni değiştirmek
  // harflerin üst üste binmesine ve silmenin bozulmasına yol açar.
  const QUIET_MS = 700;
  let composing = false;
  let lastActivity = 0;
  let debounceTimer = null;

  function editorIsCalm(el) {
    if (composing) return false;
    if (Date.now() - lastActivity < QUIET_MS) return false;
    if (isTextInput(el)) return el.selectionStart === el.selectionEnd;
    const sel = window.getSelection();
    return !sel || sel.rangeCount === 0 || sel.isCollapsed;
  }

  function scheduleReplace(el, attempt = 0) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!active() || !settings.liveReplace || isPaused(el) || !hasRealName(el)) return;
      // Kullanıcı bu arada başka alana geçtiyse odağı geri çalma; gönderimde kontrol edilir.
      const a = deepActiveElement();
      if (!(el === a || el.contains(a))) return;
      if (!editorIsCalm(el)) {
        if (attempt < 20) scheduleReplace(el, attempt + 1); // en fazla ~15 sn bekle
        return;
      }
      const n = await sanitize(el);
      if (n) {
        noteReplacement(el);
        toast(n === 1 ? "İsim takma adla değiştirildi" : n + " isim takma adla değiştirildi");
      }
    }, QUIET_MS);
  }

  document.addEventListener("compositionstart", () => { if (active()) { composing = true; lastActivity = Date.now(); } }, true);
  document.addEventListener("compositionend", () => { composing = false; lastActivity = Date.now(); }, true);

  document.addEventListener("keydown", (e) => {
    if (!active()) return;
    lastActivity = Date.now();
    // ⌘Z / Ctrl+Z: geri alınan değişikliği tekrar yapmamak için alanı duraklat
    // (bazı editörler geri almada input olayı göndermez).
    if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
      const el = editableRoot(deepActiveElement());
      if (el) { clearTimeout(debounceTimer); paused.set(el, Infinity); }
    }
  }, true);

  document.addEventListener("input", (e) => {
    if (!active() || !settings.liveReplace) return;
    lastActivity = Date.now();
    if (e.isComposing) { composing = true; return; }
    const el = editableRoot(e.composedPath ? e.composedPath()[0] : e.target);
    if (!el) return;
    const type = e.inputType || "";
    if (type.startsWith("history")) {
      clearTimeout(debounceTimer);
      paused.set(el, Infinity);
      return;
    }
    // Silme, kompozisyon ve (tahmin/otomatik düzeltme dahil) değiştirme girdilerinde asla araya girme.
    if (type.startsWith("delete") || type.includes("Composition") || type === "insertReplacementText") {
      clearTimeout(debounceTimer);
      return;
    }
    if (isPaused(el)) return;
    scheduleReplace(el);
  }, true);

  document.addEventListener("focusout", (e) => {
    if (!active()) return;
    const el = editableRoot(e.target);
    if (el && paused.get(el) === Infinity) paused.delete(el);
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
    dirty.forEach((el) => paused.delete(el));
    Promise.all(dirty.map((el) => sanitize(el))).then((counts) => {
      const n = counts.reduce((x, y) => x + y, 0);
      if (dirty.some(hasRealName)) {
        toast("Gönderim durduruldu: isim otomatik değiştirilemedi, lütfen elle düzeltin.");
      } else {
        toast(`Gönderim durduruldu: ${n} isim değiştirildi. Kontrol edip tekrar gönderin.`);
      }
    });
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
