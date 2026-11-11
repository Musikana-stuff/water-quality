(function () {
  const info = window.MODEL_INFO || {};
  const cats = info.categories || {};
  const FALLBACK = {
    source: ["Borehole", "Protected well", "Unprotected well", "Surface water", "Public tap", "Piped (yard/dwelling)", "Rainwater", "Spring"],
    province: ["Bulawayo", "Harare", "Manicaland", "Mashonaland Central", "Mashonaland East", "Mashonaland West", "Masvingo", "Matabeleland North", "Matabeleland South", "Midlands"],
    toilet: ["None (open defecation)", "Pit, no slab", "Pit with slab / VIP", "Flush"],
    land_cover: ["Grassland", "Cropland", "Savanna", "Shrubland"],
  };
  const form = document.getElementById("form");

  for (const name of ["source", "province", "toilet", "land_cover"]) {
    const sel = form.elements[name];
    const opts = (cats[name] && cats[name].length ? cats[name] : FALLBACK[name]);
    if (name !== "source") sel.add(new Option("Unknown", ""));
    opts.forEach((v) => sel.add(new Option(v, v)));
  }

  // Examples A-D from the notebook (section 8)
  const EX = {
    A: { source: "Unprotected well", province: "Masvingo", toilet: "None (open defecation)", minutes_to_water: 20, owns_animals: 1, land_cover: "Grassland" },
    B: { source: "Borehole", province: "Manicaland", toilet: "None (open defecation)", minutes_to_water: 30, owns_animals: 1, cattle_owned: 6, land_cover: "Grassland" },
    C: { source: "Borehole", province: "Matabeleland North", toilet: "Pit with slab / VIP", minutes_to_water: 15, land_cover: "Savanna" },
    D: { source: "Piped (yard/dwelling)", province: "Mashonaland East", toilet: "Flush", on_premises: 1, minutes_to_water: 0 },
  };

  function setForm(v) {
    form.reset();
    for (const el of form.elements) {
      if (!el.name || !(el.name in v)) continue;
      if (el.type === "checkbox") el.checked = !!v[el.name];
      else el.value = v[el.name];
    }
  }

  function readForm() {
    const out = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") { out[el.name] = el.checked ? 1 : 0; continue; }
      if (el.value === "") continue;
      out[el.name] = el.type === "number" || el.name === "wealth_quintile" ? Number(el.value) : el.value;
    }
    return out;
  }

  const $ = (id) => document.getElementById(id);
  function showError(msg) { $("err").textContent = msg; $("err").hidden = false; }

  async function assess(payload) {
    $("err").hidden = true;
    const btn = form.querySelector(".primary");
    btn.disabled = true;
    try {
      const r = await fetch("/api/assess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong.");
      const pct = Math.round(d.probability_contaminated * 100);
      $("empty").hidden = true; $("out").hidden = false;
      $("pct").textContent = pct + "%";
      $("fill").style.width = pct + "%";
      const cls = d.decision.startsWith("Presumed") ? "unsafe" : d.decision.startsWith("Test first") ? "first" : "routine";
      $("fill").style.background = getComputedStyle(document.documentElement).getPropertyValue(cls === "unsafe" ? "--coral" : cls === "first" ? "--amber" : "--teal");
      $("badge").className = "badge " + cls;
      $("badge").textContent = d.decision.replace(" - ", ": ");
      $("action").textContent = d.action;
      $("override").hidden = cls !== "unsafe";
      if (window.innerWidth < 820) $("result").scrollIntoView({ behavior: "smooth" });
    } catch (e) { showError(e.message); }
    finally { btn.disabled = false; }
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); assess(readForm()); });
  document.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => { setForm(EX[b.dataset.ex]); assess(EX[b.dataset.ex]); }));

})();
