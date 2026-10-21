#!/usr/bin/env node
// Read-only paired research report. Never re-score, re-select or reprice an archived close.
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { readFundedSession } from "./lib/session-funded-cohort.mjs";
import { iterateSessionValidation } from "./lib/session-dump.mjs";
import { modeledUnitReturn, settledHourT } from "../src/core/metrics/stats.ts";
import { rangeOfId } from "../src/core/minimal-coord.ts";
import { selectionAt } from "../.github/audits/micro-rank-comparison.mjs";
import { rankOrderAudit } from "./audit-micro-rank-order.mjs";

const ranks = ["volatility1h", "change1h5m"];
const read = (p) => JSON.parse(fs.readFileSync(p));
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
export const empty = () => ({ n: 0, wins: 0, gp: 0, gl: 0, hold: 0 });
export function add(a, t) {
  const r = modeledUnitReturn(t);
  assert.ok(Number.isFinite(r), "Unknown modeled unit return cannot enter primary PF");
  a.n++;
  a.wins += r > 0 ? 1 : 0;
  a.gp += Math.max(0, r);
  a.gl += Math.max(0, -r);
  a.hold += (t.exitT - t.entryT) / 60_000;
  return a;
}
export function measuredPf(a) {
  assert.ok([a.n, a.gp, a.gl].every(Number.isFinite) && a.gp >= 0 && a.gl >= 0);
  return {
    value: a.n && a.gl > 0 ? a.gp / a.gl : null,
    state: !a.n ? "empty" : a.gl ? "measured" : a.gp ? "no-loss" : "flat",
  };
}
export function compareCohorts(left, right) {
  const index = (trades) => {
    const m = new Map();
    for (const t of trades) {
      const key = JSON.stringify([t.cfg, t.sym, t.side, t.entryT, t.exitT]);
      const values = m.get(key) ?? [];
      m.set(key, values);
      const r = modeledUnitReturn(t);
      assert.ok(Number.isFinite(r));
      values.push(r);
    }
    for (const v of m.values()) v.sort((a, b) => a - b);
    return m;
  };
  const a = index(left),
    b = index(right),
    examples = [];
  let onlyLeft = 0,
    onlyRight = 0,
    mismatchedReturns = 0,
    matched = 0,
    maxReturnError = 0;
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(key) ?? [],
      y = b.get(key) ?? [];
    onlyLeft += Math.max(0, x.length - y.length);
    onlyRight += Math.max(0, y.length - x.length);
    let bad = x.length !== y.length;
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      const error = Math.abs(x[i] - y[i]);
      maxReturnError = Math.max(maxReturnError, error);
      if (error > 1e-12) {
        mismatchedReturns++;
        bad = true;
      } else matched++;
    }
    if (bad && examples.length < 20)
      examples.push({ identity: JSON.parse(key), left: x, right: y });
  }
  return {
    same: !onlyLeft && !onlyRight && !mismatchedReturns,
    matched,
    onlyLeft,
    onlyRight,
    mismatchedReturns,
    maxReturnError,
    examples,
    basis:
      "Funded settled exact identity multiset; duplicate legs retained; verified unit returns compared without charging costs again",
  };
}

async function loadCase(dir, rank, plan) {
  const protocol = read(`${dir}/protocol.json`);
  assert.equal(
    hash(`${dir}/protocol.json`),
    plan.protocols[rank],
    "Case protocol differs from paired freeze",
  );
  assert.equal(protocol.source.sha256, plan.sourceSha256);
  assert.deepEqual(protocol.window, plan.window);
  assert.deepEqual(protocol.symbols, plan.selectedSymbols[rank]);
  assert.equal(protocol.actualSettings.cost, 0.0015);
  assert.equal(protocol.actualSettings.symbolRank, rank);
  assert.equal(protocol.symbols.length, 12);
  assert.equal(protocol.feed.parentSha256, plan.parentFeedSha256);
  assert.equal(protocol.account.balance, 10000);
  assert.equal(protocol.account.notionalUsd, 2);
  const stage = read(`${dir}/filtered-stages.json`),
    scalar = read(`${dir}/scalar-hours.json`),
    transition = read(`${dir}/stage-transition.json`),
    parity = read(`${dir}/simulation-parity.json`),
    price = read(`${dir}/independent-audit.json`);
  for (const d of [stage, scalar, transition]) assert.equal(d.sourceSha256, plan.sourceSha256);
  assert.equal(scalar.complete, true);
  assert.equal(scalar.requireAll, true);
  assert.deepEqual(scalar.violations, []);
  assert.deepEqual(transition.decisionMismatches, []);
  assert.equal(parity.ok, true);
  assert.equal(parity.missingCount, 0);
  assert.equal(parity.mismatchCount, 0);
  assert.deepEqual(price.violations, []);
  assert.equal(price.roundTripChargedOnce, true);
  assert.equal(price.cost, 0.0015);
  const { book, trades, funding } = await readFundedSession(
    `${dir}/raw.json`,
    `${dir}/report/data.json`,
  );
  assert.equal(book.checksOk, true);
  assert.ok(book.checks.every((c) => c.ok));
  assert.equal(parity.matched, trades.length);
  const evaluatedByRange = {};
  for await (const step of iterateSessionValidation(`${dir}/raw.json`)) {
    for (const [id] of step.checks) {
      const tag = rangeOfId(id) || "wide";
      evaluatedByRange[tag] = (evaluatedByRange[tag] ?? 0) + 1;
    }
    break;
  }
  assert.equal(
    Object.values(evaluatedByRange).reduce((a, b) => a + b, 0),
    stage.initial.evaluated,
  );
  const cube = new Map(),
    configs = new Map(),
    sources = new Map(),
    symbols = new Map(),
    total = empty();
  for (const t of trades) {
    assert.ok(t.entryT >= plan.window.tradeStartT && t.exitT <= plan.window.endT);
    const range = rangeOfId(t.cfg) || "wide",
      source = t.cfg.split("|")[1].replace(/@m\d+$/, "");
    assert.ok(protocol.scope.focus.includes(source), `Unrequested source: ${source}`);
    const key = [range, t.kind, t.side, settledHourT(t.exitT)].join("|");
    const a = cube.get(key) ?? {
      range,
      kind: t.kind,
      side: t.side,
      t: settledHourT(t.exitT),
      ...empty(),
    };
    cube.set(key, add(a, t));
    for (const [map, id] of [
      [configs, t.cfg],
      [sources, source],
      [symbols, t.sym],
    ]) {
      const row = map.get(id) ?? { id, range, kind: t.kind, ...empty() };
      map.set(id, add(row, t));
    }
    add(total, t);
  }
  const pf = measuredPf(total);
  assert.ok(pf.value === null || Math.abs(pf.value - parity.execution.pf) < 1e-9);
  for (const id of protocol.scope.focus) if (!sources.has(id)) sources.set(id, { id, ...empty() });
  const hourlyTotals = Array.from({ length: 12 }, (_, i) => ({
    t: plan.window.tradeStartT + i * 3_600_000,
    ...empty(),
  }));
  for (const row of cube.values()) {
    const h = hourlyTotals.find((h) => h.t === row.t);
    assert.ok(h, "Close outside reporting hours");
    for (const key of ["n", "wins", "gp", "gl", "hold"]) h[key] += row[key];
  }
  assert.equal(
    hourlyTotals.reduce((n, h) => n + h.n, 0),
    total.n,
  );
  const economicSettings = Object.fromEntries(
    [
      "cost",
      "fees",
      "grid",
      "toggles",
      "exitStrategy",
      "tfMin",
      "tfs",
      "historyDays",
      "tfDays",
      "disabledKinds",
    ].map((k) => [k, protocol.actualSettings[k]]),
  );
  const checksums = Object.fromEntries(
    [
      "protocol.json",
      "filtered-stages.json",
      "scalar-hours.json",
      "stage-transition.json",
      "simulation-parity.json",
      "independent-audit.json",
      "report/data.json",
    ].map((f) => [f, hash(`${dir}/${f}`)]),
  );
  return {
    trades,
    report: {
      rank,
      protocolId: protocol.id,
      account: protocol.account,
      funding,
      total: { ...total, pf },
      hourlyTotals,
      economicSettings,
      wf: protocol.actualWf,
      nativeTotal: book.total,
      cube: [...cube.values()],
      curve: book.curve,
      configs: [...configs.values()],
      sources: [...sources.values()],
      symbols: [...symbols.values()],
      stage,
      scalar: { ...scalar, steps: scalar.steps.map(({ examples: _examples, ...step }) => step) },
      evaluatedByRange,
      checks: book.checks,
      coverage: book.coverage,
      audits: {
        price: {
          rows: price.rows,
          roundTripChargedOnce: price.roundTripChargedOnce,
          maxReturnError: price.maxReturnError,
          cost: price.cost,
          violations: price.violations.length,
        },
        parity: {
          matched: parity.matched,
          missing: parity.missingCount,
          mismatched: parity.mismatchCount,
          execution: parity.execution,
          tape: parity.tape,
        },
        scalar: {
          tapes: scalar.tapes,
          decisions: scalar.decisions,
          violations: scalar.violations.length,
        },
        transition: {
          decisions: transition.replayedDecisions,
          mismatches: transition.decisionMismatches.length,
        },
        report: { checks: book.checks.length, passed: book.checks.filter((c) => c.ok).length },
      },
      checksums,
    },
  };
}

// Everything used by the standalone browser lives inside this function.
function client() {
  const el = (s) => document.querySelector(s),
    names = ["1H Volatility", "1H Change · 5m-Distanz"],
    colors = ["#136c62", "#ae5030"];
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const fmt = (n, d = 2) =>
    n === null || n === undefined || !Number.isFinite(n)
      ? "—"
      : n.toLocaleString("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d });
  const num = (n) => fmt(n, 0),
    hour = (t) => new Date(t).toISOString().slice(11, 16);
  const pf = (a) =>
    !a.n && !a.closes
      ? "—"
      : a.gl > 0
        ? fmt(a.gp / a.gl, 3)
        : a.gp > 0
          ? "∞ (kein Verlust)"
          : "— (flat)";
  const table = (headers, rows) =>
    `<div class="scroll"><table><thead><tr>${headers.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const sum = (rows) =>
    rows.reduce((a, r) => ({ n: a.n + r.n, gp: a.gp + r.gp, gl: a.gl + r.gl }), {
      n: 0,
      gp: 0,
      gl: 0,
    });
  const chartCache = new Map();
  function chart(id, title, labels, lines, note = "", baseline, bars = false) {
    chartCache.set(id, [id, title, labels, lines, note, baseline, bars]);
    const finite = lines.flatMap((s) => s.values).filter(Number.isFinite);
    if (!finite.length) {
      el(id).innerHTML = `<h3>${esc(title)}</h3><p>Keine messbaren Daten.</p>`;
      return;
    }
    const W = Math.max(400, Math.min(720, el(id).clientWidth - 32)),
      H = 270,
      L = 66,
      R = 36,
      T = 16,
      B = 40;
    let lo = Math.min(0, ...finite),
      hi = Math.max(...finite, baseline ?? -Infinity);
    if (hi === lo) hi = lo + 1;
    const y = (v) => H - B - ((v - lo) / (hi - lo)) * (H - T - B),
      x = (i) =>
        L + (bars ? (i + 0.5) / labels.length : i / Math.max(1, labels.length - 1)) * (W - L - R);
    let body = "";
    for (let i = 0; i <= 4; i++) {
      const v = lo + ((hi - lo) * i) / 4;
      body += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#dce2e0"/><text x="${L - 9}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v, Math.abs(hi) > 100 ? 0 : 2))}</text>`;
    }
    if (Number.isFinite(baseline))
      body += `<line x1="${L}" x2="${W - R}" y1="${y(baseline)}" y2="${y(baseline)}" stroke="#6b7471" stroke-dasharray="5 5"/>`;
    const stride = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach((label, i) => {
      if (i === labels.length - 1 || (i % stride === 0 && labels.length - 1 - i >= stride))
        body += `<text x="${x(i)}" y="${H - 13}" text-anchor="middle">${esc(label)}</text>`;
    });
    lines.forEach((s, j) => {
      if (bars) {
        const width = ((W - L - R) / labels.length) * 0.72;
        s.values.forEach((v, i) => {
          if (Number.isFinite(v))
            body += `<rect x="${x(i) - width / 2}" y="${Math.min(y(v), y(0))}" width="${width}" height="${Math.max(1, Math.abs(y(v) - y(0)))}" fill="${i < 12 ? s.color || colors[j % 2] : "#b7c8bd"}"><title>Rang ${i + 1} · ${esc(labels[i])} · ${esc(fmt(v, 5))}% · ${i < 12 ? "ausgewählt" : "nicht ausgewählt"}</title></rect>`;
        });
        return;
      }
      let segment = [];
      const draw = () => {
        if (segment.length)
          body += `<polyline fill="none" stroke="${s.color || colors[j % 2]}" stroke-width="2.5" points="${segment.join(" ")}"/>`;
        segment = [];
      };
      s.values.forEach((v, i) => {
        if (!Number.isFinite(v)) {
          draw();
          return;
        }
        segment.push(`${x(i)},${y(v)}`);
        body += `<circle cx="${x(i)}" cy="${y(v)}" r="2.5" fill="${s.color || colors[j % 2]}"><title>${esc(s.name)} · ${esc(labels[i])}: ${esc(fmt(v, 5))}</title></circle>`;
      });
      draw();
    });
    el(id).innerHTML =
      `<h3>${esc(title)}</h3><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${body}</svg><div class="legend">${lines.map((s, i) => `<span><i style="background:${s.color || colors[i % 2]}"></i>${esc(s.name)}</span>`).join("")}</div><p class="note">${esc(note)}</p>`;
  }
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      for (const args of [...chartCache.values()]) chart(...args);
    }, 100);
  });
  async function start() {
    const bytes = Uint8Array.from(atob(el("#payload").textContent), (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const D = JSON.parse(await new Response(stream).text()),
      cases = D.cases,
      startT = D.plan.window.tradeStartT;
    window.reportData = D;
    el("#status").textContent = "Abgeschlossen · beide Läufe und alle Pflichtaudits bestanden";
    el("#lead").textContent =
      `${new Date(startT).toISOString().slice(0, 10)} · 12:00–00:00 UTC · 12 Symbole aus demselben 24er-Universum · 12h bewertete Vorgeschichte + 24h Indikator-Warmup`;
    el("#cohort").textContent = D.comparison.same
      ? `Beide Regeln wählten dieselben 12 Symbole in anderer Reihenfolge. Alle ${num(D.comparison.matched)} finanzierten Abschlüsse und ihre Unit-Renditen sind identisch. In diesem Fenster entsteht dadurch kein Auswahlvorteil.`
      : `Dieselben 12 Symbole, andere Prioritätsreihenfolge: ${num(D.comparison.matched)} gemeinsame Abschlüsse mit identischen Renditen, ${num(D.comparison.onlyLeft)} nur Volatility, ${num(D.comparison.onlyRight)} nur Change. Die bestehende Reihenfolge bei gleichen Zeitstempeln beeinflusst die eigene Last-N-Auswahl; der kleine PF-Unterschied ist kein Vorteil einer anderen Symbolmenge.`;
    el("#orderproof").innerHTML =
      `<p>${num(D.orderDiagnostic.commonInitialGateDecisionsChanged)} gemeinsame Configs erhalten am Start unterschiedliche Gate-Entscheidungen. Bei allen ${num(D.orderDiagnostic.examples.length)} wurde nachgewiesen: dieselben historischen Abschlüsse und Renditen, andere Reihenfolge bei Zeitgleichheit; eine einheitliche Sortierung nur in der Diagnose ergibt identische Referenzentscheidungen. Die Produktionsreihenfolge und alle gespeicherten Ergebnisse bleiben unverändert.</p><p>Zusätzlich: ${num(D.orderDiagnostic.onlyCheckedA)} nur im Volatility-Grid geprüfte Configs und ${num(D.orderDiagnostic.onlyCheckedB)} nur im Change-Grid; ${num(D.orderDiagnostic.coverageDifferences.length)} native Grid-Abdeckungszeilen unterscheiden sich beim Base-Zielfilter. Die Paarzahlen der Base-Stufe sind identisch. Gleichheit des Tape-/Ausführungs-PF wird für dieselbe finanzierte Stichprobe in jedem Lauf vollständig geprüft.</p>` +
      table(
        [
          "Beispiel-Config",
          "Historische Zeilen",
          "Volatility: Long / Short",
          "Change: Long / Short",
          "Identische Abschlüsse / Renditen",
        ],
        D.orderDiagnostic.examples.map((x) => [
          esc(x.id),
          num(x.rows),
          ...x.actualScalar.map((e) =>
            esc(
              e.directions
                .map((d) => `${d.side === 1 ? "L" : "S"}: ${d.ok ? "bestanden" : d.fail}`)
                .join(" / "),
            ),
          ),
          x.sameIdentityReturnMultiset && x.canonicalReferenceDecisionsEqual
            ? "Ja · nur Reihenfolge anders"
            : "ungeklärt",
        ]),
      );
    el("#cards").innerHTML = cases
      .map(
        (c, i) =>
          `<article class="metric"><div class="eyebrow">${names[i]}</div><strong>PF ${pf(c.total)}</strong><div>${num(c.total.n)} finanzierte Abschlüsse</div><div>${c.hourlyTotals.filter((h) => h.gp > h.gl).length} / 12 positive Unit-Stunden · ${c.hourlyTotals.filter((h) => h.gp < h.gl).length} negativ</div><div>Cash-Netto ${fmt(c.nativeTotal.net)} USD · Equity Ende ${fmt(c.nativeTotal.equityEnd)} USD</div><div class="${c.nativeTotal.feasible ? "good" : "bad"}">${c.nativeTotal.feasible ? "Modellkapital ausreichend" : "Kapitalbedarf überschreitet Modellbudget"}</div></article>`,
      )
      .join("");
    el("#capital").textContent = cases
      .map(
        (c, i) =>
          `${names[i]}: maximale Margin ${fmt(c.nativeTotal.marginMax)} USD, maximale Equity-DD ${fmt(c.nativeTotal.equityMaxDdPct * 100)}%, ${c.nativeTotal.marginOver?.minutes ?? 0} Minuten über verfügbarer Margin; ${num(c.nativeTotal.openEnd?.orders)} Orders am Ende noch offen (MTM separat).`,
      )
      .join(" ");
    const hs = Array.from({ length: 12 }, (_, i) => startT + i * 3_600_000),
      labels = hs.map(hour);
    function render() {
      const range = el("#range").value,
        kind = el("#kind").value,
        side = el("#side").value;
      const cubes = cases.map((c) =>
        c.cube.filter(
          (x) =>
            (!range || x.range === range) &&
            (!kind || x.kind === kind) &&
            (!side || String(x.side) === side),
        ),
      );
      const hours = cubes.map((c) => hs.map((t) => sum(c.filter((x) => x.t === t))));
      el("#filtered").innerHTML = table(
        [
          "Gefilterte Abschlüsse",
          "PF nach Kosten",
          "Anzahl",
          "GP / GL (Unit)",
          "Positive / negative Stunden",
        ],
        hours.map((a, i) => {
          const t = sum(a);
          return [
            names[i],
            pf(t),
            num(t.n),
            `${fmt(t.gp, 6)} / ${fmt(t.gl, 6)}`,
            `${a.filter((h) => h.gp > h.gl).length} / ${a.filter((h) => h.gp < h.gl).length}`,
          ];
        }),
      );
      chart(
        "#hourpf",
        "01 · Ausgeführter PF je Stunde",
        labels,
        hours.map((a, i) => ({
          name: names[i],
          values: a.map((h) => (h.gl > 0 ? h.gp / h.gl : null)),
        })),
        "Exakt finanzierte, abgeschlossene Unit-Renditen nach Kosten. Leere/verlustfreie Stunden werden nicht als endlicher PF gezeichnet.",
        1,
      );
      chart(
        "#orders",
        "02 · Abgeschlossene Orders je Stunde",
        labels,
        hours.map((a, i) => ({ name: names[i], values: a.map((h) => h.n) })),
      );
      chart(
        "#net",
        "03 · Kumulierte Summe der Unit-Renditen",
        labels,
        hours.map((a, i) => {
          let n = 0;
          return { name: names[i], values: a.map((h) => (n += h.gp - h.gl)) };
        }),
        "Additive Renditesumme über unabhängige Orders; keine Portfolio-Prozentzahl und kein Zinseszinsertrag.",
      );
      const groups = ["mc", "mn", "sh", "gn", "wide"];
      chart(
        "#rangepf",
        "04 · Ausgeführter PF nach Range",
        ["Micro", "Minimal", "Short", "General", "Wide Exit"],
        cubes.map((a, i) => ({
          name: names[i],
          values: groups.map((r) => {
            const s = sum(a.filter((x) => x.range === r));
            return s.gl ? s.gp / s.gl : null;
          }),
        })),
        "Filter gelten für ausgeführte Abschlüsse. Alle Verluste bleiben enthalten.",
        1,
      );
      el("#hourtable").innerHTML = table(
        [
          "UTC-Stunde",
          "Auswahl",
          "Orders",
          "PF",
          "GP",
          "GL",
          "Bestandene Sets",
          "Neu / weggefallen",
          "Historischer Gate-PF",
        ],
        hs.flatMap((t, j) =>
          cases.map((c, i) => {
            const s = c.scalar.steps.find((s) => s.t === t),
              h = hours[i][j];
            return [
              `${hour(t)}–${hour(t + 3_600_000)}`,
              names[i],
              num(h.n),
              pf(h),
              fmt(h.gp, 5),
              fmt(h.gl, 5),
              num(s.passed),
              `${num(s.gained)} / ${num(s.dropped)}`,
              pf({ n: 1, gp: s.passedGp, gl: s.passedGl }),
            ];
          }),
        ),
      );
      const ci = Number(el("#case").value),
        q = el("#search").value.toLowerCase(),
        order = el("#sort").value;
      let configs = cases[ci].configs.filter(
        (x) =>
          (!range || x.range === range) &&
          (!kind || x.kind === kind) &&
          x.id.toLowerCase().includes(q),
      );
      // Config totals are pooled directions; do not pretend the side chart filter changes this sample.
      configs.sort((a, b) =>
        order === "loss" ? a.gp - a.gl - (b.gp - b.gl) : b.n - a.n || a.id.localeCompare(b.id),
      );
      const pages = Math.max(1, Math.ceil(configs.length / 50));
      page = Math.min(page, pages - 1);
      el("#pages").textContent =
        `${num(configs.length)} tatsächlich ausgeführte Configs · Seite ${page + 1} / ${pages} · beide Richtungen`;
      el("#configtable").innerHTML = table(
        [
          "Vollständige Config-ID / TP / SL / Trailing",
          "Orders",
          "PF",
          "GP",
          "GL",
          "Ø Haltedauer min",
        ],
        configs
          .slice(page * 50, (page + 1) * 50)
          .map((c) => [esc(c.id), num(c.n), pf(c), fmt(c.gp, 5), fmt(c.gl, 5), fmt(c.hold / c.n)]),
      );
      el("#prev").disabled = page === 0;
      el("#next").disabled = page >= pages - 1;
    }
    chart(
      "#equity",
      "05 · Gesamtkonto: Equity inklusive offener Positionen",
      cases[0].curve.map((r) => hour(r.t)),
      cases.map((c, i) => ({ name: names[i], values: c.curve.map((r) => r.eq) })),
      "USD; gesamtes simuliertes Konto, unabhängig von den Tabellenfiltern. Startkapital 10.000 USD, fixe 2 USD je Order, 10× Hebel.",
    );
    chart(
      "#dd",
      "06 · Gesamtkonto: Equity-Drawdown",
      cases[0].curve.map((r) => hour(r.t)),
      cases.map((c, i) => ({ name: names[i], values: c.curve.map((r) => r.ddPct * 100) })),
      "Prozent vom bisherigen Equity-Hoch; gesamtes Konto, 5-Minuten-Kurve. Maximalwert zusätzlich aus dem nativen Minutenmodell.",
    );
    chart(
      "#sets",
      "07 · Stündlich bestandene eigene Config-Sets",
      labels,
      cases.map((c, i) => ({ name: names[i], values: c.scalar.steps.map((s) => s.passed) })),
      "Historische, überlappende Validierungsfenster. Set-Anzahl ist eine andere Einheit als spätere Order-Anzahl.",
    );
    chart(
      "#gatepf",
      "08 · Historischer PF der bestandenen Config-Sets",
      labels,
      cases.map((c, i) => ({
        name: names[i],
        values: c.scalar.steps.map((s) => (s.passedGl > 0 ? s.passedGp / s.passedGl : null)),
      })),
      "Vergangenheit an jedem Entscheidungszeitpunkt; keine zukünftige Ausführungsrendite.",
      1,
    );
    el("#stages").innerHTML = table(
      [
        "Auswahl / Range",
        "Base bestanden / bewertet (Paare)",
        "Base-PF",
        "Config-Gates bestanden / bewertet",
        "Config-Gate-PF",
        "Nach Seating: Sets / PF",
        "Später ausgeführt: Sets / Orders / PF",
      ],
      cases.flatMap((c, i) =>
        c.stage.base.rangeRepresentativeEvidence.map((b) => {
          const r = c.stage.perRange[b.tag],
            p = r?.initialPassed,
            s = r?.initialSeated,
            e = r?.executed;
          return [
            `${names[i]} · ${b.range}`,
            `${num(b.passedPairs)} / ${num(b.evaluatedPairs)}`,
            pf({ n: b.passedPairs, gp: b.gp, gl: b.gl }),
            `${num(p?.configs ?? 0)} / ${num(c.evaluatedByRange[b.tag] ?? 0)}`,
            p ? pf(p) : "—",
            s ? `${num(s.configs)} / ${pf(s)}` : "—",
            e ? `${num(e.configs)} / ${num(e.closes)} / ${pf(e)}` : "—",
          ];
        }),
      ),
    );
    cases.forEach((c, i) => {
      const base = c.stage.base.rangeRepresentativeEvidence;
      chart(
        `#stage${i}`,
        `10${i ? "b" : "a"} · ${names[i]}: PF je Stufe`,
        base.map((b) => b.range),
        [
          {
            name: "Base · vergangene Paare",
            color: "#758db1",
            values: base.map((b) => (b.gl > 0 ? b.gp / b.gl : null)),
          },
          {
            name: "Config-Gates · vergangene Sets",
            color: "#b49039",
            values: base.map((b) => {
              const s = c.stage.perRange[b.tag]?.initialPassed;
              return s?.gl > 0 ? s.gp / s.gl : null;
            }),
          },
          {
            name: "Später ausgeführt · finanzierte Abschlüsse",
            color: colors[i],
            values: base.map((b) => {
              const s = c.stage.perRange[b.tag]?.executed;
              return s?.gl > 0 ? s.gp / s.gl : null;
            }),
          },
        ],
        "Unterschiedliche historische und spätere Stichproben. Gleichheit wird ausschließlich für identische finanzierte Tape-/Ausführungsabschlüsse geprüft.",
        1,
      );
    });
    const coverRows = [];
    cases.forEach((c, i) => {
      const m = new Map();
      for (const r of c.coverage.sets) {
        const key = `${r.tag || "wide"} / ${r.kind}`;
        const s = m.get(key) ?? { grid: 0, built: 0, kept: 0, few: 0, skip: {} };
        m.set(key, s);
        for (const k of ["grid", "built", "kept", "few"]) s[k] += r[k] ?? 0;
        for (const [k, n] of Object.entries(r.skip ?? {})) s.skip[k] = (s.skip[k] ?? 0) + n;
      }
      for (const [key, s] of m)
        coverRows.push([
          names[i],
          esc(key),
          num(s.grid),
          num(s.built),
          num(s.kept),
          num(s.few),
          esc(JSON.stringify(s.skip)),
        ]);
    });
    el("#coverage").innerHTML = table(
      [
        "Auswahl",
        "Range / Typ",
        "Grid-Zellen angefordert",
        "Gebaut",
        "Behalten",
        "Zu wenig Historie",
        "Nicht gebaut / Grund",
      ],
      coverRows,
    );
    el("#admission").innerHTML = table(
      ["Auswahl", "Erster Ablehnungsgrund (nativer Schlüssel)", "Kandidatenereignisse"],
      cases.flatMap((c, i) =>
        Object.entries(c.stage.entryAdmission.firstRejectionCounts ?? {})
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => [names[i], esc(reason), num(count)]),
      ),
    );
    el("#symbols").innerHTML = table(
      ["Auswahl", "Symbol", "Finanzierte Abschlüsse", "PF", "GP / GL"],
      cases.flatMap((c, i) =>
        c.symbols.map((s) => [
          names[i],
          esc(s.id),
          num(s.n),
          pf(s),
          `${fmt(s.gp, 5)} / ${fmt(s.gl, 5)}`,
        ]),
      ),
    );
    const metrics = D.selections[0].metrics;
    for (let i = 0; i < 2; i++) {
      const rank = cases[i].rank,
        rows = [...metrics].sort(
          (a, b) => b[rank] - a[rank] || b.quoteVol - a.quoteVol || a.sym.localeCompare(b.sym),
        );
      chart(
        `#rank${i}`,
        `09${i ? "b" : "a"} · ${names[i]}: Auswahlwerte`,
        rows.map((m) => m.sym.replace("-USDT", "")),
        [
          {
            name: "Auswahlwert % (Top 12 ausgewählt)",
            color: colors[i],
            values: rows.map((m) => m[rank] * 100),
          },
        ],
        i
          ? "Mittelwert der zwölf absoluten relativen 5m-Preisänderungen während einer Stunde."
          : "Bestehende Produktionsformel: Mittelwert der High–Low-Spanne / Close aus drei abgeschlossenen 1H-Kerzen (3h Lookback).",
        undefined,
        true,
      );
    }
    el("#selection").innerHTML = table(
      [
        "Symbol",
        "Volatility Rang",
        "Change Rang",
        "Volatility %",
        "Ø 5m-Distanz %",
        "Netto 1h % (Diagnose)",
        "24h Volumenproxy USD",
      ],
      [...metrics]
        .sort((a, b) => b.volatility1h - a.volatility1h)
        .map((m) => [
          esc(m.sym),
          ...D.selections.map((s) => {
            const n = s.selected.indexOf(m.sym);
            return n < 0 ? "—" : `<b>${n + 1}</b>`;
          }),
          fmt(m.volatility1h * 100, 5),
          fmt(m.change1h5m * 100, 5),
          fmt(m.netChange1h * 100, 5),
          num(m.quoteVol),
        ]),
    );
    chart(
      "#turnover",
      "11 · Stündliche Auswahlveränderung · nur Diagnose",
      D.hourlySelection.map((x) => hour(x.t)),
      ranksForBrowser().map((rank, i) => ({
        name: names[i] + " · neue Symbole",
        values: D.hourlySelection.map((x, j, all) =>
          j ? x.selected[rank].filter((s) => !all[j - 1].selected[rank].includes(s)).length : 0,
        ),
      })),
      "Keine stündliche Umschichtung im Trade-Sim. Diese separate kausale Diagnose zeigt, wie viele der Top-12-Symbole ein stündlicher Neustart jeweils austauschen würde.",
    );
    el("#hourlyselection").innerHTML = table(
      ["Zeit UTC", "Gemeinsam / 12", "Volatility Top 12", "Change Top 12"],
      D.hourlySelection.map((x) => [
        hour(x.t),
        num(x.overlap),
        esc(x.selected.volatility1h.join(", ")),
        esc(x.selected.change1h5m.join(", ")),
      ]),
    );
    function ranksForBrowser() {
      return ["volatility1h", "change1h5m"];
    }
    el("#sourcecase").innerHTML = cases
      .map((c, i) => `<option value="${i}">${names[i]}</option>`)
      .join("");
    function sources() {
      const c = cases[Number(el("#sourcecase").value)],
        q = el("#sourcesearch").value.toLowerCase();
      const rows = c.sources
        .filter((x) => x.id.toLowerCase().includes(q))
        .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
      el("#sourcetable").innerHTML = table(
        ["Indikation (eigene Lanes gepoolt, auch ohne Abschlüsse)", "Orders", "PF", "GP / GL"],
        rows.map((x) => [esc(x.id), num(x.n), pf(x), `${fmt(x.gp, 5)} / ${fmt(x.gl, 5)}`]),
      );
      el("#sourcecount").textContent =
        `${rows.length} / ${c.sources.length} angeforderte Indikationen · vollständige Lane-IDs in der Config-Tabelle`;
    }
    el("#audits").innerHTML = table(
      [
        "Auswahl",
        "Report",
        "Kosten / Preis",
        "Tape = Ausführung",
        "Skalare Stundenentscheidungen",
        "Anfangsset-Übergänge",
      ],
      cases.map((c, i) => {
        const a = c.audits;
        return [
          names[i],
          `${a.report.passed}/${a.report.checks}`,
          `${num(a.price.rows)} geprüft · ${a.price.violations} Fehler · 0,15% einmal`,
          `${num(a.parity.matched)} exakt · 0 fehlend/abweichend`,
          `${num(a.scalar.decisions)} auf ${num(a.scalar.tapes)} Tapes · 0 Fehler`,
          `${num(a.transition.decisions)} · 0 Fehler`,
        ];
      }),
    );
    el("#provenance").textContent = JSON.stringify(
      {
        plan: D.plan,
        comparison: D.comparison,
        orderDiagnostic: D.orderDiagnostic,
        audits: cases.map((c) => ({
          rank: c.rank,
          account: c.account,
          economicSettings: c.economicSettings,
          wf: c.wf,
          funding: c.funding,
          audits: c.audits,
          checksums: c.checksums,
        })),
      },
      null,
      2,
    );
    let page = 0;
    ["#range", "#kind", "#side", "#case", "#sort"].forEach((id) =>
      el(id).addEventListener("change", () => {
        page = 0;
        render();
      }),
    );
    el("#search").addEventListener("input", () => {
      page = 0;
      render();
    });
    el("#prev").onclick = () => {
      page--;
      render();
    };
    el("#next").onclick = () => {
      page++;
      render();
    };
    el("#sourcecase").onchange = sources;
    el("#sourcesearch").oninput = sources;
    render();
    sources();
    document.body.dataset.ready = "true";
  }
  start().catch((e) => {
    el("#status").textContent = `Bericht konnte nicht geladen werden: ${e.message}`;
    console.error(e);
  });
}

export function htmlReport(data) {
  const payload = gzipSync(JSON.stringify(data)).toString("base64");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Micro · 12-Symbol Trade-Sim Vergleich</title>
<style>:root{color-scheme:light;font-family:Inter,system-ui,sans-serif;color:#183c38;background:#f3f5f1}*{box-sizing:border-box}body{margin:0}main{max-width:1540px;margin:auto;padding:36px 32px 70px}header{border-top:5px solid #136c62;padding-top:22px}h1{font-size:clamp(30px,4vw,52px);line-height:1.08;letter-spacing:-1.8px;margin:12px 0 18px}h2{font-size:25px;letter-spacing:-.5px;margin:38px 0 16px}h3{font-size:17px;margin:0 0 16px}.eyebrow{text-transform:uppercase;letter-spacing:1.7px;font-size:12px;font-weight:700;color:#52746d}.note,p{font-size:14px;line-height:1.65;color:#526761}.note{font-size:12px;margin-bottom:0}.panel,.metric,.chart{background:#fff;border:1px solid #dce2db;border-radius:12px;padding:22px;min-width:0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.metric strong{display:block;font-size:37px;letter-spacing:-1px;margin:13px 0}.metric>div{line-height:1.9}.good{color:#136c62}.bad{color:#a44729;font-weight:650}.callout{border-left:4px solid #ae5030;background:#f8eee5;padding:18px 22px;margin:20px 0;line-height:1.65;font-size:14px}#status{display:inline-block;background:#e1ede6;color:#175e50;border-radius:18px;padding:8px 13px;font-size:12px}.filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:16px 0}label{display:grid;gap:5px;font-size:12px;color:#526761}select,input,button{font:inherit;padding:10px 12px;border:1px solid #c3d0c7;border-radius:6px;min-height:42px;background:white;max-width:100%}button{cursor:pointer}button:disabled{opacity:.4}.scroll{overflow:auto;max-width:100%;max-height:650px}table{border-collapse:collapse;width:100%;font-size:12px;line-height:1.5}th,td{padding:11px 13px;border-bottom:1px solid #e5e9e1;text-align:right;vertical-align:top}th:first-child,td:first-child{text-align:left;overflow-wrap:anywhere;min-width:190px;max-width:460px}th{background:#edf2ec;position:sticky;top:0;z-index:1}td{font-variant-numeric:tabular-nums}svg{width:100%;height:auto;display:block}svg text{font:11px system-ui;fill:#64746e}.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#526761}.legend i{display:inline-block;width:15px;height:3px;vertical-align:middle;margin-right:6px}.wide{grid-column:1/-1}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.6;max-height:700px;overflow:auto}details summary{cursor:pointer;font-weight:650;padding:8px 0}.nav{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:15px 0}a{color:#136c62}#configtable td:first-child{min-width:250px}footer{font-size:12px;color:#64746e;margin-top:25px}@media(max-width:760px){main{padding:22px 14px 45px}.grid{grid-template-columns:1fr}.panel,.metric,.chart{padding:15px}h1{letter-spacing:-1px}.filters>*{flex:1;min-width:130px}.wide{grid-column:auto}th,td{padding:9px}.callout{padding:14px}svg text{font-size:12px}}@media print{.filters,.nav{display:none}.scroll{max-height:none;overflow:visible}.grid{display:block}.chart{break-inside:avoid;margin-bottom:15px}}</style>
<main><header><div class="eyebrow">CTS-A-O / abgeschlossene historische Forschung</div><h1>12 Symbole. Zwei Auswahlen.<br>Ein vollständiger Trade-Sim-Vergleich.</h1><p id="lead"></p><div id="status">Geprüfte Ergebnisdaten werden geladen …</div><p id="cohort"></p></header>
<div id="cards" class="grid"></div><div class="callout"><b>Einordnung des Ergebnisses</b><p id="capital"></p>Modellierte, nach Base- und eigenen Config-Gates zugelassene Orders. Keine Exchange-Fills. Kosten: 0,15% pro Roundtrip, genau einmal. Native 1m-Kerzen, daraus abgeschlossene 5m/15m-Lanes; keine erfundenen 5s- oder Sub-Minuten-Historien. Hohe Orderzahlen zählen unabhängige Config-Orders, nicht unabhängige Marktereignisse.</div>
<h2>Ausführung · Stundenvergleich</h2><p>Filter verändern nur die abgeschlossenen Rendite-, Order- und Range-Auswertungen. Kontokurven und historische Gate-Stufen behalten ihren vollständigen ursprünglichen Umfang.</p><div class="filters"><label>Range<select id="range"><option value="">Alle</option><option value="mc">Micro</option><option value="mn">Minimal</option><option value="sh">Short</option><option value="gn">General</option><option value="wide">Wide Exit</option></select></label><label>Strategietyp<select id="kind"><option value="">Alle</option><option>normal</option><option>trailing</option><option>trailing-only</option><option>exit</option></select></label><label>Richtung<select id="side"><option value="">Long + Short</option><option value="1">Long</option><option value="-1">Short</option></select></label></div><div id="filtered" class="panel"></div>
<div class="grid" style="margin-top:18px"><article class="chart" id="hourpf"></article><article class="chart" id="orders"></article><article class="chart" id="net"></article><article class="chart" id="rangepf"></article><article class="chart" id="equity"></article><article class="chart" id="dd"></article><article class="chart" id="sets"></article><article class="chart" id="gatepf"></article></div>
<h2>Jede Stunde · Orders, PF und Set-Veränderungen</h2><div id="hourtable" class="panel"></div><details class="panel" style="margin-top:18px"><summary>Warum unterscheiden sich die Zahlen bei denselben zwölf Symbolen?</summary><div id="orderproof"></div><p class="note">Der bestehende Vertrag bewahrt die Reihenfolge des gerankten Universums bei identischer Entry-/Exit-Zeit (compareTapeTrades; Regressionen symbol-directions und signal-gates). Eine alphabetische Umordnung zur Erzeugung identischer Ergebnisse würde diesen Vertrag ändern. Die kanonische Sortierung ist hier ausschließlich eine nachträgliche Ursachendiagnose.</p></details>
<h2>Base → Config-Gates → Seating → Ausführung</h2><p>Jede Stufe nennt ihre eigene Stichprobe. Base verwendet repräsentative Paare je Range; Config-Gates verwenden eigene historische TP/SL/Trailing-Konfigurationen. Deren überlappende vergangene Abschlüsse sind keine später ausgeführten Orders. Bewertete Configs werden pro Range aus den vollständigen initialen Prüfentscheidungen gezählt.</p><div class="grid"><article id="stage0" class="chart"></article><article id="stage1" class="chart"></article></div><div id="stages" class="panel" style="margin-top:18px"></div><details class="panel" style="margin-top:18px"><summary>Vollständige Grid-Abdeckung nach Range und Strategietyp</summary><div id="coverage"></div></details><details class="panel" style="margin-top:18px"><summary>Kandidatenprüfung vor Ausführung · erste Ablehnungsgründe</summary><p>Ein Kandidatenereignis ist weder ein Config-Set noch ein finanzierter Abschluss. Diese nativen Erst-Ablehnungen dürfen nicht von der Zahl validierter Sets abgezogen oder als ausgeführte Verlust-Trades gerechnet werden.</p><div id="admission"></div></details>
<h2>Symbolauswahl · 1H Volatility vs. 1H Change</h2><p>Einmalige Auswahl am 19.10.2026 um 12:00 UTC; während des Tests unverändert. Beide Regeln verwenden nur bereits abgeschlossene Kerzen derselben 24 archivierten Binance-USD-M-Kontrakte. Die bestehende Option „1H Volatility“ mittelt tatsächlich drei abgeschlossene Stundenkerzen (3h Lookback). „1H Change“ ist die durchschnittliche absolute Distanz zwischen zwölf aufeinanderfolgenden 5m-Schlusskursintervallen; kein Netto-Stundenertrag. Tie-Break und Liquidität entsprechen der eingefrorenen Produktionsauswahl.</p><div class="grid"><article id="rank0" class="chart"></article><article id="rank1" class="chart"></article></div><div id="selection" class="panel" style="margin-top:18px"></div><p class="note">Liquidität: kausale Summe Close × Basisvolumen aus den vorangegangenen 24h; OHLCV-Näherung des Quote-Volumens. Kein zukünftiger Endpoint-Ticker. Keine exchangeweite historische Listing-Auswahl.</p>
<h2>Stündliche Symbolveränderungen · zusätzliche Diagnose</h2><article class="chart" id="turnover"></article><details class="panel" style="margin-top:18px"><summary>Top 12 an jeder Stundengrenze</summary><p>Nur vergangene abgeschlossene Kerzen am jeweiligen Zeitpunkt; diese späteren Auswahlmengen wurden im oben dokumentierten festen Trade-Sim nicht gehandelt.</p><div id="hourlyselection"></div></details>
<h2>Ausgeführte Configs · vollständige Verlustabdeckung</h2><p>Alle tatsächlich finanzierten Configs, beide Richtungen gepoolt. Range- und Typfilter gelten; der Richtungsfilter oben gilt nur für Stunden- und Range-Charts. Einzelne positive Configs sind keine unabhängige Forward-Validierung.</p><div class="filters"><label>Auswahl<select id="case"><option value="0">1H Volatility</option><option value="1">1H Change</option></select></label><label>Config suchen<input id="search" placeholder="Indikation, tp, sl, tr …"></label><label>Sortieren<select id="sort"><option value="orders">Meiste Orders</option><option value="loss">Größte Unit-Verluste zuerst</option></select></label></div><div class="nav"><button id="prev">Zurück</button><span id="pages"></span><button id="next">Weiter</button></div><div id="configtable" class="panel"></div><details class="panel" style="margin-top:18px"><summary>Ausgeführte Abschlüsse nach Symbol · vollständige Stichprobe</summary><div id="symbols"></div></details>
<details class="panel" style="margin-top:24px"><summary>Alle angeforderten Micro / Inverse Indikationen, inklusive ohne Abschlüsse</summary><div class="filters"><label>Auswahl<select id="sourcecase"></select></label><label>Indikation suchen<input id="sourcesearch"></label></div><p id="sourcecount"></p><div id="sourcetable"></div></details>
<h2>Unabhängige Rechen- und Logistikprüfungen</h2><div id="audits" class="panel"></div><p>Exakter finanzierter Tape-/Ausführungskohort, bekannte Allokationen, einmalige Kosten, unabhängige Preis-/Trailing-Replays, vollständige eigene Last-N-Historien und stündliche Gate-Übergänge. Keine nachträgliche Kosten-, Gate- oder Parameteranpassung zur Verbesserung der Zahlen.</p><details class="panel"><summary>Reproduzierbarkeit · Protokoll, Quellen, Prüfungen und SHA-256</summary><pre id="provenance"></pre></details><footer>Offline nutzbarer Bericht · historische Simulation, keine Zusage künftiger oder stündlicher Gewinne · Verluste, offene MTM-Positionen und Kapitalgrenzen bleiben sichtbar.</footer></main><script id="payload" type="application/octet-stream">${payload}</script><script>(${client.toString()})()</script></html>`;
}

export async function main(args = process.argv.slice(2)) {
  assert.equal(args.length, 2, "report-micro-rank-comparison.mjs PAIRED_DIR OUTPUT_DIR");
  const [input, output] = args.map((p) => resolve(p)),
    plan = read(`${input}/plan.json`);
  assert.equal(plan.selectedCount, 12);
  assert.equal(plan.selectionBeforeScoring, true);
  const selections = ranks.map((rank) => {
    const file = `${input}/${rank}-selection.json`;
    assert.equal(hash(file), plan.selectionDigests[rank]);
    return read(file);
  });
  const loaded = [];
  for (const rank of ranks) loaded.push(await loadCase(`${input}/${rank}`, rank, plan));
  const nativeFeed = resolve("docs/micro-24-sim-2026-10-21/reproduction-feed.json.gz");
  assert.equal(hash(nativeFeed), plan.parentFeedSha256);
  const feed = JSON.parse(gunzipSync(fs.readFileSync(nativeFeed))),
    hourlySelection = [];
  for (let t = plan.window.tradeStartT; t <= plan.window.endT; t += 3_600_000) {
    const selected = {};
    for (const rank of ranks) selected[rank] = (await selectionAt(feed, t, rank)).selected;
    hourlySelection.push({
      t,
      selected,
      overlap: selected.volatility1h.filter((s) => selected.change1h5m.includes(s)).length,
    });
  }
  for (const rank of ranks)
    assert.deepEqual(hourlySelection[0].selected[rank], plan.selectedSymbols[rank]);
  const orderDiagnostic = await rankOrderAudit(input);
  const data = {
    schema: "cts-micro-rank-report-v1",
    plan,
    selections,
    hourlySelection,
    orderDiagnostic,
    comparison: compareCohorts(loaded[0].trades, loaded[1].trades),
    cases: loaded.map((x) => x.report),
  };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(`${output}/report.html`, htmlReport(data));
  const summary = {
    ...data,
    selections: selections.map(
      ({ metrics: _metrics, calls: _calls, tickers: _tickers, ...s }) => s,
    ),
    cases: data.cases.map(
      ({
        configs,
        cube: _cube,
        curve: _curve,
        sources,
        coverage: _coverage,
        stage,
        scalar,
        ...c
      }) => ({
        ...c,
        configCount: configs.length,
        requestedIndications: sources.length,
        perRange: stage.perRange,
        base: stage.base,
        initial: stage.initial,
        hourlyValidation: scalar.steps,
        modelNotes: stage.notes,
      }),
    ),
  };
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(
    JSON.stringify({
      output,
      comparison: data.comparison,
      cases: data.cases.map((c) => ({
        rank: c.rank,
        total: c.total,
        nativeTotal: c.nativeTotal,
        audits: c.audits,
      })),
    }),
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
