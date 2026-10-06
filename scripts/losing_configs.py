#!/usr/bin/env python3
"""Losing configs of a core-session dump, per direction, with their geometry.

    python3 scripts/losing_configs.py runs/iN/raw.json runs/iN/losing.md

Every closed order of raw.json `trades` (cfg, side, r, kind) is grouped by config x side; a config loses when its
sum of r is below 0. Range: the tag in the id (mc/mn/mp/sh/gn/lg); an untagged id is Wide unless its indication
starts with "sig-" (Signals). Then pooled tables per direction x stop/target, trail/target, stop % and range.
"""
import json
import re
import sys
from collections import defaultdict

RANGE = {"mc": "Micro", "mn": "Minimal", "mp": "Minimal plus", "sh": "Short", "gn": "General", "lg": "Long"}


def num(rx, s):
    m = re.search(rx, s)
    return float(m.group(1)) if m else None


def geometry(cfg):
    parts = cfg.split("|")
    ind = parts[1] if len(parts) > 1 else ""
    m = re.search(r"\|(mc|mp|mn|sh|gn|lg)(?=\||$)", cfg)
    rng = RANGE[m.group(1)] if m else ("Signals" if ind.startswith("sig-") else "Wide")
    tp = num(r"\|tp([0-9.]+)", cfg)
    sl = num(r"\|sl([0-9.]+)", cfg)
    tr = num(r"\|tr([0-9.]+)", cfg)
    hold = num(r"\|h([0-9.]+)", cfg)
    return rng, tp, sl, tr, hold


def bucket(x, edges, labels):
    if x is None:
        return "–"
    for e, l in zip(edges, labels):
        if x < e:
            return l
    return labels[-1]


SLR = ([0.75, 1, 1.5, 2, 3, float("inf")], ["0–0.75", "0.75–1", "1–1.5", "1.5–2", "2–3", "≥3"])
SLP = ([0.5, 1, 2, 4, 6, float("inf")], ["0–0.5", "0.5–1", "1–2", "2–4", "4–6", "≥6"])


def trail_bucket(tr, tp):
    if not tr:
        return "no trail"
    if not tp:
        return "–"
    return bucket(tr / tp, [0.5, 0.75, float("inf")], ["0–0.5", "0.5–0.75", "0.75–1"])


def pf(xs):
    gp = sum(x for x in xs if x > 0)
    gl = -sum(x for x in xs if x < 0)
    return gp / gl if gl > 0 else float("inf")


def fmt(x, d=2):
    if x is None:
        return "–"
    if x == float("inf"):
        return "∞"
    return f"{x:.{d}f}"


def main():
    raw = json.load(open(sys.argv[1]))
    out = open(sys.argv[2], "w") if len(sys.argv) > 2 else sys.stdout
    groups = defaultdict(list)
    kinds = {}
    for t in raw["trades"]:
        key = (t["cfg"], t.get("side", "?"))
        groups[key].append(t["r"])
        kinds[key] = t.get("kind", "?")
    rows = []
    for (cfg, side), rs in groups.items():
        rng, tp, sl, tr, hold = geometry(cfg)
        rows.append(
            dict(cfg=cfg, side=side, rs=rs, net=sum(rs), rng=rng, tp=tp, sl=sl, tr=tr, hold=hold, kind=kinds[(cfg, side)])
        )
    w = lambda s="": out.write(s + "\n")
    allN = sum(len(r["rs"]) for r in rows)
    lose = [r for r in rows if r["net"] < 0]
    w(f"# Losing configs — {sys.argv[1]}\n")
    w(f"{len(rows)} config × side groups over {allN} closes; {len(lose)} lose "
      f"({sum(len(r['rs']) for r in lose)} closes, net {fmt(sum(r['net'] for r in lose))} units).\n")
    for side in sorted({r["side"] for r in rows}):
        ls = sorted([r for r in lose if r["side"] == side], key=lambda r: r["net"])
        w(f"## {side}: {len(ls)} losing configs\n")
        w("| config | range | kind | target % | stop % | stop/target | trail % | trail/target | hold | closes | WR | PF | net |")
        w("|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
        for r in ls:
            rs = r["rs"]
            slr = r["sl"] / r["tp"] if r["tp"] and r["sl"] is not None else None
            trr = r["tr"] / r["tp"] if r["tp"] and r["tr"] is not None else None
            w(f"| `{r['cfg']}` | {r['rng']} | {r['kind']} | {fmt(r['tp'], 3)} | {fmt(r['sl'], 3)} | {fmt(slr)} | "
              f"{fmt(r['tr'], 3)} | {fmt(trr)} | {fmt(r['hold'], 0)} | {len(rs)} | "
              f"{fmt(100 * sum(1 for x in rs if x > 0) / len(rs), 0)} % | {fmt(pf(rs))} | {fmt(r['net'])} |")
        w()
    pools = [
        ("stop/target", lambda r: bucket(r["sl"] / r["tp"] if r["tp"] and r["sl"] is not None else None, *SLR)),
        ("trail/target", lambda r: trail_bucket(r["tr"], r["tp"])),
        ("stop %", lambda r: bucket(r["sl"], *SLP)),
        ("range", lambda r: r["rng"]),
    ]
    for name, fn in pools:
        w(f"## Pooled by direction × {name} (every config)\n")
        w(f"| side | {name} | configs | losing | closes | WR | PF | net |")
        w("|---|---|---:|---:|---:|---:|---:|---:|")
        agg = defaultdict(lambda: [0, 0, []])
        for r in rows:
            a = agg[(r["side"], fn(r))]
            a[0] += 1
            a[1] += r["net"] < 0
            a[2].extend(r["rs"])
        for (side, b), (n, nl, rs) in sorted(agg.items(), key=lambda kv: (kv[0][0], str(kv[0][1]))):
            w(f"| {side} | {b} | {n} | {nl} | {len(rs)} | {fmt(100 * sum(1 for x in rs if x > 0) / len(rs), 0)} % | "
              f"{fmt(pf(rs))} | {fmt(sum(rs))} |")
        w()


if __name__ == "__main__":
    main()
