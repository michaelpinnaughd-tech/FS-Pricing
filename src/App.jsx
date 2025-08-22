import React, { useEffect, useMemo, useState } from "react";

/**
 * Forms Studio – Premium Plus Pricing Sensitivity Suite
 * ----------------------------------------------------
 * Routes:
 *  - #/dashboard           → Aggregated metrics across all variants
 *  - #/pp/5400             → Premium Plus page @ $5,400
 *  - #/pp/6000             → Premium Plus page @ $6,000
 *  - #/pp/6900             → Premium Plus page @ $6,900
 *
 * Each variant page logs events to localStorage using these schemas:
 *   PricingPlanViewed, PricingPlanCTA, UpsellTileClicked, EarlyAccessJoin
 * The Dashboard aggregates across all three variant pages.
 */

// ----------------------------- constants -----------------------------
const PRICE_VARIANTS = [5400, 6000, 6900];
const PREMIUM_PRICE = 4000;
const STORAGE_KEY = "pp_test_events";

const populationBands = ["<10k", "10k–50k", "50k–150k", "150k–500k", ">500k"];
const personas = ["City Clerk", "IT Manager", "Department Admin", "Analyst"];

// ----------------------------- utils -----------------------------
function currency(n) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}
function logEvent(name, properties = {}) {
  const evt = { timestamp: new Date().toISOString(), event: name, properties };
  const cur = loadEvents();
  cur.push(evt);
  saveEvents(cur);
  // For debugging visibility
  // eslint-disable-next-line no-console
  console.log("[LOG]", evt);
}
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/dashboard");
  useEffect(() => {
    const h = () => setHash(window.location.hash || "#/dashboard");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return hash;
}
function parseRoute(hash) {
  // Formats: #/dashboard | #/pp/5400 | #/pp/6000 | #/pp/6900
  const parts = (hash || "#/dashboard").replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] === "pp" && PRICE_VARIANTS.includes(Number(parts[1]))) {
    return { page: "pp", price: Number(parts[1]) };
  }
  return { page: "dashboard" };
}

// ----------------------------- app root -----------------------------
export default function App() {
  const hash = useHashRoute();
  const route = parseRoute(hash);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav route={route} />
      {route.page === "dashboard" ? <Dashboard /> : <PlanPage price={route.price} />}
      <Footer />
    </div>
  );
}

function TopNav({ route }) {
  function go(nextHash) {
    try {
      window.location.hash = nextHash;
    } catch {}
  }
  return (
    <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Forms Studio — <span className="text-indigo-700">Premium Plus</span>{" "}
            <span className="ml-2 inline-block text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">Early Access</span>
          </h1>
          <p className="text-xs text-slate-600">Pricing sensitivity suite with variant pages and an aggregated dashboard.</p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <button onClick={() => go("#/dashboard")} className={btnNav(route.page === "dashboard")}>
            Dashboard
          </button>
          <button onClick={() => go("#/pp/5400")} className={btnNav(route.page === "pp" && route.price === 5400)}>
            $5,400
          </button>
          <button onClick={() => go("#/pp/6000")} className={btnNav(route.page === "pp" && route.price === 6000)}>
            $6,000
          </button>
          <button onClick={() => go("#/pp/6900")} className={btnNav(route.page === "pp" && route.price === 6900)}>
            $6,900
          </button>
        </nav>
      </div>
    </div>
  );
}
function btnNav(active) {
  return `px-3 py-1.5 rounded-xl border ${
    active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50"
  }`;
}

// ----------------------------- plan page (variant) -----------------------------
function PlanPage({ price }) {
  const [eaOpen, setEaOpen] = useState(false);
  const [eaForm, setEaForm] = useState({ org: "", email: "", persona: personas[0], population: populationBands[2] });
  const variantKey = price; // used in logs & metrics

  // Log a view on mount
  useEffect(() => {
    logEvent("PricingPlanViewed", {
      plan: "PremiumPlus",
      audience: "Municipal",
      population_band: eaForm.population,
      displayed_price: variantKey,
      route: `#/pp/${variantKey}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantKey]);

  function handleCTA(cta) {
    logEvent("PricingPlanCTA", {
      plan: "PremiumPlus",
      cta,
      display_price: variantKey,
      currency: "USD",
      route: `#/pp/${variantKey}`,
      fences: ["Submissions:Pooled", "SSO:Add-on", "Retention:7y"],
    });
    if (cta === "SelectPlan" || cta === "JoinEarlyAccess") setEaOpen(true);
  }
  function handleTile(feature) {
    logEvent("UpsellTileClicked", { feature, display_price: variantKey, route: `#/pp/${variantKey}` });
    setEaOpen(true);
  }

  function submitEA(e) {
    e.preventDefault();
    if (!eaForm.org || !eaForm.email) return;
    logEvent("EarlyAccessJoin", {
      plan: "PremiumPlus",
      quoted_price: variantKey,
      persona: eaForm.persona,
      municipality_size: eaForm.population,
      org: eaForm.org,
      email: eaForm.email,
      utm_source: "pricing_variant",
      route: `#/pp/${variantKey}`,
    });
    setEaOpen(false);
  }

  // quick local metrics for this variant only
  const variantMetrics = useMemo(() => {
    const evts = loadEvents();
    const viewed = evts.filter((e) => e.event === "PricingPlanViewed" && e.properties.displayed_price === variantKey).length;
    const cta = evts.filter((e) => e.event === "PricingPlanCTA" && e.properties.display_price === variantKey).length;
    const joined = evts.filter((e) => e.event === "EarlyAccessJoin" && e.properties.quoted_price === variantKey).length;
    return { viewed, cta, joined, qsr: viewed ? (joined / viewed) * 100 : 0, ctaRate: viewed ? (cta / viewed) * 100 : 0 };
  }, [variantKey]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-5 gap-6">
      <ShareableLinks />
      {/* Plan card */}
      <section className="md:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Premium Plus</h2>
              <p className="text-sm text-slate-600 mt-1">
                Everything in <span className="font-medium">Premium</span> plus Surveys and Built‑in Reporting.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold tracking-tight">
                {currency(price)} <span className="text-base font-semibold text-slate-500">/ year</span>
              </div>
              <div className="text-xs text-slate-500">Premium is {currency(PREMIUM_PRICE)}</div>
            </div>
          </div>
          <div className="px-6 pb-4">
            <ul className="grid md:grid-cols-2 gap-3 text-sm">
              <li className="flex gap-2 items-start"><span>✅</span><span><b>Surveys</b> with branching, quotas, and templates</span></li>
              <li className="flex gap-2 items-start"><span>✅</span><span><b>Built‑in analytics & dashboards</b> (filters, scheduled email reports)</span></li>
              <li className="flex gap-2 items-start"><span>✅</span><span><b>Advanced builder</b> (reusable blocks, advanced validation)</span></li>
              <li className="flex gap-2 items-start"><span>✅</span><span>Data retention 7 years · Audit trail</span></li>
              <li className="flex gap-2 items-start"><span>➕</span><span>SSO available as add‑on</span></li>
              <li className="flex gap-2 items-start"><span>🛈</span><span>Some features are <b>Early Access</b> (target: Q4)</span></li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => handleCTA("SelectPlan")} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 shadow">
                Select plan
              </button>
              <button onClick={() => handleCTA("JoinEarlyAccess")} className="rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-medium px-5 py-2.5">
                Join Early Access
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">Early Access: founding‑customer discount and service credits if timelines slip.</p>
          </div>
        </div>

        {/* Comparison card */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold">Compare to Premium</h3>
          </div>
          <div className="p-4 grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Premium</div>
              <div className="text-slate-500">{currency(PREMIUM_PRICE)} / year</div>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Form builder + validations</li>
                <li>Payments & submissions</li>
                <li>Basic exports (CSV)</li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Premium Plus</div>
              <div className="text-slate-500">{currency(price)} / year</div>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Everything in Premium</li>
                <li>Surveys + templates</li>
                <li>Built‑in analytics & scheduled reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* In-product fake doors & metrics */}
      <aside className="md:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">In‑product Upsells (fake doors)</h3>
          <div className="grid gap-3">
            <button onClick={() => handleTile("CreateSurvey")} className="w-full text-left rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-50">
              <div className="font-medium">Create Survey</div>
              <div className="text-xs text-slate-500">Premium Plus required</div>
            </button>
            <button onClick={() => handleTile("OpenAnalyticsDashboard")} className="w-full text-left rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-50">
              <div className="font-medium">Open Analytics Dashboard</div>
              <div className="text-xs text-slate-500">Premium Plus required</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">Variant Metrics ({currency(price)})</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Viewed" value={variantMetrics.viewed} />
            <Metric label="CTA clicks" value={variantMetrics.cta} />
            <Metric label="EA joins" value={variantMetrics.joined} />
            <Metric label="Qualified Signal Rate" value={`${variantMetrics.qsr.toFixed(1)}%`} />
            <Metric label="CTA/View" value={`${variantMetrics.ctaRate.toFixed(1)}%`} />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={downloadJSON} className="rounded-xl px-4 py-2 bg-slate-900 text-white text-sm">Export JSON</button>
            <button onClick={resetData} className="rounded-xl px-4 py-2 bg-white border border-slate-300 text-sm">Reset Data</button>
            <a href="#/dashboard" className="rounded-xl px-4 py-2 bg-indigo-600 text-white text-sm">View Dashboard</a>
          </div>
        </div>
      </aside>

      {/* Early Access modal */}
      {eaOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Join Early Access</div>
                <div className="text-xs text-slate-500">Founding‑customer discount and service credits if timelines slip.</div>
              </div>
              <button className="text-slate-500 hover:text-slate-700" onClick={() => setEaOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={submitEA} className="p-5 grid gap-3 text-sm">
              <label className="grid gap-1">
                <span className="text-slate-700">Organization</span>
                <input value={eaForm.org} onChange={(e) => setEaForm({ ...eaForm, org: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="City of Example" required />
              </label>
              <label className="grid gap-1">
                <span className="text-slate-700">Work email</span>
                <input type="email" value={eaForm.email} onChange={(e) => setEaForm({ ...eaForm, email: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2" placeholder="name@example.gov" required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-slate-700">Persona</span>
                  <select value={eaForm.persona} onChange={(e) => setEaForm({ ...eaForm, persona: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2">
                    {personas.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-slate-700">Population band</span>
                  <select value={eaForm.population} onChange={(e) => setEaForm({ ...eaForm, population: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2">
                    {populationBands.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="submit" className="mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5">Request Access</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

// ----------------------------- dashboard -----------------------------
function Dashboard() {
  const [events, setEvents] = useState(loadEvents());
  const [testReport, setTestReport] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setEvents(loadEvents()), 1000);
    return () => clearInterval(id);
  }, []);

  const totals = useMemo(() => summarize(events), [events]);

  function runTests() {
    // Minimal self-tests to validate summarize() and event logging
    const before = loadEvents();
    saveEvents([]); // clear

    // Synthetic data
    logEvent("PricingPlanViewed", { displayed_price: 5400 });
    logEvent("PricingPlanCTA", { display_price: 5400 });
    logEvent("EarlyAccessJoin", { quoted_price: 5400, persona: "Analyst", municipality_size: "10k–50k" });

    logEvent("PricingPlanViewed", { displayed_price: 6000 });
    logEvent("PricingPlanViewed", { displayed_price: 6000 });
    logEvent("EarlyAccessJoin", { quoted_price: 6000, persona: "IT Manager", municipality_size: "50k–150k" });

    const s = summarize(loadEvents());
    const checks = [];
    checks.push({ name: "Variant 5400 viewed=1", pass: s.byPrice[5400].viewed === 1, got: s.byPrice[5400].viewed });
    checks.push({ name: "Variant 5400 joins=1", pass: s.byPrice[5400].joined === 1, got: s.byPrice[5400].joined });
    checks.push({ name: "Variant 6000 viewed=2", pass: s.byPrice[6000].viewed === 2, got: s.byPrice[6000].viewed });
    checks.push({ name: "Variant 6000 joins=1", pass: s.byPrice[6000].joined === 1, got: s.byPrice[6000].joined });

    const passed = checks.every((c) => c.pass);

    setTestReport({ passed, checks });

    // restore
    saveEvents(before);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <ShareableLinks />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Aggregated Dashboard</h2>
            <p className="text-sm text-slate-600">Live read of all events across $5,400 / $6,000 / $6,900 pages.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={runTests} className="rounded-xl px-4 py-2 bg-emerald-600 text-white text-sm">Run Tests</button>
            <button onClick={downloadJSON} className="rounded-xl px-4 py-2 bg-slate-900 text-white text-sm">Export JSON</button>
            <button onClick={resetData} className="rounded-xl px-4 py-2 bg-white border border-slate-300 text-sm">Reset Data</button>
          </div>
        </div>
        {testReport && (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${testReport.passed ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
            <div className="font-medium mb-1">Self-test {testReport.passed ? "passed" : "failed"}</div>
            <ul className="list-disc list-inside">
              {testReport.checks.map((c, i) => (
                <li key={i} className={c.pass ? "text-emerald-700" : "text-rose-700"}>
                  {c.name} — got {String(c.got)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <Metric label="Total Views" value={totals.viewed} />
          <Metric label="Total CTA" value={totals.cta} />
          <Metric label="Total EA Joins" value={totals.joined} />
          <Metric label="Overall QSR" value={`${totals.qsr.toFixed(1)}%`} />
          <Metric label="CTA/View" value={`${totals.ctaRate.toFixed(1)}%`} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold mb-3">By Price Variant</h3>
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <Th>Price</Th>
              <Th>Viewed</Th>
              <Th>CTA</Th>
              <Th>EA Joins</Th>
              <Th>QSR</Th>
            </tr>
          </thead>
          <tbody>
            {PRICE_VARIANTS.map((p) => (
              <tr key={p} className="border-t border-slate-200">
                <Td>{currency(p)}</Td>
                <Td>{totals.byPrice[p].viewed}</Td>
                <Td>{totals.byPrice[p].cta}</Td>
                <Td>{totals.byPrice[p].joined}</Td>
                <Td>{totals.byPrice[p].qsr.toFixed(1)}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold mb-3">Segment Cuts (from EarlyAccessJoin)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <SegmentTable title="By Population Band" rows={totals.byPopulation} keyLabel="population_band" />
          <SegmentTable title="By Persona" rows={totals.byPersona} keyLabel="persona" />
        </div>
      </div>
    </main>
  );
}

// ----------------------------- summarization helpers -----------------------------
function summarize(events) {
  const viewed = events.filter((e) => e.event === "PricingPlanViewed");
  const cta = events.filter((e) => e.event === "PricingPlanCTA");
  const joined = events.filter((e) => e.event === "EarlyAccessJoin");

  const byPrice = PRICE_VARIANTS.reduce((acc, p) => {
    const v = viewed.filter((e) => e.properties.displayed_price === p).length;
    const c = cta.filter((e) => e.properties.display_price === p).length;
    const j = joined.filter((e) => e.properties.quoted_price === p).length;
    acc[p] = { viewed: v, cta: c, joined: j, qsr: v ? (j / v) * 100 : 0 };
    return acc;
  }, {});

  // Segment cuts based on EA joins (the strongest signal)
  const byPopulation = aggregateBy(joined, (e) => e.properties.municipality_size || e.properties.population_band || "(unknown)");
  const byPersona = aggregateBy(joined, (e) => e.properties.persona || "(unknown)");

  const totals = { viewed: viewed.length, cta: cta.length, joined: joined.length };
  return {
    ...totals,
    qsr: totals.viewed ? (totals.joined / totals.viewed) * 100 : 0,
    ctaRate: totals.viewed ? (totals.cta / totals.viewed) * 100 : 0,
    byPrice,
    byPopulation,
    byPersona,
  };
}
function aggregateBy(list, keyFn) {
  const map = new Map();
  for (const e of list) {
    const k = keyFn(e);
    const cur = map.get(k) || { key: k, count: 0 };
    cur.count += 1;
    map.set(k, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function SegmentTable({ title, rows, keyLabel }) {
  return (
    <div>
      <div className="font-medium mb-2">{title}</div>
      <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
        <thead className="bg-slate-50">
          <tr>
            <Th>{keyLabel}</Th>
            <Th>EA Joins</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-t border-slate-200">
              <Td colSpan={2}>(no data yet)</Td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-200">
                <Td>{r.key}</Td>
                <Td>{r.count}</Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ----------------------------- shared UI -----------------------------
function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function Th({ children }) {
  return <th className="text-left text-xs font-semibold text-slate-600 px-3 py-2">{children}</th>;
}
function Td({ children, colSpan }) {
  return (
    <td colSpan={colSpan} className="px-3 py-2 text-slate-800 text-sm">
      {children}
    </td>
  );
}

function downloadJSON() {
  const data = JSON.stringify(loadEvents(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pp_pricing_events.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function resetData() {
  saveEvents([]);
  window.location.reload();
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-slate-500">
      <p>
        Use the nav to open each variant page, then view aggregated results on the Dashboard. Events:
        <code> PricingPlanViewed</code>, <code>PricingPlanCTA</code>, <code>EarlyAccessJoin</code>, <code>UpsellTileClicked</code>. Data persists in <code>localStorage</code>.
      </p>
    </footer>
  );
}

function ShareableLinks() {
  const base = `${window.location.origin}${window.location.pathname}`;
  const routes = [
    { label: "Dashboard", hash: "#/dashboard" },
    { label: "$5,400", hash: "#/pp/5400" },
    { label: "$6,000", hash: "#/pp/6000" },
    { label: "$6,900", hash: "#/pp/6900" },
  ];
  function copy(text) {
    try {
      navigator.clipboard.writeText(text);
    } catch {}
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Shareable (local) links</div>
        <div className="text-xs text-slate-500">Note: Canvas preview links may not be shareable externally—host to share.</div>
      </div>
      <div className="mt-3 grid md:grid-cols-2 gap-2 text-sm">
        {routes.map((r) => {
          const full = `${base}${r.hash}`;
          return (
            <div key={r.hash} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
              <div className="truncate">
                <span className="font-medium mr-2">{r.label}:</span>
                <span className="text-slate-600">{full}</span>
              </div>
              <button onClick={() => copy(full)} className="ml-2 text-xs underline">
                Copy
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
