import { useState } from "react";
import {
  DEFAULT_ARBITRAGE_RESEARCH, findTriangularPlans,
  type ArbitragePlan, type ArbitrageQuote, type ArbitrageResearchSettings,
} from "@/core/arbitrage/triangular";

/** This calculator only consumes an explicitly supplied quote snapshot; it never creates orders. */
export function ArbitrageResearch({ value, onChange }: {
  value?: ArbitrageResearchSettings;
  onChange: (next: ArbitrageResearchSettings) => void;
}) {
  const settings = { ...DEFAULT_ARBITRAGE_RESEARCH, ...value };
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ at: number; plans: ArbitragePlan[]; key: string } | null>(null);
  const [error, setError] = useState("");
  const resultKey = JSON.stringify([settings, input]);
  const visibleResult = result?.key === resultKey ? result : null;
  const edit = (patch: Partial<ArbitrageResearchSettings>) => {
    onChange({ ...settings, ...patch });
    setResult(null);
  };
  function calculate() {
    try {
      const quotes: unknown = JSON.parse(input);
      if (!Array.isArray(quotes)) throw new Error("Enter a JSON array of quote objects.");
      if (quotes.length > 3000) throw new Error("Use at most 3,000 market quotes per snapshot.");
      const at = Date.now();
      const plans = findTriangularPlans(quotes as ArbitrageQuote[], settings.startAsset, settings.startAmount, at, settings);
      setError(""); setResult({ at, plans, key: resultKey });
    } catch (e) { setResult(null); setError(e instanceof Error ? e.message : String(e)); }
  }
  const number = (label: string, key: "startAmount" | "maxAgeMs" | "maxSkewMs" | "slippage" | "minNetReturn", step: string) =>
    <label style={{ display: "grid", gap: 4 }}>
      <span>{label}</span>
      <input className="v2-input" type="number" step={step} min="0" value={settings[key]}
        onChange={e => { const v = e.target.valueAsNumber; if (Number.isFinite(v)) edit({ [key]: v }); }} />
    </label>;
  return <div className="v2-lines" style={{ gap: 10 }}>
    <p className="v2-muted" style={{ margin: 0 }}>
      Estimates both directions of each spot-style currency conversion cycle using the supplied same-venue bid/ask,
      top-book liquidity, lot rules, taker fees and adverse slippage. This quote estimate does not model perpetual
      contract positions or funding, and sends no venue orders.
    </p>
    <div className="v2-grid v2-cols-2">
      <label style={{ display: "grid", gap: 4 }}><span>Start asset</span>
        <input className="v2-input" value={settings.startAsset} onChange={e => edit({ startAsset: e.target.value.toUpperCase() })} />
      </label>
      {number("Start amount", "startAmount", "0.01")}
      {number("Maximum quote age (ms)", "maxAgeMs", "1")}
      {number("Maximum quote skew (ms)", "maxSkewMs", "1")}
      {number("Slippage per leg (fraction)", "slippage", "0.0001")}
      {number("Minimum net return (fraction)", "minNetReturn", "0.0001")}
    </div>
    <label style={{ display: "grid", gap: 4 }}><span>Quote snapshot JSON</span>
      <textarea className="v2-input" rows={5} maxLength={1_000_000} value={input} onChange={e => { setInput(e.target.value); setResult(null); }}
        placeholder={'[{"venue":"…","symbol":"…","base":"…","quote":"…","timestamp":0,"bid":0,"ask":0,"bidSize":0,"askSize":0,"takerFee":0,"quantityStep":0,"minQuantity":0,"minNotional":0}]'} />
    </label>
    <span className="v2-muted">Timestamp is Unix milliseconds. Fee is charged in the acquired asset; supply all three market quotes with valid lot rules.</span>
    <button type="button" className="v2-btn" onClick={calculate}>Evaluate quote packs</button>
    {error && <div role="alert" className="v2-warn">{error}</div>}
    {visibleResult && <div aria-live="polite">
      <div>Snapshot checked at {new Date(visibleResult.at).toLocaleTimeString()} · {visibleResult.plans.length} eligible packs</div>
      {!visibleResult.plans.length && <div className="v2-muted">No pack met all quote, liquidity and net-return requirements.</div>}
      {visibleResult.plans.slice(0, 10).map((plan, index) => <div key={`${plan.venue}:${index}`} style={{ marginTop: 8 }}>
        <strong>{plan.venue} · estimated {(plan.netReturn * 100).toFixed(3)}% net</strong>
        <div>{plan.legs.map(l => `${l.side} ${l.symbol}`).join(" → ")}</div>
        <div className="v2-muted">{plan.startAmount.toFixed(4)} → {plan.endAmount.toFixed(4)} {plan.startAsset}; estimate only</div>
      </div>)}
    </div>}
  </div>;
}
