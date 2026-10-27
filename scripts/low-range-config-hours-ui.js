// Embedded by the standalone HTML renderer; no network or framework required.
(() => {
  const source = document.getElementById("lr-config-hours-data");
  if (!source) return;
  const data = JSON.parse(source.textContent), pageSize = 25;
  const search = document.getElementById("lr-config-search"), direction = document.getElementById("lr-config-direction");
  const scope = document.getElementById("lr-config-filter"), body = document.getElementById("lr-config-body");
  const status = document.getElementById("lr-config-status"), pageText = document.getElementById("lr-config-page");
  const prev = document.getElementById("lr-config-prev"), next = document.getElementById("lr-config-next");
  let page = 0;
  const cell = (tag, text, className = "") => {
    const x = document.createElement(tag); x.textContent = text; if (className) x.className = className; return x;
  };
  const pf = (n, gp, gl) => !n ? "Empty" : gl > 0 ? (gp / gl).toFixed(3) : gp > 0 ? "No loss" : "Flat";
  const stateClass = (n, gp, gl) => !n || (!gp && !gl) ? "lr-neutral" : gl === 0 || gp / gl >= data.exploratory.minHourlyPf ? "lr-good" : "lr-bad";
  const eligible = r => r[2] >= data.exploratory.minCloses && r[6].length >= data.exploratory.minActiveHours;
  const filtered = () => {
    const query = search.value.trim().toLowerCase();
    return data.rows.filter(r => (!query || r[0].toLowerCase().includes(query)) &&
      (direction.value === "both" || String(r[1]) === direction.value) &&
      (scope.value === "all" || (scope.value === "funded" && r[2] > 0) ||
       (scope.value === "eligible" && eligible(r)) || (scope.value === "consistent" && r[7])));
  };
  const draw = () => {
    const rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, pages - 1);
    const first = page * pageSize, visible = rows.slice(first, first + pageSize), nodes = [];
    for (const r of visible) {
      const tr = document.createElement("tr"), values = new Map(r[6].map(h => [h[0], h]));
      const id = cell("th", r[0]); id.scope = "row"; tr.appendChild(id);
      tr.appendChild(cell("td", r[1] === 1 ? "Long" : "Short"));
      tr.appendChild(cell("td", String(r[2])));
      tr.appendChild(cell("td", pf(r[2], r[3], r[4]), stateClass(r[2], r[3], r[4])));
      tr.appendChild(cell("td", r[6].length.toString()));
      for (let i = 0; i < 24; i++) {
        const h = values.get(i), n = h?.[1] ?? 0, gp = h?.[2] ?? 0, gl = h?.[3] ?? 0;
        const value = pf(n, gp, gl), td = cell("td", value, stateClass(n, gp, gl));
        td.title = `${new Date(data.startT + i * 3600000).toISOString().slice(0, 16).replace("T", " ")} UTC · ${n} settled · PF ${value}`;
        tr.appendChild(td);
      }
      nodes.push(tr);
    }
    body.replaceChildren(...nodes);
    const from = rows.length ? first + 1 : 0, to = Math.min(first + pageSize, rows.length);
    status.textContent = `${rows.length.toLocaleString()} matching config-direction contexts`;
    pageText.textContent = `${from.toLocaleString()}–${to.toLocaleString()} of ${rows.length.toLocaleString()}`;
    prev.disabled = page === 0; next.disabled = page + 1 >= pages;
  };
  for (const control of [search, direction, scope]) control.addEventListener("input", () => { page = 0; draw(); });
  prev.addEventListener("click", () => { if (page > 0) { page--; draw(); } });
  next.addEventListener("click", () => { page++; draw(); });
  draw();
})();
