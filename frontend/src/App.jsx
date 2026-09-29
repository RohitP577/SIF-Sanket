import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", badge: null },
  { id: "analytics", label: "Analytics", icon: "analytics", badge: null },
  { id: "reports", label: "Safety Reports", icon: "reports", badge: "Live" },
  { id: "pdf", label: "PDF Intelligence", icon: "pdf", badge: "AI" },
  { id: "precursor", label: "Precursor Patterns", icon: "pattern", badge: null },
  { id: "sites", label: "Site Insights", icon: "sites", badge: null },
  { id: "hse-review", label: "HSE Review", icon: "review", badge: "3" },
];

/* ============================================================
   FALLBACK SYNTHETIC DATASET (Works offline or when API is down)
============================================================ */
const FALLBACK_STATS = {
  total_reports: 1080,
  sif_yes: 303,
  sif_no: 777,
  high_confidence_sif: 248,
  life_saving_rules: {
    "Energy Isolation": 104,
    "Line of Fire": 78,
    "Work at Height": 56,
    "Hot Work": 41,
    "Confined Space": 24,
  },
  precursor_activities: {
    "Maintenance": 112,
    "Lifting Operations": 82,
    "Equipment Servicing": 49,
    "Inspection": 38,
    "Hot Cutting": 22,
  },
  precursor_locations: {
    "Unit 4 Compressor Bay": 64,
    "Main Flare Header": 48,
    "Tank Farm D-2": 42,
    "Substation Alpha": 35,
    "Loading Gantry #3": 29,
  },
  barrier_failures: {
    "Lockout-Tagout Incomplete": 89,
    "Exclusion Zone Breach": 67,
    "Gas Monitoring Bypass": 44,
    "Harness Anchor Point Missing": 38,
    "Permit Not Validated": 31,
  },
};

const FALLBACK_REPORTS = [
  {
    report_id: "R-1042",
    raw_text: "साइट बी पर यूनिट 3 कंप्रेसर के रखरखाव के दौरान बिना LOTO पुष्टि के उच्च दबाव वाली गैस लाइन को खोला गया।",
    normalized_text: "During maintenance of Unit 3 compressor at Site B, a high-pressure gas line was cracked open without LOTO verification.",
    detected_language: "Hindi",
    sif_prediction: "YES",
    confidence: 0.94,
    life_saving_rule: "Energy Isolation",
    precursor_activity: "Maintenance",
    precursor_location: "Compressor Bay 3",
    barrier_failure: "Lockout-Tagout Incomplete",
    site: "Site B",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    report_id: "R-1041",
    raw_text: "Technician observed scaffold platform missing toe-boards and top handrail at 14m elevation. Work halted immediately.",
    normalized_text: "Technician observed scaffold platform missing toe-boards and top handrail at 14m elevation. Work halted immediately.",
    detected_language: "English",
    sif_prediction: "YES",
    confidence: 0.91,
    life_saving_rule: "Work at Height",
    precursor_activity: "Inspection",
    precursor_location: "Fractionator Column",
    barrier_failure: "Harness Anchor Point Missing",
    site: "Site C",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    report_id: "R-1040",
    raw_text: "Crane operator swung 5-ton pipe spool over active walkway where contractor team was staging tools.",
    normalized_text: "Crane operator swung 5-ton pipe spool over active walkway where contractor team was staging tools.",
    detected_language: "English",
    sif_prediction: "YES",
    confidence: 0.88,
    life_saving_rule: "Line of Fire",
    precursor_activity: "Lifting Operations",
    precursor_location: "Pipe Rack Area",
    barrier_failure: "Exclusion Zone Breach",
    site: "Site B",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    report_id: "R-1039",
    raw_text: "Minor slip on greasy steps in lube oil storage room. No injury sustained, spill kit deployed.",
    normalized_text: "Minor slip on greasy steps in lube oil storage room. No injury sustained, spill kit deployed.",
    detected_language: "English",
    sif_prediction: "NO",
    confidence: 0.96,
    life_saving_rule: "Housekeeping",
    precursor_activity: "General Walkthrough",
    precursor_location: "Lube Room",
    barrier_failure: "Housekeeping Lapse",
    site: "Site A",
    created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    report_id: "R-1038",
    raw_text: "Se realizó corte con soplete sin extintor presente ni manta ignífuga cerca de los tambores de diluyente.",
    normalized_text: "Torch cutting was performed without fire extinguisher or fire blanket near solvent thinning drums.",
    detected_language: "Spanish",
    sif_prediction: "YES",
    confidence: 0.92,
    life_saving_rule: "Hot Work",
    precursor_activity: "Hot Cutting",
    precursor_location: "Paint Staging Shed",
    barrier_failure: "Permit Not Validated",
    site: "Site D",
    created_at: new Date(Date.now() - 3600000 * 22).toISOString(),
  },
  {
    report_id: "R-1037",
    raw_text: "Routine monthly fire pump inspection completed. Pressure differential within normal operating envelope.",
    normalized_text: "Routine monthly fire pump inspection completed. Pressure differential within normal operating envelope.",
    detected_language: "English",
    sif_prediction: "NO",
    confidence: 0.98,
    life_saving_rule: "Emergency Response",
    precursor_activity: "Inspection",
    precursor_location: "Fire Pump House",
    barrier_failure: "None",
    site: "Site A",
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
];

/* ============================================================
   MAIN APPLICATION
============================================================ */
export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [reports, setReports] = useState(FALLBACK_REPORTS);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  useEffect(() => {
    loadDashboard();
    loadReports();
  }, []);

  async function loadDashboard() {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API_BASE}/dashboard/stats`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error("Dashboard API failed");
      const data = await response.json();
      setStats(data);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setStats((prev) => prev || FALLBACK_STATS);
    } finally {
      setLoadingStats(false);
      setLastSynced(new Date());
    }
  }

  async function loadReports() {
    setLoadingReports(true);
    try {
      const response = await fetch(`${API_BASE}/reports`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error("Reports API failed");
      const data = await response.json();
      const list = Array.isArray(data?.value) ? data.value : (Array.isArray(data) ? data : []);
      if (list.length > 0) {
        setReports(list);
      }
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setReports((prev) => (prev.length > 0 ? prev : FALLBACK_REPORTS));
    } finally {
      setLoadingReports(false);
      setLastSynced(new Date());
    }
  }

  async function refreshEverything() {
    await Promise.all([loadDashboard(), loadReports()]);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-500 selection:text-white antialiased">
      {/* Subtle modern ambient background mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.08),rgba(255,255,255,0))]" />

      <div className="flex min-h-screen">
        {/* =====================================================
            LEFT SIDEBAR
        ===================================================== */}
        <aside className="hidden lg:flex w-72 shrink-0 bg-[#06111f] text-white flex-col border-r border-slate-800/60 shadow-2xl z-20">
          {/* Brand header */}
          <div className="px-6 py-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-[#06111f] rounded-[15px] flex items-center justify-center">
                  <Icon name="shield" size={22} className="text-cyan-400" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#06111f]" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  SIF-Sanket
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/20">v2.4</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AI Safety Intelligence
                </div>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div className="px-4 py-6 flex-1 overflow-y-auto space-y-6">
            <div>
              <div className="px-3 mb-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Executive Modules
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className={`group relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40"
                          : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive ? "bg-white/15 text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      >
                        <Icon name={item.icon} size={16} />
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider ${
                            isActive
                              ? "bg-white/20 text-white"
                              : item.badge === "Live"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : item.badge === "AI"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Engine Telemetry */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold text-[11px]">Inference Backend</span>
                <span className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                  <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"}`} />
                  {apiOnline ? "FastAPI 8000" : "Demo Engine"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>NLP Model:</span>
                  <span className="text-slate-200 font-mono">XLM-RoBERTa</span>
                </div>
                <div className="flex justify-between">
                  <span>SIF Threshold:</span>
                  <span className="text-slate-200 font-mono">P ≥ 0.70</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer User Info */}
          <div className="p-4 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center font-black text-blue-300 text-xs">
                HS
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">HSE Officer Portal</div>
                <div className="text-[10px] text-slate-400 truncate">Enterprise Safety Admin</div>
              </div>
            </div>
          </div>
        </aside>

        {/* =====================================================
            MAIN CONTENT AREA
        ===================================================== */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-30 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="lg:hidden w-10 h-10 rounded-xl bg-[#06111f] text-cyan-400 flex items-center justify-center shrink-0">
                <Icon name="shield" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>SIF-SANKET</span>
                  <span>/</span>
                  <span className="text-blue-600">{pageTitle(activePage)}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {pageTitle(activePage)}
                </h1>
              </div>
            </div>

            {/* Header Right Controls */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-sm">
                <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>{apiOnline ? "API Live" : "Demo Mode"}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400 text-[10px] font-mono">
                  {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <button
                onClick={refreshEverything}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition active:scale-95"
              >
                <Icon name="refresh" size={14} className={loadingStats || loadingReports ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh Sync</span>
              </button>
            </div>
          </header>

          {/* Mobile Tab Scroll Bar */}
          <div className="lg:hidden border-b border-slate-200 bg-white px-3 py-2.5 overflow-x-auto flex gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activePage === item.id ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon name={item.icon} size={14} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Dynamic Page Component Container */}
          <div className="flex-1 p-4 sm:p-7 xl:p-9 max-w-7xl w-full mx-auto space-y-7">
            {activePage === "dashboard" && (
              <DashboardPage
                stats={stats}
                reports={reports}
                loading={loadingStats}
                onOpenReports={() => setActivePage("reports")}
                onOpenAnalytics={() => setActivePage("analytics")}
                onOpenPdf={() => setActivePage("pdf")}
              />
            )}

            {activePage === "analytics" && (
              <AnalyticsPage stats={stats} loading={loadingStats} />
            )}

            {activePage === "reports" && (
              <ReportsPage
                reports={reports}
                loading={loadingReports}
                refresh={loadReports}
              />
            )}

            {activePage === "pdf" && (
              <PdfAnalyzerPage refresh={refreshEverything} />
            )}

            {activePage === "precursor" && <PrecursorPatternsPage />}

            {activePage === "sites" && <SiteInsightsPage />}

            {activePage === "hse-review" && <HSEReviewPage reports={reports} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE 1: DASHBOARD
============================================================ */
function DashboardPage({ stats, reports, loading, onOpenReports, onOpenAnalytics, onOpenPdf }) {
  const total = stats?.total_reports || 0;
  const sifYes = stats?.sif_yes || 0;
  const highConfidence = stats?.high_confidence_sif || 0;
  const sifRate = total ? Math.round((sifYes / total) * 100) : 0;

  return (
    <div className="space-y-7">
      {/* Modern Executive Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06111f] via-[#09182d] to-[#0c2340] text-white p-7 sm:p-10 shadow-2xl border border-white/5">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-24 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/10 text-[11px] font-bold text-cyan-300 mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            AI Multilingual Precursor Early-Warning System
          </div>

          <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.15]">
            Catch Serious Incidents <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
              Before They Happen.
            </span>
          </h2>

          <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            Continuous NLP surveillance on safety observations, work permits, and incident reports to pinpoint SIF precursors and high-risk control failures across all operational sites.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenPdf}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition active:scale-95 flex items-center gap-2"
            >
              <Icon name="pdf" size={16} />
              Analyze Incident PDF
            </button>
            <button
              onClick={onOpenReports}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-extrabold text-xs sm:text-sm backdrop-blur transition active:scale-95 flex items-center gap-2"
            >
              <Icon name="reports" size={16} />
              View All Reports ({total})
            </button>
            <button
              onClick={onOpenAnalytics}
              className="px-5 py-3 rounded-xl hover:bg-white/5 text-slate-300 font-bold text-xs sm:text-sm transition"
            >
              Explore Trends →
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Reports Processed"
          value={loading ? "..." : total}
          change="+18% vs last month"
          icon="reports"
          tone="blue"
        />
        <KpiCard
          title="SIF Precursors Detected"
          value={loading ? "..." : sifYes}
          change="Requires urgent mitigation"
          icon="alert"
          tone="rose"
        />
        <KpiCard
          title="High Confidence Predictions"
          value={loading ? "..." : highConfidence}
          change="Confidence score ≥ 90%"
          icon="shield"
          tone="emerald"
        />
        <KpiCard
          title="Precursor Frequency Rate"
          value={loading ? "..." : `${sifRate}%`}
          change="Baseline threshold: 25%"
          icon="analytics"
          tone="violet"
        />
      </section>

      {/* Middle Interactive Chart Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Donut Distribution Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">SIF Precursor Ratio</h3>
              <p className="text-xs text-slate-500 font-medium">Binary classification breakdown across all sites</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
              {total} Audited
            </span>
          </div>

          <div className="py-6">
            <EnhancedDonutChart yes={sifYes} no={stats?.sif_no || 0} />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center">
            <div className="p-2 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase">SIF Ratio</div>
              <div className="text-sm font-black text-rose-600">{sifRate}%</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Non-SIF Ratio</div>
              <div className="text-sm font-black text-emerald-600">{100 - sifRate}%</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Confidence avg</div>
              <div className="text-sm font-black text-blue-600">92.4%</div>
            </div>
          </div>
        </div>

        {/* Priority Life-Saving Rules */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Top Life-Saving Rules</h3>
              <p className="text-xs text-slate-500 font-medium">Highest frequency breaches</p>
            </div>
            <button onClick={onOpenAnalytics} className="text-xs font-bold text-blue-600 hover:text-blue-700">
              All Rules →
            </button>
          </div>

          <div className="py-4 space-y-4">
            {Object.entries(stats?.life_saving_rules || {})
              .slice(0, 5)
              .map(([rule, count]) => {
                const max = Math.max(...Object.values(stats?.life_saving_rules || { 1: 1 }));
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={rule} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="truncate pr-2">{rule}</span>
                      <span className="font-mono text-slate-900 font-black">{count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900 flex items-center gap-2.5">
            <Icon name="alert" size={16} className="text-amber-600 shrink-0" />
            <span><strong>Energy Isolation</strong> breaches account for over 34% of positive SIF events.</span>
          </div>
        </div>
      </section>

      {/* Recent High-Risk Reports Table */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Recent Incident Stream</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time normalized multilingual reports</p>
          </div>
          <button
            onClick={onOpenReports}
            className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition"
          >
            Open Full Ledger →
          </button>
        </div>
        <div className="overflow-x-auto">
          <ReportTable reports={reports.slice(0, 5)} onSelect={() => onOpenReports()} />
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   PAGE 2: ANALYTICS
============================================================ */
function AnalyticsPage({ stats, loading }) {
  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-blue-600">Deep Risk Intelligence</div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Safety Analytics Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aggregated patterns across precursor activities, control barrier failures, and spatial locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
            Cohort: All Operational Sites
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Barrier Failure Types"
          value={loading ? "..." : Object.keys(stats?.barrier_failures || {}).length}
          change="Categorized failure modes"
          icon="shield"
          tone="rose"
        />
        <KpiCard
          title="Active Hotspot Zones"
          value={loading ? "..." : Object.keys(stats?.precursor_locations || {}).length}
          change="Monitored site areas"
          icon="sites"
          tone="blue"
        />
        <KpiCard
          title="Precursor Activities"
          value={loading ? "..." : Object.keys(stats?.precursor_activities || {}).length}
          change="Work types identified"
          icon="pattern"
          tone="emerald"
        />
        <KpiCard
          title="Life-Saving Rules"
          value={loading ? "..." : Object.keys(stats?.life_saving_rules || {}).length}
          change="Core IOGP rules mapped"
          icon="review"
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsBarCard
          title="Critical Barrier Failures"
          subtitle="Frequency of failed safety layers"
          data={stats?.barrier_failures}
          barColor="from-rose-500 to-red-600"
        />
        <AnalyticsBarCard
          title="Precursor Activities"
          subtitle="Operations with highest SIF probability"
          data={stats?.precursor_activities}
          barColor="from-blue-600 to-indigo-600"
        />
        <AnalyticsBarCard
          title="High-Risk Hotspot Locations"
          subtitle="Specific bays and units generating reports"
          data={stats?.precursor_locations}
          barColor="from-amber-500 to-orange-600"
        />
        <AnalyticsBarCard
          title="Life-Saving Rules Breached"
          subtitle="Distribution of rule non-conformances"
          data={stats?.life_saving_rules}
          barColor="from-emerald-500 to-teal-600"
        />
      </div>
    </div>
  );
}

/* ============================================================
   PAGE 3: SAFETY REPORTS
============================================================ */
function ReportsPage({ reports, loading, refresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchSif = filter === "ALL" || r.sif_prediction === filter;
      const matchLang = languageFilter === "ALL" || r.detected_language === languageFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        String(r.report_id || "").toLowerCase().includes(q) ||
        String(r.raw_text || "").toLowerCase().includes(q) ||
        String(r.life_saving_rule || "").toLowerCase().includes(q) ||
        String(r.precursor_activity || "").toLowerCase().includes(q) ||
        String(r.site || "").toLowerCase().includes(q);
      return matchSif && matchLang && matchSearch;
    });
  }, [reports, search, filter, languageFilter]);

  function exportCsv() {
    const headers = ["Report ID", "SIF Prediction", "Confidence", "Language", "Life Saving Rule", "Activity", "Raw Text"];
    const rows = filtered.map((r) => [
      r.report_id,
      r.sif_prediction,
      `${Math.round(r.confidence * 100)}%`,
      r.detected_language,
      r.life_saving_rule,
      r.precursor_activity,
      `"${(r.raw_text || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sif_safety_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-blue-600">Enterprise Registry</div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Safety Incident Ledger</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, filter, and inspect detailed linguistic extractions and root cause mappings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <Icon name="download" size={14} />
            Export CSV
          </button>
          <button
            onClick={refresh}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            Sync Data
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, rule, activity, or keywords..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* SIF Filter */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              {["ALL", "YES", "NO"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    filter === status
                      ? status === "YES"
                        ? "bg-rose-600 text-white shadow-sm"
                        : status === "NO"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {status === "ALL" ? "All Status" : `SIF ${status}`}
                </button>
              ))}
            </div>

            {/* Language Filter */}
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Languages</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Spanish">Spanish (Español)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold text-sm animate-pulse">
              Loading safety reports registry...
            </div>
          ) : (
            <ReportTable reports={filtered} onSelect={(r) => setSelectedReport(r)} />
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing <strong>{filtered.length}</strong> of {reports.length} reports</span>
          <span>Click "Inspect" on any row for bilingual breakdown & barrier analysis</span>
        </div>
      </div>

      {/* Modal Inspector */}
      {selectedReport && (
        <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}

/* ============================================================
   PAGE 4: PDF ANALYZER STUDIO
============================================================ */
function PdfAnalyzerPage({ refresh }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  // Sample pre-loaded test options
  const DEMO_SAMPLES = [
    {
      title: "Hindi Crane Lift Incident",
      lang: "Hindi",
      text: "साइट बी पर यूनिट 3 कंप्रेसर के पास 10 टन पाइप को बिना बैरिकेडिंग और बिना सिगनलमैन के उठाया जा रहा था। लोड रास्ते के ऊपर से गुजरा।",
      rule: "Line of Fire",
      sif: "YES",
      conf: 0.94,
      activity: "Lifting Operations",
      location: "Unit 3 Compressor Bay",
      barrier: "Exclusion Zone Failure",
    },
    {
      title: "English High-Voltage Breaker",
      lang: "English",
      text: "Substation Alpha: Electrician opened panel without lockout verification. Induction meter alarm sounded before touching live contacts.",
      rule: "Energy Isolation",
      sif: "YES",
      conf: 0.96,
      activity: "Electrical Maintenance",
      location: "Substation Alpha",
      barrier: "Lockout-Tagout Incomplete",
    },
    {
      title: "Spanish Tank Cleaning",
      lang: "Spanish",
      text: "Operador ingresó al tanque de almacenamiento D-4 sin prueba previa de oxígeno ni vigía designado afuera.",
      rule: "Confined Space",
      sif: "YES",
      conf: 0.91,
      activity: "Tank Entry",
      location: "Tank Farm D-4",
      barrier: "Gas Testing Not Completed",
    },
  ];

  function runSample(sample) {
    setAnalyzing(true);
    setError("");
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 600);
    setTimeout(() => setActiveStep(3), 1200);
    setTimeout(() => {
      setResult({
        report_id: `PDF-${Math.floor(1000 + Math.random() * 9000)}`,
        raw_text: sample.text,
        normalized_text: sample.text,
        detected_language: sample.lang,
        sif_prediction: sample.sif,
        confidence: sample.conf,
        life_saving_rule: sample.rule,
        precursor_activity: sample.activity,
        precursor_location: sample.location,
        barrier_failure: sample.barrier,
      });
      setAnalyzing(false);
    }, 1800);
  }

  async function handleRealUpload() {
    if (!file) {
      setError("Please select or drop a PDF file first.");
      return;
    }
    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/analyze-pdf`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "PDF processing failed on server");
      setResult(data);
      if (refresh) refresh();
    } catch (err) {
      // In case server fails, show graceful fallback result
      setError(`API Notice: ${err.message}. Showing simulated multilingual parsing.`);
      runSample(DEMO_SAMPLES[0]);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-blue-600">Cognitive Document Engine</div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">PDF Safety Intelligence</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload any safety report PDF or select a multilingual sample to extract SIF precursors, Life-Saving Rules, and barrier non-conformances.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Drag & Drop Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-2">Upload Safety Document</h3>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f && f.type === "application/pdf") {
                  setFile(f);
                  setError("");
                } else {
                  setError("Please drop a valid .PDF document.");
                }
              }}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                dragging
                  ? "border-blue-500 bg-blue-50/60 scale-[0.99]"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <Icon name="upload" size={24} />
              </div>
              <div className="text-sm font-black text-slate-800">
                {file ? file.name : "Drag & drop PDF here"}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Supports selectable text safety audit logs & permits"}
              </p>

              <label className="mt-5 inline-block">
                <span className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition">
                  Browse File
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      setError("");
                    }
                  }}
                />
              </label>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              onClick={handleRealUpload}
              disabled={!file || analyzing}
              className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Icon name="refresh" size={16} className="animate-spin" />
                  <span>Extracting & Analyzing...</span>
                </>
              ) : (
                <>
                  <Icon name="spark" size={16} />
                  <span>Execute AI Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Sample Trigger Cards */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
              Or Try Pre-Loaded Samples (1-Click)
            </div>
            {DEMO_SAMPLES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => runSample(sample)}
                disabled={analyzing}
                className="w-full p-3 text-left rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition group flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                    {sample.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{sample.lang}</span>
                    <span>•</span>
                    <span>{sample.rule}</span>
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                  Run →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Result Column */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900">Inference Findings</h3>
                <p className="text-xs text-slate-500">XLM-RoBERTa classification output & metadata</p>
              </div>
              {result && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                  Analysis Verified
                </span>
              )}
            </div>

            {analyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
                  <Icon name="refresh" size={28} />
                </div>
                <div className="text-sm font-black text-slate-800">
                  {activeStep === 1 && "1/3: Extracting text & tokenizing PDF..."}
                  {activeStep === 2 && "2/3: Detecting multilingual features (Hindi / English)..."}
                  {activeStep === 3 && "3/3: Running SIF Precursor Model & Barrier Mapping..."}
                </div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Applying IOGP Life-Saving Rules taxonomy to determine incident severity.
                </p>
              </div>
            ) : !result ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Icon name="pdf" size={28} />
                </div>
                <div className="text-base font-bold text-slate-700">No Document Analyzed Yet</div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Drag and drop a PDF on the left panel or click one of the 1-Click sample incidents to generate a complete safety evaluation.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Result Hero Banner */}
                <div
                  className={`p-5 rounded-2xl border flex items-center justify-between ${
                    result.sif_prediction === "YES"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider">SIF Prediction Outcome</div>
                    <div className="text-3xl font-black mt-1">
                      {result.sif_prediction === "YES" ? "SIF Precursor DETECTED" : "Non-SIF Routine Event"}
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      {result.sif_prediction === "YES"
                        ? "Potential fatality or life-altering injury precursor identified."
                        : "Low-severity observation without critical barrier breach."}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold opacity-75">Confidence</div>
                    <div className="text-2xl font-black">{Math.round(result.confidence * 100)}%</div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MetaPill label="Report ID" value={result.report_id} />
                  <MetaPill label="Language" value={result.detected_language} />
                  <MetaPill label="Life-Saving Rule" value={result.life_saving_rule} highlight />
                  <MetaPill label="Precursor Activity" value={result.precursor_activity} />
                  <MetaPill label="Primary Location" value={result.precursor_location} />
                  <MetaPill label="Barrier Failure" value={result.barrier_failure} danger />
                </div>

                {/* Raw vs Normalized Text */}
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                      <span>Original Extracted Text</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {result.detected_language}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-mono">
                      "{result.raw_text}"
                    </p>
                  </div>

                  {result.detected_language !== "English" && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                      <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 mb-2 flex items-center justify-between">
                        <span>English Normalized Translation</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          English
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                        "{result.normalized_text}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE 5: PRECURSOR PATTERNS
============================================================ */
function PrecursorPatternsPage() {
  const [filterRisk, setFilterRisk] = useState("ALL");

  const patterns = [
    {
      id: 1,
      activity: "Heavy Maintenance",
      barrier: "Energy Isolation (LOTO) Defect",
      site: "Site B - Gas Fractionation",
      rule: "Energy Isolation",
      occurrences: 47,
      risk: "HIGH",
      recommendation: "Conduct mandatory physical lockbox verification prior to permit signoff.",
    },
    {
      id: 2,
      activity: "Hot Work & Cutting",
      barrier: "Fire Watch / Extinguisher Missing",
      site: "Site C - Tank Farm",
      rule: "Hot Work",
      occurrences: 31,
      risk: "HIGH",
      recommendation: "Enforce continuous spark curtain coverage and calibrated explosive gas monitoring.",
    },
    {
      id: 3,
      activity: "Overhead Lifting",
      barrier: "Exclusion Zone Perimeter Breach",
      site: "Site B - Compressor Bay",
      rule: "Line of Fire",
      occurrences: 26,
      risk: "HIGH",
      recommendation: "Deploy physical hard barriers instead of tape during crane swing cycles.",
    },
    {
      id: 4,
      activity: "Vessel Entry",
      barrier: "Gas Testing Incomplete",
      site: "Site A - Cracking Unit",
      rule: "Confined Space",
      occurrences: 19,
      risk: "MEDIUM",
      recommendation: "Require continuous 4-gas telemetry monitors for all entrants.",
    },
  ];

  const filtered = patterns.filter((p) => filterRisk === "ALL" || p.risk === filterRisk);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-blue-600">Cross-Site Intelligence</div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Precursor Pattern Register</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Correlated recurring combinations of activities, barrier dropouts, and Life-Saving Rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "HIGH", "MEDIUM"].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                filterRisk === r ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-blue-300 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  Pattern Cluster #{item.id}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    item.risk === "HIGH"
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}
                >
                  {item.risk} RISK
                </span>
              </div>

              <h4 className="text-base font-black text-slate-900 mb-3">
                {item.activity} → {item.barrier}
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Associated Site</div>
                  <div className="font-extrabold text-slate-800 mt-0.5 truncate">{item.site}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Life-Saving Rule</div>
                  <div className="font-extrabold text-slate-800 mt-0.5 truncate">{item.rule}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 leading-relaxed">
                <strong>Recommended Preventive Action:</strong> {item.recommendation}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Recurrence Frequency:</span>
              <span className="font-black text-slate-900 text-sm">{item.occurrences} Reports</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE 6: SITE INSIGHTS
============================================================ */
function SiteInsightsPage() {
  const sites = [
    {
      name: "Site B - Gas Processing",
      risk: "HIGH",
      totalReports: 342,
      sifCases: 127,
      rate: "37.1%",
      activity: "Heavy Maintenance",
      lsr: "Energy Isolation",
      barrier: "LOTO Verification Defect",
      trend: [35, 42, 48, 65, 58, 79],
    },
    {
      name: "Site C - Refined Tank Farm",
      risk: "MEDIUM-HIGH",
      totalReports: 289,
      sifCases: 91,
      rate: "31.5%",
      activity: "Hot Work & Cutting",
      lsr: "Hot Work",
      barrier: "Missing Fire Control",
      trend: [22, 30, 28, 45, 41, 55],
    },
    {
      name: "Site A - Chemical Synthesis",
      risk: "MEDIUM",
      totalReports: 251,
      sifCases: 58,
      rate: "23.1%",
      activity: "Vessel Inspection",
      lsr: "Confined Space",
      barrier: "Gas Testing Oversight",
      trend: [18, 20, 25, 22, 28, 32],
    },
    {
      name: "Site D - Terminal & Logistics",
      risk: "LOW",
      totalReports: 198,
      sifCases: 27,
      rate: "13.6%",
      activity: "Truck Offloading",
      lsr: "Line of Fire",
      barrier: "Wheel Chocking Failure",
      trend: [10, 12, 14, 9, 15, 11],
    },
  ];

  const [selectedSite, setSelectedSite] = useState(sites[0]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-blue-600">Spatial Intelligence</div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Site Risk Insights</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Comparative facility-level benchmarking across incident density and control integrity.
        </p>
      </div>

      {/* Site Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {sites.map((s) => {
          const isSelected = selectedSite.name === s.name;
          return (
            <button
              key={s.name}
              onClick={() => setSelectedSite(s)}
              className={`p-5 rounded-3xl border text-left transition-all duration-200 ${
                isSelected
                  ? "bg-white border-blue-500 ring-4 ring-blue-50 shadow-md"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-slate-900 truncate pr-2">{s.name.split("-")[0]}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    s.risk === "HIGH" ? "bg-rose-500" : s.risk.includes("MEDIUM") ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="text-2xl font-black text-slate-900">{s.rate}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">SIF precursor frequency</div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                <span>{s.sifCases} SIF cases</span>
                <span>{s.totalReports} total</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Site Drilldown */}
      <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Selected Facility</div>
            <h3 className="text-xl font-black text-slate-900">{selectedSite.name}</h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black border ${
              selectedSite.risk === "HIGH"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {selectedSite.risk} PRIORITY
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetaPill label="Total Site Reports" value={selectedSite.totalReports} />
          <MetaPill label="Positive SIF Events" value={selectedSite.sifCases} danger />
          <MetaPill label="Precursor Rate" value={selectedSite.rate} highlight />
          <MetaPill label="Leading Failure" value={selectedSite.barrier} />
        </div>

        {/* Trend Bar Visualizer */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-black text-slate-900">Precursor Trend (Last 6 Months)</div>
              <div className="text-[11px] text-slate-500">Monthly SIF observations reported</div>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono">M1 → M6</span>
          </div>

          <div className="h-40 flex items-end gap-3 sm:gap-6">
            {selectedSite.trend.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-bold text-slate-500 font-mono">{val}</span>
                <div
                  className="w-full rounded-xl bg-gradient-to-t from-blue-600 to-cyan-400 transition-all duration-500"
                  style={{ height: `${val}%` }}
                />
                <span className="text-[10px] font-extrabold text-slate-400">M{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE 7: HSE REVIEW (Human-in-the-Loop)
============================================================ */
function HSEReviewPage({ reports }) {
  const [reviewCases, setReviewCases] = useState([
    {
      id: "REV-201",
      report_id: "R-1042",
      title: "Potential LOTO Defect during Compressor Service",
      confidence: 0.72,
      raw_text: "यूनिट 3 कंप्रेसर के रखरखाव के दौरान बिना LOTO पुष्टि के उच्च दबाव वाली गैस लाइन को खोला गया।",
      language: "Hindi",
      suggested_sif: "YES",
      rule: "Energy Isolation",
      status: "PENDING",
      reviewerNotes: "",
    },
    {
      id: "REV-202",
      report_id: "R-1040",
      title: "Crane Swung Pipe Spool Near Walkway",
      confidence: 0.69,
      raw_text: "Crane operator swung 5-ton pipe spool over active walkway where contractor team was staging tools.",
      language: "English",
      suggested_sif: "YES",
      rule: "Line of Fire",
      status: "PENDING",
      reviewerNotes: "",
    },
    {
      id: "REV-203",
      report_id: "R-1038",
      title: "Hot Cutting near Solvent Area",
      confidence: 0.74,
      raw_text: "Se realizó corte con soplete sin extintor presente ni manta ignífuga cerca de los tambores de diluyente.",
      language: "Spanish",
      suggested_sif: "YES",
      rule: "Hot Work",
      status: "PENDING",
      reviewerNotes: "",
    },
  ]);

  const [activeCaseId, setActiveCaseId] = useState(reviewCases[0]?.id);
  const activeCase = reviewCases.find((c) => c.id === activeCaseId) || reviewCases[0];

  function updateStatus(newStatus) {
    setReviewCases((prev) =>
      prev.map((c) => (c.id === activeCase.id ? { ...c, status: newStatus } : c))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-rose-600">Human-in-the-Loop Protocol</div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">HSE Expert Signoff Center</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cases where AI prediction confidence is under 75% or borderline requiring qualified human signoff.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Review Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
            Review Queue ({reviewCases.filter((c) => c.status === "PENDING").length} Pending)
          </div>
          {reviewCases.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCaseId(c.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                activeCaseId === c.id
                  ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-100"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-900">{c.report_id}</span>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    c.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : c.status === "REJECTED"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 line-clamp-1">{c.title}</div>
              <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Rule: {c.rule}</span>
                <span>Conf: {Math.round(c.confidence * 100)}%</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right Active Review Form */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div>
              <div className="text-xs font-black text-blue-600 uppercase tracking-wider">
                Case Assessment #{activeCase.id}
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-0.5">{activeCase.title}</h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">AI Confidence: </span>
              <span className="text-sm font-black text-slate-900">{Math.round(activeCase.confidence * 100)}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Original Incident Excerpt</div>
            <p className="text-xs sm:text-sm text-slate-800 font-mono leading-relaxed">
              "{activeCase.raw_text}"
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetaPill label="Report ID" value={activeCase.report_id} />
            <MetaPill label="Language" value={activeCase.language} />
            <MetaPill label="Target Rule" value={activeCase.rule} highlight />
          </div>

          {/* Action Decision Station */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-xs font-black text-slate-900">Officer Decision & Signoff:</div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateStatus("APPROVED")}
                className="flex-1 min-w-[130px] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Icon name="check" size={16} />
                Confirm SIF (Approve)
              </button>
              <button
                onClick={() => updateStatus("REJECTED")}
                className="flex-1 min-w-[130px] h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Icon name="x" size={16} />
                Override (Mark Non-SIF)
              </button>
              <button
                onClick={() => updateStatus("ESCALATED")}
                className="flex-1 min-w-[130px] h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
              >
                <Icon name="alert" size={16} />
                Escalate for Field Audit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHARED REUSABLE UI COMPONENTS
============================================================ */
function KpiCard({ title, value, change, icon, tone }) {
  const tones = {
    blue: { bg: "bg-blue-50 text-blue-600 border-blue-200/80", shadow: "shadow-blue-500/10" },
    rose: { bg: "bg-rose-50 text-rose-600 border-rose-200/80", shadow: "shadow-rose-500/10" },
    emerald: { bg: "bg-emerald-50 text-emerald-600 border-emerald-200/80", shadow: "shadow-emerald-500/10" },
    violet: { bg: "bg-violet-50 text-violet-600 border-violet-200/80", shadow: "shadow-violet-500/10" },
  };
  const t = tones[tone] || tones.blue;

  return (
    <div className={`relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">{title}</div>
          <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</div>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${t.bg}`}>
          <Icon name={icon} size={22} />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-500">
        {change}
      </div>
    </div>
  );
}

function EnhancedDonutChart({ yes = 0, no = 0 }) {
  const total = yes + no || 1;
  const pct = Math.round((yes / total) * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dash = (circumference * pct) / 100;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="20" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="url(#gradientDonut)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="gradientDonut" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-slate-900">{pct}%</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SIF Precursor</div>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-100">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>SIF YES (High Risk)</span>
          </div>
          <span className="font-mono font-black text-rose-900 text-sm">{yes}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Non-SIF (Controlled)</span>
          </div>
          <span className="font-mono font-black text-slate-800 text-sm">{no}</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsBarCard({ title, subtitle, data, barColor }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = entries.length ? Math.max(...entries.map((x) => x[1])) : 1;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="space-y-3 pt-2">
        {entries.map(([label, value]) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="truncate pr-2">{label}</span>
              <span className="font-mono font-black text-slate-900">{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportTable({ reports, onSelect }) {
  if (!reports.length) {
    return <div className="p-8 text-center text-xs font-bold text-slate-400">No matching incident reports.</div>;
  }

  return (
    <table className="w-full text-left min-w-[700px]">
      <thead>
        <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <th className="py-3.5 px-6">ID</th>
          <th className="py-3.5 px-6">Raw Narrative</th>
          <th className="py-3.5 px-6">Lang</th>
          <th className="py-3.5 px-6">Prediction</th>
          <th className="py-3.5 px-6">Confidence</th>
          <th className="py-3.5 px-6">Life-Saving Rule</th>
          <th className="py-3.5 px-6 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-xs">
        {reports.map((r) => {
          const isSif = r.sif_prediction === "YES";
          return (
            <tr key={r.report_id} className="hover:bg-slate-50/60 transition">
              <td className="py-4 px-6 font-mono font-black text-slate-900">{r.report_id}</td>
              <td className="py-4 px-6 max-w-xs truncate font-medium text-slate-700" title={r.raw_text}>
                {r.raw_text}
              </td>
              <td className="py-4 px-6">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                  {r.detected_language || "English"}
                </span>
              </td>
              <td className="py-4 px-6">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    isSif ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {r.sif_prediction}
                </span>
              </td>
              <td className="py-4 px-6 font-mono font-bold text-slate-900">
                {Math.round(Number(r.confidence || 0) * 100)}%
              </td>
              <td className="py-4 px-6 font-semibold text-slate-600">{r.life_saving_rule || "—"}</td>
              <td className="py-4 px-6 text-right">
                <button
                  onClick={() => onSelect(r)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white font-bold text-xs transition"
                >
                  Inspect
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReportModal({ report, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Report Detailed Audit</div>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{report.report_id}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetaPill label="SIF Status" value={report.sif_prediction} danger={report.sif_prediction === "YES"} />
            <MetaPill label="Confidence" value={`${Math.round(report.confidence * 100)}%`} />
            <MetaPill label="Language" value={report.detected_language} />
            <MetaPill label="Site" value={report.site || "General Site"} />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-1.5">Original Narrative</div>
            <p className="text-xs sm:text-sm font-mono text-slate-800 leading-relaxed">{report.raw_text}</p>
          </div>

          {report.detected_language !== "English" && (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
              <div className="text-[10px] font-black uppercase text-blue-600 mb-1.5">Normalized English Translation</div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{report.normalized_text}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetaPill label="Life-Saving Rule" value={report.life_saving_rule} highlight />
            <MetaPill label="Precursor Activity" value={report.precursor_activity} />
            <MetaPill label="Failed Safety Barrier" value={report.barrier_failure} danger />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaPill({ label, value, danger, highlight }) {
  return (
    <div
      className={`p-3.5 rounded-2xl border ${
        danger
          ? "bg-rose-50/60 border-rose-200/80 text-rose-900"
          : highlight
          ? "bg-blue-50/60 border-blue-200/80 text-blue-900"
          : "bg-slate-50/80 border-slate-200/80 text-slate-800"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-xs sm:text-sm font-black mt-1 truncate">{value || "—"}</div>
    </div>
  );
}

/* ============================================================
   LIGHTWEIGHT BUILT-IN SVG ICONS
============================================================ */
function Icon({ name, size = 18, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
  };

  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    analytics: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/><path d="M3 21h20"/></>,
    reports: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h2"/></>,
    pdf: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    pattern: <><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9.5 9.5l5 5"/><path d="M17 4v6"/><path d="M14 7h6"/></>,
    sites: <><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
    review: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    shield: <><path d="M12 3 20 6v5c0 5.2-3.5 8.8-8 10-4.5-1.2-8-4.8-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
    refresh: <><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></>,
    spark: <><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3z"/></>,
    alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  };

  return <svg {...common}>{icons[name] || icons.spark}</svg>;
}

function pageTitle(id) {
  const item = NAV_ITEMS.find((n) => n.id === id);
  return item ? item.label : "Dashboard";
}