(function () {
  "use strict";
  const api = globalThis.browser || globalThis.chrome;
  const NS = globalThis.NameShield;
  const $ = (id) => document.getElementById(id);

  let settings = { ...NS.DEFAULT_SETTINGS };
  let host = "";
  let variant = 0;

  function save(patch) {
    Object.assign(settings, patch);
    api.storage.local.set(patch);
  }

  function renderPreview() {
    const real = $("real").value.trim();
    const p = $("preview");
    p.textContent = "";
    if (!real) return;
    const a = document.createElement("span"); a.textContent = real;
    const arrow = document.createElement("span"); arrow.className = "arrow"; arrow.textContent = "→";
    const b = document.createElement("b"); b.textContent = NS.generateAlias(real, variant);
    p.append(a, arrow, b);
  }

  function renderList() {
    const ul = $("list");
    ul.textContent = "";
    for (const r of settings.rules) {
      const li = document.createElement("li");
      const left = document.createElement("span"); left.textContent = r.real;
      const right = document.createElement("b"); right.textContent = r.alias;
      li.append(left, right);
      ul.append(li);
    }
  }

  api.storage.local.get(NS.DEFAULT_SETTINGS, (s) => {
    settings = { ...NS.DEFAULT_SETTINGS, ...s };
    $("enabled").checked = settings.enabled;
    renderList();
    api.tabs && api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try { host = new URL(tabs[0].url).hostname; } catch (_) { host = ""; }
      $("host").textContent = host ? "(" + host + ")" : "";
      $("site").checked = !settings.disabledSites.includes(host);
      $("site").disabled = !host;
    });
  });

  $("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));
  $("site").addEventListener("change", (e) => {
    const set = new Set(settings.disabledSites);
    e.target.checked ? set.delete(host) : set.add(host);
    save({ disabledSites: [...set] });
  });

  $("real").addEventListener("input", () => { variant = 0; renderPreview(); });
  $("shuffle").addEventListener("click", () => { variant++; renderPreview(); });

  function add() {
    const real = $("real").value.trim().replace(/\s+/g, " ");
    if (!real) return;
    const alias = NS.generateAlias(real, variant);
    const rules = settings.rules.filter((r) => NS.fold(r.real) !== NS.fold(real));
    rules.push({ real, alias, enabled: true });
    save({ rules });
    $("real").value = "";
    variant = 0;
    renderPreview();
    renderList();
  }
  $("add").addEventListener("click", add);
  $("real").addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

  $("options").addEventListener("click", (e) => {
    e.preventDefault();
    api.runtime.openOptionsPage();
    window.close();
  });
})();
