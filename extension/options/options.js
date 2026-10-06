(function () {
  "use strict";
  const api = globalThis.browser || globalThis.chrome;
  const NS = globalThis.NameShield;
  const $ = (id) => document.getElementById(id);

  let settings = { ...NS.DEFAULT_SETTINGS };
  let newVariant = 0;
  const variants = new Map(); // satır başına takma ad varyantı

  function save(patch) {
    Object.assign(settings, patch);
    api.storage.local.set(patch);
    renderTry();
  }

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    e.append(...children);
    return e;
  }

  function renderRules() {
    const tbody = $("rules");
    tbody.textContent = "";
    if (!settings.rules.length) {
      tbody.append(el("tr", {}, [el("td", { colSpan: 3, className: "empty muted", textContent: "Henüz isim eklenmedi." })]));
      return;
    }
    settings.rules.forEach((r, i) => {
      const real = el("input", { type: "text", value: r.real });
      const alias = el("input", { type: "text", value: r.alias });
      real.addEventListener("change", () => update(i, { real: real.value.trim() }));
      alias.addEventListener("change", () => update(i, { alias: alias.value.trim() }));

      const shuffle = el("button", { className: "icon", title: "Başka takma ad öner", textContent: "🔀" });
      shuffle.addEventListener("click", () => {
        const v = (variants.get(r.real) || 0) + 1;
        variants.set(r.real, v);
        update(i, { alias: NS.generateAlias(r.real, v) });
        renderRules();
      });
      const del = el("button", { className: "icon danger", title: "Sil", textContent: "✕" });
      del.addEventListener("click", () => {
        save({ rules: settings.rules.filter((_, j) => j !== i) });
        renderRules();
      });

      tbody.append(el("tr", {}, [
        el("td", {}, [real]),
        el("td", {}, [alias]),
        el("td", { className: "actions" }, [shuffle, " ", del])
      ]));
    });
  }

  function update(i, patch) {
    const rules = settings.rules.slice();
    rules[i] = { ...rules[i], ...patch };
    save({ rules });
  }

  function renderSites() {
    const box = $("sites");
    box.textContent = "";
    if (!settings.disabledSites.length) {
      box.append(el("div", { className: "muted", textContent: "Tüm sitelerde çalışıyor. Bir siteyi kapatmak için eklenti simgesine tıklayın." }));
      return;
    }
    settings.disabledSites.forEach((h) => {
      const btn = el("button", { textContent: "Tekrar aç" });
      btn.addEventListener("click", () => {
        save({ disabledSites: settings.disabledSites.filter((x) => x !== h) });
        renderSites();
      });
      box.append(el("div", { className: "row", style: "justify-content:space-between;padding:4px 0" }, [el("span", { textContent: h }), btn]));
    });
  }

  function renderPresets() {
    const box = $("presets");
    box.textContent = "";
    for (const key in NS.PRESETS) {
      const p = NS.PRESETS[key];
      const input = el("input", { type: "checkbox", checked: !!(settings.presets || {})[key] });
      input.addEventListener("change", () => save({ presets: { ...settings.presets, [key]: input.checked } }));
      box.append(el("label", { className: "switch" }, [
        el("span", {}, [p.label, el("small", { textContent: p.description })]),
        input
      ]));

      const rows = NS.presetRules(key).map((r) => el("tr", {}, [
        el("td", { textContent: r.real }),
        el("td", {}, [el("b", { textContent: r.alias })]),
        el("td", { className: "role", textContent: r.role || "" })
      ]));
      box.append(el("details", {}, [
        el("summary", { textContent: `${p.people.length} ismi göster` }),
        el("table", { className: "people" }, [el("tbody", {}, rows)])
      ]));
    }
  }

  function renderToggles() {
    document.querySelectorAll("[data-key]").forEach((input) => {
      input.checked = !!settings[input.dataset.key];
      input.onchange = () => save({ [input.dataset.key]: input.checked });
    });
  }

  function renderTry() {
    const m = NS.buildMatcher(NS.collectRules(settings), { replaceParts: settings.replaceParts });
    const text = $("tryIn").value;
    $("tryOut").textContent = m ? m.replace(text).text : text;
  }

  function refreshNewAlias() {
    const real = $("newReal").value.trim();
    $("newAlias").placeholder = real ? NS.generateAlias(real, newVariant) : "Takma ad (otomatik)";
  }

  $("newReal").addEventListener("input", () => { newVariant = 0; refreshNewAlias(); });
  $("newShuffle").addEventListener("click", () => { newVariant++; $("newAlias").value = ""; refreshNewAlias(); });

  function addRule() {
    const real = $("newReal").value.trim().replace(/\s+/g, " ");
    if (!real) return;
    const alias = $("newAlias").value.trim() || NS.generateAlias(real, newVariant);
    const rules = settings.rules.filter((r) => NS.fold(r.real) !== NS.fold(real));
    rules.push({ real, alias, enabled: true });
    save({ rules });
    $("newReal").value = "";
    $("newAlias").value = "";
    newVariant = 0;
    refreshNewAlias();
    renderRules();
  }
  $("newAdd").addEventListener("click", addRule);
  [$("newReal"), $("newAlias")].forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") addRule(); }));
  $("tryIn").addEventListener("input", renderTry);

  api.storage.local.get(NS.DEFAULT_SETTINGS, (s) => {
    settings = { ...NS.DEFAULT_SETTINGS, ...s };
    renderRules();
    renderToggles();
    renderPresets();
    renderSites();
    renderTry();
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const k in changes) settings[k] = changes[k].newValue;
    renderSites();
  });
})();
