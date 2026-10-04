// The selected exchange connection and its event stream. Every page reads the selected connection's runtime:
// the client API wrappers (api-conn.ts) add it to each call, usePoll refreshes when the connection changes or
// reports something new (compute done, paper step, live step, settings, state), and the pages are mounted per
// connection (no draft or filter carries over to another connection).
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface CoreEventLite {
  type: "state" | "progress" | "compute" | "paper" | "live" | "settings";
  conn: string | null;
  at: number;
  state: string;
  stage: string;
  progress: number;
  label: string;
  /** the whole job's fraction (backfill batch → compute → paper step); absent from older servers */
  overall?: number;
  computes: number;
}

let current = "";
/** The connection every API call goes to (set by the provider before its children render). */
export function getConn(): string | undefined {
  return current || undefined;
}

interface ConnState {
  conn: string;
  setConn: (c: string) => void;
  /** last event per connection */
  last: Record<string, CoreEventLite | undefined>;
  /** increments when the selected connection reports a page-relevant change */
  tick: number;
  /** the event stream is connected */
  live: boolean;
}

const Ctx = createContext<ConnState>({ conn: "", setConn: () => {}, last: {}, tick: 0, live: false });

export const CONN_PREF = "cts-v2-conn";
const PAGE_EVENTS = new Set(["compute", "paper", "live", "settings", "state"]);

export function ConnProvider(props: { children: ReactNode; initial?: string }) {
  const [conn, setConnState] = useState(props.initial ?? "");
  const [last, setLast] = useState<Record<string, CoreEventLite | undefined>>({});
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(false);
  const connRef = useRef(conn);
  connRef.current = conn;
  current = conn;
  useEffect(() => {
    try {
      const v = localStorage.getItem(CONN_PREF);
      if (v) setConnState(v);
    } catch {
      /* private mode */
    }
  }, []);
  // one event stream for every connection; a page refresh is debounced (several events → one request)
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let bump: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const open = () => {
      es = new EventSource("/api/core/events");
      es.onopen = () => setLive(true);
      es.addEventListener("core", (m) => {
        let e: CoreEventLite;
        try {
          e = JSON.parse((m as MessageEvent).data);
        } catch {
          return;
        }
        if (!e.conn) return;
        setLast((p) => ({ ...p, [e.conn!]: e }));
        if (PAGE_EVENTS.has(e.type) && (e.conn === connRef.current || !connRef.current) && !bump)
          bump = setTimeout(() => {
            bump = null;
            setTick((t) => t + 1);
          }, 400);
      });
      es.onerror = () => {
        setLive(false);
        es?.close();
        if (!closed) retry = setTimeout(open, 5_000);
      };
    };
    open();
    return () => {
      closed = true;
      es?.close();
      if (retry) clearTimeout(retry);
      if (bump) clearTimeout(bump);
    };
  }, []);
  const value = useMemo<ConnState>(
    () => ({
      conn,
      setConn: (c: string) => {
        current = c;
        setConnState(c);
        try {
          localStorage.setItem(CONN_PREF, c);
        } catch {
          /* private mode */
        }
      },
      last,
      tick,
      live,
    }),
    [conn, last, tick, live],
  );
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useConn(): ConnState {
  return useContext(Ctx);
}
