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

})();
