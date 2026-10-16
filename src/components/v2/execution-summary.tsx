import { Link } from "@tanstack/react-router";
import { coreStatistics } from "./api-conn";
import { accountSource, cashPfText, returnPf, returnPfText } from "./accounting";
import { ErrorNote, fmt, Kpi, Panel, pfTone, tone, usePoll } from "./ui";

type Any = any;

/** The exchange snapshot and the owned execution ledger stay separate from research and paper results. */
export function ExecutionSummary({ account }: { account?: Any }) {
  const { data, error } = usePoll(() => coreStatistics({ data: { source: "live", hours: 24 } }), 30_000);
  const report = (data as Any)?.report;
  const total = report?.total;
  const pf = returnPf(total);
  return (
    <Panel
      title="Live execution · actual account"
      sub={`${accountSource(account)}${account?.at ? ` · ${fmt.ago(account.at)}` : ""} · ledger results cover owned closes in the last 24h; costs may be estimated when fills are unavailable`}
      right={<Link to="/v2/statistics" className="v2-btn">Execution history →</Link>}
    >
      <ErrorNote error={error} />
      <div className="v2-grid v2-cols-6">
        <Kpi label="Wallet balance" value={fmt.usd(account?.wallet)} sub={`available margin ${fmt.usd(account?.availableMargin)}`} />
        <Kpi label="Account equity" value={fmt.usd(account?.equity)} sub={`margin used ${fmt.usd(account?.margin)}`} />
        <Kpi label="Open net" value={fmt.usd(account?.openNet)} className={tone(account?.openNet)} sub={`${fmt.num(account?.positions)} positions · ${fmt.num(account?.orders)} working orders`} />
        <Kpi label="Exchange realized" value={fmt.usd(account?.realized)} className={tone(account?.realized)} sub="account-reported total; exchange reporting period" />
        <Kpi label="Ledger return PF · 24h" value={returnPfText(total)} className={pfTone(pf)} sub={total?.n ? `cash PF diagnostic ${cashPfText(total)} · ${total.n} closes` : "no owned closes in this window"} />
        <Kpi label="Ledger net · 24h" value={total?.n ? fmt.usd(total.usd) : "–"} className={tone(total?.usd)} sub="realized P&L from owned execution ledger" />
      </div>
    </Panel>
  );
}
