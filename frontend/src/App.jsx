import { useEffect, useMemo, useState, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://sif-sanket-2.onrender.com").replace(/\/$/, "");

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "analytics", label: "Analytics & Charts", icon: "analytics" },
  { id: "copilot", label: "Sanket AI Copilot", icon: "bot", badge: "AI BOT" },
  { id: "reports", label: "Safety Reports", icon: "reports" },
  { id: "pdf", label: "Document Intelligence", icon: "pdf" },
  { id: "precursor", label: "Precursor Patterns", icon: "pattern" },
  { id: "sites", label: "Site Insights", icon: "sites" },
  { id: "hse-review", label: "HSE Review", icon: "review" },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadReports();
  }, []);

  async function loadDashboard() {
    setLoadingStats(true);

    try {
      const response = await fetch(`${API_BASE}/dashboard/stats`);

      if (!response.ok) {
        throw new Error("Dashboard API failed");
      }

      const data = await response.json();

      setStats(data);
      setApiOnline(true);
    } catch (error) {
      console.error(error);
      setApiOnline(false);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadReports() {
    setLoadingReports(true);

    try {
      const response = await fetch(`${API_BASE}/reports`);

      if (!response.ok) {
        throw new Error("Reports API failed");
      }

      const data = await response.json();

      setReports(Array.isArray(data?.value) ? data.value : []);
      setApiOnline(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReports(false);
    }
  }

  async function refreshEverything() {
    await Promise.all([
      loadDashboard(),
      loadReports(),
    ]);
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">

      {/* subtle workspace background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.05),transparent_28%)]" />

      <div className="flex min-h-screen">

        {/* =====================================================
            PROFESSIONAL SIDEBAR
        ===================================================== */}

        <aside className="hidden lg:flex w-[304px] shrink-0 bg-[#050b16] text-white flex-col border-r border-white/5 shadow-2xl">

          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Icon name="shield" size={23} />
                <span className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#06111f]" />
              </div>
              <div>
                <div className="text-[19px] font-black tracking-tight">SIF-Sanket</div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-500 font-bold mt-0.5">Safety Intelligence</div>
              </div>
            </div>
          </div>

          <div className="mx-5 border-t border-white/10" />

          <div className="px-4 py-5 flex-1 overflow-y-auto">
            <div className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Command Center</div>

            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`group relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                    activePage === item.id
                      ? "bg-blue-600/95 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                  }`}
                >
                  {activePage === item.id && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-cyan-300" />
                  )}
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${activePage === item.id ? "bg-white/10" : "bg-white/[0.035] group-hover:bg-white/[0.07]"}`}>
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {item.id === "pdf" && (
                    <span className="ml-auto rounded-md bg-cyan-400/10 border border-cyan-300/10 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-cyan-300">AI</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-7 px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Platform</div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.6)]" : "bg-red-400"}`} />
                <span className="text-xs font-bold text-slate-300">{apiOnline ? "API Online" : "API Offline"}</span>
              </div>
              <div className="mt-2 text-[10px] leading-4 text-slate-600">FastAPI · AI Engine · TiDB Cloud</div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-400/5 border border-white/8 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-black text-slate-500">Environment</span>
                <span className="text-[9px] font-black rounded-full px-2 py-1 bg-emerald-400/10 text-emerald-300 border border-emerald-300/10">LIVE</span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-300">Safety Intelligence</div>
            </div>
          </div>

        </aside>


        {/* =====================================================
            MAIN AREA
        ===================================================== */}

        <main className="flex-1 min-w-0">

          <header className="sticky top-0 z-30 h-[84px] bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
            <div className="h-full px-4 sm:px-7 xl:px-10 flex items-center justify-between gap-4">

              <div className="flex items-center gap-3 min-w-0">
                <div className="lg:hidden w-10 h-10 shrink-0 rounded-xl bg-[#06111f] text-white flex items-center justify-center">
                  <Icon name="shield" size={18} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-black text-slate-400">
                    <span>Safety Intelligence</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-blue-600">{pageTitle(activePage)}</span>
                  </div>
                  <h1 className="mt-1 text-lg sm:text-xl font-black tracking-tight truncate">{pageTitle(activePage)}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="text-[11px] font-bold text-slate-600">{apiOnline ? "System operational" : "Backend offline"}</span>
                </div>

                <button
                  onClick={refreshEverything}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <Icon name="refresh" size={15} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                  <Icon name="spark" size={17} />
                </div>
              </div>

            </div>
          </header>


          {/* MOBILE NAV */}
          <div className="lg:hidden bg-white/90 backdrop-blur-xl border-b border-slate-200 px-3 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition ${activePage === item.id ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  <Icon name={item.icon} size={14} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>


          {/* PAGE CONTENT */}

          <div className="p-4 sm:p-6 xl:p-9 max-w-[1720px] mx-auto">



            {activePage === "dashboard" && (
              <DashboardPage
                stats={stats}
                reports={reports}
                loading={loadingStats}
                onOpenReports={() => setActivePage("reports")}
                onOpenAnalytics={() => setActivePage("analytics")}
              />
            )}

            {activePage === "analytics" && (
              <AnalyticsPage
                stats={stats}
                loading={loadingStats}
              />
            )}

            {activePage === "reports" && (
              <ReportsPage
                reports={reports}
                loading={loadingReports}
                refresh={loadReports}
              />
            )}

            {activePage === "pdf" && (
              <PdfAnalyzerPage
                refresh={refreshEverything}
              />
            )}

            {activePage === "copilot" && (
              <SafetyAssistantPage
                stats={stats}
                apiOnline={apiOnline}
                onOpenReports={() => setActivePage("reports")}
              />
            )}

            {activePage === "precursor" && (
              <PrecursorPatternsPage />
            )}

            {activePage === "sites" && (
              <SiteInsightsPage />
            )}

            {activePage === "hse-review" && (
              <HSEReviewPage />
            )}

          </div>

        </main>

      </div>

      {/* FLOATING SANKET AI COPILOT BOT */}
      <FloatingSafetyBot
        apiOnline={apiOnline}
        stats={stats}
      />

    </div>
  );
}


/* ============================================================
   DASHBOARD
============================================================ */

function DashboardPage({
  stats,
  reports,
  loading,
  onOpenReports,
  onOpenAnalytics,
}) {
  const total = stats?.total_reports || 0;
  const sifYes = stats?.sif_yes || 0;
  const highConfidence = stats?.high_confidence_sif || 0;

  const sifRate = total
    ? Math.round((sifYes / total) * 100)
    : 0;

  return (
    <div className="space-y-7">

      {/* HERO */}

      <section className="rounded-[28px] bg-[#07111f] text-white p-6 sm:p-8 xl:p-10 overflow-hidden relative">

        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute right-20 bottom-[-180px] w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              AI Safety Intelligence Platform
            </div>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-black uppercase tracking-wider text-blue-300">
              Live Safety Intelligence
            </div>
          </div>

          <h2 className="mt-5 text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight max-w-3xl">

            Safety reports.
            <br />

            <span className="text-blue-400">
              Intelligent analysis.
            </span>

          </h2>

          <p className="mt-4 text-slate-400 max-w-2xl leading-7">

            Monitor Significant Incident Frequency precursors,
            analyze multilingual safety reports and identify
            critical safety-control failures.

          </p>

          <div className="mt-7 flex flex-wrap gap-3">

            <button
              onClick={onOpenReports}
              className="px-5 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition"
            >
              View Reports →
            </button>

            <button
              onClick={onOpenAnalytics}
              className="px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm hover:bg-white/15 transition"
            >
              Open Analytics
            </button>

          </div>

        </div>

      </section>


      {/* KPI CARDS */}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <StatCard
          title="Total Reports"
          value={loading ? "—" : total}
          description="Reports analyzed"
          icon="▤"
          tone="blue"
        />

        <StatCard
          title="SIF Precursors"
          value={loading ? "—" : sifYes}
          description="Predicted YES"
          icon="!"
          tone="red"
        />

        <StatCard
          title="High Confidence"
          value={loading ? "—" : highConfidence}
          description="Confidence ≥ 90%"
          icon="✓"
          tone="emerald"
        />

        <StatCard
          title="SIF Rate"
          value={loading ? "—" : `${sifRate}%`}
          description="Across all reports"
          icon="%"
          tone="violet"
        />

      </section>


      {/* MIDDLE */}

      <section className="grid xl:grid-cols-[1.45fr_0.75fr] gap-5">

        <Card>

          <CardHeader
            title="SIF Detection Overview"
            subtitle="Current report classification"
          />

          <div className="p-6">

            <DonutChart
              yes={sifYes}
              no={stats?.sif_no || 0}
            />

          </div>

        </Card>


        <Card>

          <CardHeader
            title="System Summary"
            subtitle="Live database snapshot"
          />

          <div className="p-6 space-y-5">

            <SummaryRow
              label="Total reports"
              value={total}
            />

            <SummaryRow
              label="SIF detected"
              value={sifYes}
            />

            <SummaryRow
              label="Non-SIF"
              value={stats?.sif_no || 0}
            />

            <SummaryRow
              label="High confidence"
              value={highConfidence}
            />

            <div className="pt-3 border-t border-slate-100">

              <div className="text-xs font-semibold text-slate-400">
                SIF detection rate
              </div>

              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">

                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${sifRate}%` }}
                />

              </div>

              <div className="mt-2 text-right text-sm font-black">
                {sifRate}%
              </div>

            </div>

          </div>

        </Card>

      </section>


      {/* LOWER */}

      <section className="grid xl:grid-cols-2 gap-5">

        <DistributionCard
          title="Life-Saving Rules"
          data={stats?.life_saving_rules}
        />

        <DistributionCard
          title="Precursor Activities"
          data={stats?.precursor_activities}
        />

      </section>


      {/* MULTI-PERIOD SIF PRECURSOR TREND GRAPH */}
      <section>
        <ModernTrendAreaCard />
      </section>


      {/* RECENT REPORTS */}

      <Card>

        <CardHeader
          title="Recent Reports"
          subtitle="Latest safety intelligence"
          action={
            <button
              onClick={onOpenReports}
              className="text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              View all →
            </button>
          }
        />

        <div className="overflow-x-auto">

          <ReportTable
            reports={reports.slice(0, 6)}
          />

        </div>

      </Card>

    </div>
  );
}


/* ============================================================
   ANALYTICS
============================================================ */

function AnalyticsPage({ stats, loading }) {
  return (
    <div className="space-y-6">

      <div>

        <div className="text-sm font-semibold text-blue-600">
          ANALYTICS CENTER
        </div>

        <h2 className="mt-1 text-3xl font-black tracking-tight">
          Safety intelligence
        </h2>

        <p className="mt-2 text-slate-500">
          Explore patterns across your analyzed safety reports.
        </p>

      </div>


      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <StatCard
          title="Reports"
          value={loading ? "—" : stats?.total_reports || 0}
          description="Total analyzed"
          icon="▤"
          tone="blue"
        />

        <StatCard
          title="SIF"
          value={loading ? "—" : stats?.sif_yes || 0}
          description="Positive predictions"
          icon="!"
          tone="red"
        />

        <StatCard
          title="Rules"
          value={
            loading
              ? "—"
              : Object.keys(stats?.life_saving_rules || {}).length
          }
          description="Safety rule categories"
          icon="◆"
          tone="violet"
        />

        <StatCard
          title="Activities"
          value={
            loading
              ? "—"
              : Object.keys(stats?.precursor_activities || {}).length
          }
          description="Detected activity types"
          icon="◈"
          tone="emerald"
        />

      </section>


      <section className="grid xl:grid-cols-2 gap-5">

        <BarChartCard
          title="Life-Saving Rules"
          data={stats?.life_saving_rules}
          tone="blue"
          subtitle="Frequency of violated safety rules"
        />

        <BarChartCard
          title="Precursor Activities"
          data={stats?.precursor_activities}
          tone="violet"
          subtitle="Activities linked to SIF precursors"
        />

        <BarChartCard
          title="Precursor Locations"
          data={stats?.precursor_locations}
          tone="emerald"
          subtitle="Facility sites with incident signals"
        />

        <BarChartCard
          title="Barrier Failures"
          data={stats?.barrier_failures}
          tone="amber"
          subtitle="Defense barriers breached or absent"
        />

      </section>

      <section className="mt-5">
        <ModernTrendAreaCard />
      </section>

    </div>
  );
}


/* ============================================================
   REPORTS
============================================================ */

function ReportsPage({
  reports,
  loading,
  refresh,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);

  const filteredReports = useMemo(() => {

    return reports.filter((report) => {

      const matchesFilter =
        filter === "ALL" ||
        report.sif_prediction === filter;

      const query = search.toLowerCase();

      const matchesSearch =
        !query ||
        String(report.report_id || "")
          .toLowerCase()
          .includes(query) ||
        String(report.raw_text || "")
          .toLowerCase()
          .includes(query) ||
        String(report.life_saving_rule || "")
          .toLowerCase()
          .includes(query) ||
        String(report.detected_language || "")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;

    });

  }, [reports, search, filter]);

  return (
    <div className="space-y-6">

      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">

        <div>

          <div className="text-sm font-semibold text-blue-600">
            REPORT CENTER
          </div>

          <h2 className="mt-1 text-3xl font-black tracking-tight">
            Safety reports
          </h2>

          <p className="mt-2 text-slate-500">
            Search, filter and inspect analyzed reports.
          </p>

        </div>

        <button
          onClick={refresh}
          className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
        >
          Refresh reports
        </button>

      </div>


      <Card>

        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-3">

          <div className="relative flex-1">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports, language, rule..."
              className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />

          </div>

          <div className="flex gap-2">

            {["ALL", "YES", "NO"].map((item) => (

              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`
                  px-5 h-12 rounded-xl text-sm font-bold
                  ${
                    filter === item
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }
                `}
              >
                {item === "ALL" ? "All" : `SIF ${item}`}
              </button>

            ))}

          </div>

        </div>


        <div className="overflow-x-auto">

          {loading ? (
            <LoadingTable />
          ) : (
            <ReportTable
              reports={filteredReports}
              onSelect={setSelectedReport}
            />
          )}

        </div>

      </Card>


      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

    </div>
  );
}


/* ============================================================
   PDF ANALYZER
============================================================ */

function PdfAnalyzerPage({ refresh }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("Near Miss");
  const [site, setSite] = useState("");
  const [reportText, setReportText] = useState("");

  const [loadingWrite, setLoadingWrite] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const supported = [
    { ext: "PDF", label: "PDF", tone: "bg-red-50 text-red-600 border-red-100" },
    { ext: "CSV", label: "CSV", tone: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { ext: "XLSX", label: "Excel", tone: "bg-green-50 text-green-600 border-green-100" },
    { ext: "XLS", label: "Excel", tone: "bg-green-50 text-green-600 border-green-100" },
    { ext: "DOCX", label: "Word", tone: "bg-blue-50 text-blue-600 border-blue-100" },
    { ext: "JSON", label: "JSON", tone: "bg-amber-50 text-amber-600 border-amber-100" },
    { ext: "TXT", label: "Text", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  ];

  const extension = file?.name?.split(".").pop()?.toLowerCase();

  async function analyzeWrittenReport() {
    if (!reportText.trim()) {
      setError("Write the safety report before starting AI analysis.");
      return;
    }

    setLoadingWrite(true);
    setError("");
    setResult(null);

    try {
      const analysisText = [
        reportTitle.trim() ? `Report Title: ${reportTitle.trim()}` : "",
        reportType ? `Report Type: ${reportType}` : "",
        site.trim() ? `Site / Location: ${site.trim()}` : "",
        "",
        reportText.trim(),
      ].filter((line, index, arr) => !(line === "" && index === arr.length - 1)).join("\n");

      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_text: analysisText,
          site: site.trim(),
          report_title: reportTitle.trim(),
          report_type: reportType,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || "Safety report analysis failed.");
      }

      setResult(data);
      await refresh();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to analyze the written report.");
    } finally {
      setLoadingWrite(false);
    }
  }

  async function analyzeDocument() {
    if (!file) {
      setError("Please select a safety document first.");
      return;
    }

    setLoadingFile(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = extension === "pdf" ? "/analyze-pdf" : "/analyze-document";

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || `Analysis failed for ${extension?.toUpperCase() || "file"}.`);
      }

      setResult(data);
      await refresh();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to analyze the document.");
    } finally {
      setLoadingFile(false);
    }
  }

  function acceptFile(candidate) {
    if (!candidate) return;

    const allowed = ["pdf", "csv", "xlsx", "xls", "docx", "json", "txt"];
    const ext = candidate.name.split(".").pop()?.toLowerCase();

    if (!allowed.includes(ext)) {
      setError("Unsupported file. Use PDF, CSV, XLSX, XLS, DOCX, JSON or TXT.");
      return;
    }

    setFile(candidate);
    setError("");
    setResult(null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function clearWrittenReport() {
    setReportTitle("");
    setReportType("Near Miss");
    setSite("");
    setReportText("");
    setError("");
    setResult(null);
  }

  const wordCount = reportText.trim()
    ? reportText.trim().split(/\s+/).length
    : 0;

  return (
    <div className="space-y-7">

      {/* =====================================================
          PAGE HERO
      ===================================================== */}

      <section className="relative overflow-hidden rounded-[32px] bg-[#06111f] p-7 sm:p-9 xl:p-10 text-white shadow-[0_24px_70px_rgba(7,17,31,.20)]">
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-1/3 -bottom-44 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute left-1/3 top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-7">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" />
              Cognitive Safety Intelligence Engine
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl xl:text-[44px] font-black tracking-tight leading-tight">
              Write, Upload & Analyze
              <span className="block text-cyan-300">Safety Intelligence</span>
            </h2>

            <p className="mt-4 max-w-3xl text-sm sm:text-base leading-7 text-slate-300">
              Create an HSE report directly in the application or upload an existing safety document.
              The same AI pipeline analyzes both inputs for SIF potential, Life-Saving Rules and precursor barriers.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              ["AI", "XLM-R"],
              ["NLP", "Multilingual"],
              ["DB", "PostgreSQL"],
            ].map(([a, b]) => (
              <div
                key={a}
                className="min-w-[92px] rounded-2xl border border-white/10 bg-white/[.05] px-3 py-3 text-center backdrop-blur"
              >
                <div className="text-[10px] font-black text-cyan-200">{a}</div>
                <div className="mt-1 text-[10px] font-bold text-slate-400">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* =====================================================
          WRITE + UPLOAD — SAME PAGE
      ===================================================== */}

      <section className="grid gap-6 xl:grid-cols-2">

        {/* WRITE REPORT */}

        <Card>
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-white px-6 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-blue-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Icon name="reports" size={14} />
                  </span>
                  Report Composer
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  Write Safety Report
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Write the incident, near-miss or unsafe-condition report directly here.
                </p>
              </div>

              <span className="hidden sm:inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[9px] font-black text-blue-600">
                TEXT → AI
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7">

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
                  Report Title
                </label>
                <input
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Confined Space Entry Incident"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option>Near Miss</option>
                  <option>Unsafe Act</option>
                  <option>Unsafe Condition</option>
                  <option>Incident</option>
                  <option>Safety Observation</option>
                  <option>Inspection Finding</option>
                  <option>Other</option>
                </select>
              </div>

            </div>

            <div className="mt-4">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
                Site / Location
              </label>
              <input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Gas Processing Unit / Tank Farm / Pipeline Area"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
                  Safety Report
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {wordCount} words
                </span>
              </div>

              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={"Write the complete safety report here...\n\nExample:\nThe worker entered the confined space without gas testing and without a valid entry permit. Atmospheric testing was not completed before entry."}
                className="min-h-[280px] w-full resize-y rounded-[20px] border border-slate-200 bg-slate-50/60 px-5 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["LANG", "Detect"],
                ["EN", "Normalize"],
                ["AI", "Analyze"],
              ].map(([a, b]) => (
                <div
                  key={a}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-3 text-center"
                >
                  <div className="text-[9px] font-black text-blue-600">{a}</div>
                  <div className="mt-1 text-[9px] font-bold text-slate-400">{b}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={clearWrittenReport}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 transition"
              >
                Clear
              </button>

              <button
                onClick={analyzeWrittenReport}
                disabled={!reportText.trim() || loadingWrite}
                className="flex-1 inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none transition"
              >
                <Icon name="spark" size={16} />
                {loadingWrite ? "Analyzing Report..." : "Analyze Written Report"}
              </button>
            </div>

          </div>
        </Card>


        {/* UPLOAD DOCUMENT */}

        <Card>
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/60 via-white to-white px-6 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
                    <Icon name="upload" size={14} />
                  </span>
                  Document Ingestion
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  Upload Safety Document
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Upload an existing report and send it through the same AI analysis pipeline.
                </p>
              </div>

              <span className="hidden sm:inline-flex rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[9px] font-black text-violet-600">
                FILE → AI
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7">

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative min-h-[335px] rounded-[26px] border-2 border-dashed flex flex-col items-center justify-center text-center p-8 transition-all ${
                dragging
                  ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
                  : "border-slate-200 bg-gradient-to-b from-slate-50 to-white hover:border-violet-300 hover:bg-violet-50/20"
              }`}
            >
              <div className="absolute top-4 right-4 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[9px] font-black text-emerald-600">
                MULTI-FORMAT
              </div>

              <div className="h-20 w-20 rounded-[24px] bg-gradient-to-br from-violet-600 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-violet-500/20">
                <Icon name="upload" size={30} />
              </div>

              <h4 className="mt-5 text-xl font-black text-slate-900">
                Drop your safety document
              </h4>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Drag and drop a file here or browse from your computer. Original content is preserved for traceability.
              </p>

              <label className="mt-5 cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-violet-600 transition">
                  <Icon name="folder" size={16} />
                  Browse Files
                </span>

                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.docx,.json,.txt,application/pdf,text/csv,application/json,text/plain"
                  className="hidden"
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                />
              </label>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {supported.map((item) => (
                  <span
                    key={item.ext}
                    className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black ${item.tone}`}
                  >
                    {item.ext}
                  </span>
                ))}
              </div>
            </div>

            {file && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-xs font-black text-blue-600">
                    {extension?.toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-800">
                      {file.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Ready for analysis
                    </div>
                  </div>

                  <button
                    onClick={() => setFile(null)}
                    className="rounded-lg px-3 py-2 text-xs font-black text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={analyzeDocument}
              disabled={!file || loadingFile}
              className="mt-5 w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black shadow-lg shadow-violet-600/20 hover:from-violet-700 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
            >
              {loadingFile ? "Running AI Analysis..." : "Execute Document Analysis"}
            </button>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">
                Supported formats
              </div>
              <div className="mt-2 text-xs font-bold leading-6 text-slate-600">
                PDF · CSV · XLSX · XLS · DOCX · JSON · TXT
              </div>
            </div>

          </div>
        </Card>

      </section>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-600 shadow-sm">
          {error}
        </div>
      )}


      {/* =====================================================
          RESULT — SAME PAGE
      ===================================================== */}

      <Card>
        <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                Inference Findings
              </div>
              <h3 className="mt-1 text-xl font-black">
                Safety Intelligence Result
              </h3>
            </div>

            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[9px] font-black text-blue-600">
              XLM-R AI
            </span>
          </div>
        </div>

        {!result ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
            <div className="relative h-20 w-20 rounded-[24px] bg-slate-100 flex items-center justify-center text-slate-400">
              <div className="absolute inset-0 rounded-[24px] border border-slate-200" />
              <Icon name="shield" size={30} />
            </div>

            <h4 className="mt-5 text-xl font-black">
              Ready for analysis
            </h4>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Write a safety report on the left or upload a document above.
              The analysis result will appear here with SIF prediction, confidence,
              Life-Saving Rule and precursor intelligence.
            </p>

            <div className="mt-6 grid w-full max-w-2xl grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ["SIF", "Prediction"],
                ["LSR", "Rule Mapping"],
                ["BARRIER", "Failure Analysis"],
              ].map(([a, b]) => (
                <div
                  key={a}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center"
                >
                  <div className="text-[10px] font-black text-slate-400">
                    {a}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-300">
                    {b}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <PdfResult result={result} />
        )}
      </Card>

    </div>
  );
}

/* ============================================================
   PDF RESULT
============================================================ */

function PdfResult({ result }) {

  const confidence = Math.round(
    Number(result.confidence || 0) * 100
  );

  const isSif =
    result.sif_prediction === "YES";

  return (
    <div className="p-6 space-y-5">

      {/* STATUS */}

      <div
        className={`
          rounded-2xl p-5 border
          ${
            isSif
              ? "bg-red-50 border-red-100"
              : "bg-emerald-50 border-emerald-100"
          }
        `}
      >

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              SIF Prediction
            </div>

            <div
              className={`
                mt-1 text-3xl font-black
                ${
                  isSif
                    ? "text-red-600"
                    : "text-emerald-600"
                }
              `}
            >
              {result.sif_prediction || "N/A"}
            </div>

          </div>

          <div className="text-left sm:text-right">

            <div className="text-xs font-bold text-slate-500">
              Confidence
            </div>

            <div className="text-2xl font-black">
              {confidence}%
            </div>

          </div>

        </div>

        <div className="mt-4 h-2 rounded-full bg-white overflow-hidden">

          <div
            className={`h-full ${
              isSif
                ? "bg-red-500"
                : "bg-emerald-500"
            }`}
            style={{
              width: `${confidence}%`,
            }}
          />

        </div>

      </div>


      {/* METADATA */}

      <div className="grid sm:grid-cols-2 gap-3">

        <InfoBox
          label="Report ID"
          value={result.report_id}
        />

        <InfoBox
          label="Detected Language"
          value={result.detected_language}
        />

        <InfoBox
          label="Life-Saving Rule"
          value={result.life_saving_rule}
        />

        <InfoBox
          label="Precursor Activity"
          value={result.precursor_activity}
        />

        <InfoBox
          label="Precursor Location"
          value={result.precursor_location}
        />

        <InfoBox
          label="Barrier Failure"
          value={result.barrier_failure}
        />

      </div>


      {/* ORIGINAL */}

      <TextPanel
        title="Original Report"
        badge={result.detected_language}
        text={result.raw_text}
      />


      {/* TRANSLATED */}

      <TextPanel
        title="English Normalized Report"
        badge="English"
        text={result.normalized_text}
      />

    </div>
  );
}


/* ============================================================
   COMPONENTS
============================================================ */

function StatCard({
  title,
  value,
  description,
  icon,
  tone,
}) {

  const tones = {
    blue: { box: "bg-blue-50 text-blue-600 border-blue-100", glow: "from-blue-500/10" },
    red: { box: "bg-red-50 text-red-600 border-red-100", glow: "from-red-500/10" },
    emerald: { box: "bg-emerald-50 text-emerald-600 border-emerald-100", glow: "from-emerald-500/10" },
    violet: { box: "bg-violet-50 text-violet-600 border-violet-100", glow: "from-violet-500/10" },
  };

  const style = tones[tone] || tones.blue;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(15,23,42,0.08)]`}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${style.glow} to-transparent blur-2xl`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{description}</div>
        </div>
        <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center ${style.box}`}>
          {typeof icon === "string" && NAV_ITEMS.some((x) => x.icon === icon) ? <Icon name={icon} size={18} /> : <span className="text-lg font-black">{icon}</span>}
        </div>
      </div>
    </div>
  );
}


function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-[26px] shadow-[0_12px_40px_rgba(15,23,42,0.055)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}) {

  return (
    <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/60 flex items-center justify-between gap-4">

      <div>

        <h3 className="font-black text-slate-900">
          {title}
        </h3>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>
        )}

      </div>

      {action}

    </div>
  );
}


function SummaryRow({
  label,
  value,
}) {

  return (
    <div className="flex items-center justify-between">

      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="font-black text-slate-900">
        {value}
      </span>

    </div>
  );
}


/* ============================================================
   INTERACTIVE RECHARTS DONUT & DISTRIBUTION
============================================================ */

function DonutChart({
  yes = 0,
  no = 0,
}) {
  const total = yes + no;
  const percentage = total ? Math.round((yes / total) * 100) : 0;

  const data = [
    { name: "SIF Precursor (High Risk)", value: yes || 0, color: "#ef4444" },
    { name: "Non-SIF (Controlled)", value: no || 0, color: "#10b981" },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
      <div className="relative w-full max-w-[240px] h-[220px] mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={4}
              dataKey="value"
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  return (
                    <div className="rounded-xl bg-slate-900/95 text-white p-3 text-xs shadow-xl border border-white/10 backdrop-blur-md">
                      <div className="font-bold">{item.name}</div>
                      <div className="mt-1 text-slate-300">
                        Incidents: <span className="font-bold text-white">{item.value}</span> ({total ? Math.round((item.value / total) * 100) : 0}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{percentage}%</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SIF Rate</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-3.5">
        <div className="p-3.5 rounded-2xl border border-red-100 bg-red-50/60 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 shadow-xs shadow-red-500/50" />
              <span className="text-xs font-black text-slate-800">SIF Potential Incidents</span>
            </div>
            <span className="text-xs font-black text-red-600 bg-white px-2.5 py-1 rounded-lg border border-red-200">
              {yes} reports
            </span>
          </div>
          <div className="mt-2.5 h-2 rounded-full bg-white overflow-hidden border border-red-200/50">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 hover-lift">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
              <span className="text-xs font-black text-slate-800">Non-SIF Controlled</span>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
              {no} reports
            </span>
          </div>
          <div className="mt-2.5 h-2 rounded-full bg-white overflow-hidden border border-emerald-200/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${total ? Math.round((no / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


function LegendRow({
  label,
  value,
  percentage,
  dot,
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className="text-sm font-semibold text-slate-600">{label}</span>
        </div>
        <span className="text-sm font-black">{value}</span>
      </div>
      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${dot}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}


/* ============================================================
   DISTRIBUTION CARD (WITH ANIMATION)
============================================================ */

function DistributionCard({
  title,
  data,
}) {
  const entries = Object.entries(data || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <Card className="hover-lift">
      <CardHeader
        title={title}
        subtitle="Most frequently detected categories"
      />
      <div className="p-6">
        {entries.length === 0 ? (
          <EmptyState text="No data recorded yet." />
        ) : (
          <div className="space-y-4">
            {entries.map(([label, value]) => {
              const max = Math.max(...entries.map((item) => item[1])) || 1;
              const width = (value / max) * 100;
              return (
                <div key={label} className="group">
                  <div className="flex justify-between gap-4 text-xs font-bold">
                    <span className="text-slate-700 truncate max-w-[80%] group-hover:text-blue-600 transition">
                      {label}
                    </span>
                    <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {value}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-700"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}


/* ============================================================
   INTERACTIVE RECHARTS BAR CHART CARD (GRAPH / LIST VIEW)
============================================================ */

function BarChartCard({
  title,
  data,
  tone = "blue",
  subtitle = "Distribution breakdown",
}) {
  const [viewMode, setViewMode] = useState("chart");

  const entries = useMemo(() => {
    return Object.entries(data || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 18) + "…" : name,
        fullName: name,
        value: Number(value),
      }));
  }, [data]);

  const toneGradients = {
    blue: { fill: "#3b82f6", stroke: "#2563eb", grad1: "#60a5fa", grad2: "#2563eb" },
    emerald: { fill: "#10b981", stroke: "#059669", grad1: "#34d399", grad2: "#059669" },
    violet: { fill: "#8b5cf6", stroke: "#7c3aed", grad1: "#a78bfa", grad2: "#7c3aed" },
    amber: { fill: "#f59e0b", stroke: "#d97706", grad1: "#fbbf24", grad2: "#d97706" },
  };

  const currentTone = toneGradients[tone] || toneGradients.blue;

  return (
    <Card className="hover-lift">
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("chart")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                viewMode === "chart"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              List
            </button>
          </div>
        }
      />

      <div className="p-6">
        {entries.length === 0 ? (
          <EmptyState text="No precursor data recorded yet." />
        ) : viewMode === "chart" ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entries} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <defs>
                  <linearGradient id={`barGrad-${title.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={currentTone.grad1} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={currentTone.grad2} stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={45}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-slate-900 text-white p-3 text-xs shadow-xl border border-white/10 backdrop-blur-md">
                          <div className="font-bold text-cyan-300">{item.fullName}</div>
                          <div className="mt-1 text-slate-300">
                            Occurrences: <span className="font-black text-white">{item.value}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="value"
                  fill={`url(#barGrad-${title.replace(/[^a-zA-Z0-9]/g, "")})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="space-y-3.5">
            {entries.map((item, idx) => {
              const maxVal = entries[0]?.value || 1;
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={idx} className="group">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-bold text-slate-700 truncate max-w-[75%]">{item.fullName}</span>
                    <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: currentTone.fill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}


/* ============================================================
   INTERACTIVE RECHARTS SIF TREND AREA CHART
============================================================ */

function ModernTrendAreaCard() {
  const trendData = [
    { period: "Period 1", total: 8, sif: 2 },
    { period: "Period 2", total: 14, sif: 4 },
    { period: "Period 3", total: 11, sif: 3 },
    { period: "Period 4", total: 19, sif: 7 },
    { period: "Period 5", total: 17, sif: 5 },
    { period: "Period 6", total: 24, sif: 8 },
  ];

  return (
    <Card className="hover-lift">
      <CardHeader
        title="Multi-Period SIF Precursor Trend"
        subtitle="Continuous timeline tracking of safety observations vs SIF precursors"
        action={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" /> Total Reports
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs" /> SIF Precursor
            </span>
          </div>
        }
      />
      <div className="p-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="sifTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl bg-slate-900 text-white p-3 text-xs shadow-xl border border-white/10 backdrop-blur-md">
                        <div className="font-bold text-cyan-300">{label} Safety Overview</div>
                        <div className="mt-1.5 space-y-1">
                          <div className="text-blue-300">
                            Total Reports: <span className="font-bold text-white">{payload[0]?.value}</span>
                          </div>
                          <div className="text-red-300">
                            SIF Precursors: <span className="font-bold text-white">{payload[1]?.value}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#totalTrendGrad)"
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="sif"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#sifTrendGrad)"
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}


/* ============================================================
   MARKDOWN FORMATTER HELPER
============================================================ */

function formatMarkdown(content) {
  if (!content) return "";
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (line.startsWith("• ")) {
      return (
        <div key={idx} className="flex gap-2 pl-2 my-0.5">
          <span className="text-blue-500 font-bold shrink-0">•</span>
          <span>{formattedLine}</span>
        </div>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={idx} className="pl-2 my-0.5 font-medium">
          {formattedLine}
        </div>
      );
    }
    return <div key={idx} className={line === "" ? "h-2" : "my-0.5"}>{formattedLine}</div>;
  });
}


/* ============================================================
   FLOATING SANKET AI ASSISTANT BOT
============================================================ */

function FloatingSafetyBot({ apiOnline, stats }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hello! I am **Sanket AI**, your industrial safety copilot. 🛡️\n\nAsk me anything about **Life-Saving Rules**, **SIF precursors**, **barrier failures**, or **live facility statistics**.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([
    "📊 Live SIF Stats",
    "🛡️ 9 Life-Saving Rules",
    "🕳️ Confined Space Protocol",
    "⚡ Energy Isolation (LOTO)",
    "🧗 Working at Height",
    "📝 How to Submit Report",
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  async function sendMessage(text) {
    const queryText = (text || input).trim();
    if (!queryText || loading) return;

    const userMsg = {
      role: "user",
      content: queryText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, history: historyPayload }),
      });

      if (!res.ok) throw new Error("Assistant API failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.response || "No response received.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      if (data.quick_replies && Array.isArray(data.quick_replies)) {
        setQuickReplies(data.quick_replies);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "⚠️ *Unable to connect to Sanket AI backend. Please verify FastAPI is running at port 8000.*",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="mb-3 w-[420px] max-w-[92vw] h-[580px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-[#050b16] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Icon name="bot" size={19} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#050b16]" />
              </div>
              <div>
                <div className="text-sm font-black flex items-center gap-2">
                  Sanket AI Copilot
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-blue-500/20 text-cyan-300 font-bold border border-cyan-400/20">
                    Live
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">HSE Safety Assistant · TiDB Cloud</div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={() => setMessages([messages[0]])}
                title="Clear conversation"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition"
              >
                <Icon name="trash" size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white transition"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          {/* Quick chips bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black px-1 shrink-0">Prompts:</span>
            {quickReplies.map((pill, i) => (
              <button
                key={i}
                onClick={() => sendMessage(pill)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition shadow-2xs font-semibold text-xs"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-500/20">
                    <Icon name="spark" size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-xs font-medium"
                      : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{formatMarkdown(msg.content)}</div>
                  <div className={`mt-1 text-[9px] text-right ${msg.role === "user" ? "text-blue-200" : "text-slate-400"}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Icon name="spark" size={13} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse delay-150" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-300" />
                  <span className="ml-1 text-[11px] font-semibold text-slate-500">Sanket AI is reasoning...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-slate-200/90">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Sanket AI anything (English/हिंदी)..."
                className="flex-1 bg-transparent py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
              >
                <Icon name="send" size={14} />
              </button>
            </div>
            <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Enter to send · Supports Hindi & English</span>
              <span>TiDB Cloud Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating launcher button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-sm shadow-xl shadow-blue-600/35 hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse-glow"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300" />
        </span>
        <Icon name="bot" size={20} />
        <span>Ask Sanket AI</span>
      </button>
    </div>
  );
}


/* ============================================================
   DEDICATED FULL-SCREEN SAFETY COPILOT PAGE
============================================================ */

function SafetyAssistantPage({ stats, apiOnline, onOpenReports }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Welcome to the **SIF-Sanket AI Safety Copilot Command Center**! 🛡️\n\nI am your real-time industrial safety advisor connected directly to **TiDB Cloud**. Ask me any technical question regarding:\n\n• **9 Life-Saving Rules (LSR)** & OSHA/IOGP standards\n• **SIF Precursors** & high-energy barrier mechanics\n• **Live Database Statistics** (rates, high-risk locations, frequency)\n• **Incident Reporting Guidelines** (English, Hindi & Hinglish supported)\n\nSelect a quick prompt below or type your safety query.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState([
    "📊 Live SIF Stats",
    "🛡️ 9 Life-Saving Rules",
    "🕳️ Confined Space Protocol",
    "⚡ Energy Isolation (LOTO)",
    "🧗 Working at Height",
    "📝 How to Submit Report",
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const queryText = (text || input).trim();
    if (!queryText || loading) return;

    const userMsg = {
      role: "user",
      content: queryText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, history: historyPayload }),
      });

      if (!res.ok) throw new Error("Assistant API failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.response || "No response received.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      if (data.quick_replies && Array.isArray(data.quick_replies)) {
        setQuickReplies(data.quick_replies);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "⚠️ *Unable to reach Sanket AI backend. Please verify FastAPI is running at port 8000.*",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const lsrRules = [
    { title: "Confined Space", icon: "🕳️", desc: "Permit & continuous gas testing mandatory" },
    { title: "Energy Isolation", icon: "⚡", desc: "Zero energy LOTO verification before maintenance" },
    { title: "Working at Height", icon: "🧗", desc: "100% tie-off harness above 1.8 meters" },
    { title: "Hot Work", icon: "🔥", desc: "Flammable atmospheric testing & fire watch" },
    { title: "Lifting Operations", icon: "🏗️", desc: "Exclusion zone under suspended loads" },
    { title: "Excavation", icon: "⛏️", desc: "Shoring & underground utility clearance" },
    { title: "Driving Safety", icon: "🚗", desc: "Seatbelt & journey speed compliance" },
    { title: "Line of Fire", icon: "🎯", desc: "Stand clear of stored energy release vectors" },
    { title: "Bypassing Controls", icon: "⛔", desc: "Never bypass safety interlocks without authorization" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Real-Time AI Copilot
          </div>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            Sanket AI Safety Copilot
          </h2>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Autonomous HSE knowledge engine trained on SIF prevention, Life-Saving Rules, and TiDB Cloud intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 shadow-xs flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500" : "bg-red-500"}`} />
            <span>{apiOnline ? "Live Cloud Connected" : "Backend Offline"}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_0.9fr] gap-6 items-start">
        {/* Chat Terminal */}
        <Card className="h-[740px] flex flex-col overflow-hidden shadow-xl border-slate-200/90">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Icon name="bot" size={18} />
              </div>
              <div>
                <div className="text-sm font-black flex items-center gap-2">
                  Sanket AI Intelligence Stream
                </div>
                <div className="text-[10px] text-cyan-300 font-medium">Bilingual HSE Copilot (English / हिंदी)</div>
              </div>
            </div>

            <button
              onClick={() => setMessages([messages[0]])}
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition flex items-center gap-1.5"
            >
              <Icon name="trash" size={13} />
              <span>Clear</span>
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/70 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black shrink-0">Quick Prompts:</span>
            {quickReplies.map((pill, i) => (
              <button
                key={i}
                onClick={() => sendMessage(pill)}
                className="shrink-0 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition shadow-2xs font-semibold text-xs"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/30 to-white">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-500/20">
                    <Icon name="spark" size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-4 text-[13px] leading-relaxed shadow-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-xs font-medium"
                      : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{formatMarkdown(msg.content)}</div>
                  <div className={`mt-2 text-[10px] text-right ${msg.role === "user" ? "text-blue-200" : "text-slate-400"}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Icon name="spark" size={14} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse delay-150" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-300" />
                  <span className="ml-2 text-xs font-semibold text-slate-600">Sanket AI is analyzing safety knowledge...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about safety rules, SIF precursors, barrier failures, statistics... (English / हिंदी)"
                className="flex-1 bg-transparent py-2 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition shadow-md shadow-blue-500/25"
              >
                <Icon name="send" size={16} />
              </button>
            </div>
            <div className="mt-2 px-1 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Press <strong>Enter</strong> to submit · Live queries against TiDB Cloud</span>
              <span>Autonomous SIF Safety AI</span>
            </div>
          </div>
        </Card>

        {/* Right Reference Column */}
        <div className="space-y-6">
          {/* Live Data Card */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider font-black text-cyan-300">Live Safety Intelligence</div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black">TiDB Incident Snapshot</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-bold text-slate-400">Total Analyzed</div>
                <div className="mt-1 text-2xl font-black text-white">{stats?.total_reports || 0}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] font-bold text-slate-400">SIF Precursors</div>
                <div className="mt-1 text-2xl font-black text-red-400">{stats?.sif_yes || 0}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-bold">
              <span>High-Confidence SIF:</span>
              <span className="text-emerald-400">{stats?.high_confidence_sif || 0} cases</span>
            </div>
          </Card>

          {/* 9 Life-Saving Rules Interactive Drawer */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-900 text-base">9 Life-Saving Rules</h4>
                <p className="text-xs text-slate-500 mt-0.5">Click any rule to query Sanket Copilot</p>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">LSR</span>
            </div>

            <div className="mt-4 space-y-2">
              {lsrRules.map((rule, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(`Explain the Life-Saving Rule for ${rule.title}`)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 transition group flex items-start gap-2.5"
                >
                  <span className="text-lg leading-none shrink-0 group-hover:scale-110 transition">{rule.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition truncate">{rule.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{rule.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   REPORT TABLE
============================================================ */

function ReportTable({
  reports,
  onSelect,
}) {

  if (!reports.length) {
    return (
      <EmptyState
        text="No reports found."
      />
    );
  }

  return (
    <table className="w-full min-w-[900px]">

      <thead>

        <tr className="bg-slate-50 border-b border-slate-100">

          <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">
            ID
          </th>

          <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">
            Report
          </th>

          <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">
            Language
          </th>

          <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">
            SIF
          </th>

          <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">
            Confidence
          </th>

          <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">
            Rule
          </th>

          <th className="px-6 py-4" />

        </tr>

      </thead>

      <tbody>

        {reports.map((report) => {

          const confidence =
            Math.round(
              Number(report.confidence || 0) * 100
            );

          const isSif =
            report.sif_prediction === "YES";

          return (

            <tr
              key={report.report_id}
              className="border-b border-slate-100 hover:bg-slate-50/80 transition"
            >

              <td className="px-6 py-5">

                <span className="font-black text-sm">
                  #{report.report_id}
                </span>

              </td>


              <td className="px-6 py-5 max-w-[350px]">

                <div className="font-semibold text-sm truncate">
                  {report.raw_text || "No text"}
                </div>

                <div className="text-xs text-slate-400 mt-1">
                  {formatDate(report.created_at)}
                </div>

              </td>


              <td className="px-6 py-5">

                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                  {report.detected_language || "English"}
                </span>

              </td>


              <td className="px-6 py-5">

                <span
                  className={`
                    px-2.5 py-1 rounded-lg
                    text-xs font-black
                    ${
                      isSif
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-600"
                    }
                  `}
                >
                  {report.sif_prediction || "N/A"}
                </span>

              </td>


              <td className="px-6 py-5">

                <div className="font-black text-sm">
                  {confidence}%
                </div>

              </td>


              <td className="px-6 py-5">

                <span className="text-xs font-semibold text-slate-500">
                  {report.life_saving_rule || "—"}
                </span>

              </td>


              <td className="px-6 py-5 text-right">

                {onSelect && (

                  <button
                    onClick={() => onSelect(report)}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-xs font-bold transition"
                  >
                    View
                  </button>

                )}

              </td>

            </tr>

          );

        })}

      </tbody>

    </table>
  );
}


/* ============================================================
   REPORT MODAL
============================================================ */

function ReportModal({
  report,
  onClose,
}) {

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >

      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="p-6 border-b border-slate-100 flex items-center justify-between">

          <div>

            <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">
              Report Details
            </div>

            <h3 className="mt-1 text-2xl font-black">
              Report #{report.report_id}
            </h3>

          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 font-bold"
          >
            ×
          </button>

        </div>


        <div className="p-6 space-y-5">

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">

            <InfoBox
              label="SIF Prediction"
              value={report.sif_prediction}
            />

            <InfoBox
              label="Confidence"
              value={`${Math.round(
                Number(report.confidence || 0) * 100
              )}%`}
            />

            <InfoBox
              label="Language"
              value={report.detected_language || "English"}
            />

            <InfoBox
              label="Rule"
              value={report.life_saving_rule}
            />

          </div>


          <TextPanel
            title="Original Text"
            text={report.raw_text}
            badge={report.detected_language}
          />


          <TextPanel
            title="English Normalized Text"
            text={report.normalized_text}
            badge="English"
          />


          <div className="grid sm:grid-cols-3 gap-3">

            <InfoBox
              label="Activity"
              value={report.precursor_activity}
            />

            <InfoBox
              label="Location"
              value={report.precursor_location}
            />

            <InfoBox
              label="Barrier Failure"
              value={report.barrier_failure}
            />

          </div>

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   TEXT PANEL
============================================================ */

function TextPanel({
  title,
  text,
  badge,
}) {

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">

      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">

        <span className="text-sm font-black">
          {title}
        </span>

        {badge && (

          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] uppercase font-black text-slate-500">
            {badge}
          </span>

        )}

      </div>

      <div className="p-5 text-sm leading-7 text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto">

        {text || "No text available."}

      </div>

    </div>
  );
}




/* ============================================================
   PRECURSOR PATTERNS
============================================================ */

function PrecursorPatternsPage() {
  const patterns = [
    { id: 1, activity: "Maintenance", barrierFailure: "Energy Isolation Failure", site: "Site B", occurrences: 47, risk: "HIGH", lsr: "Energy Isolation" },
    { id: 2, activity: "Hot Work", barrierFailure: "Missing Fire Control", site: "Site C", occurrences: 31, risk: "HIGH", lsr: "Hot Work" },
    { id: 3, activity: "Lifting", barrierFailure: "Suspended Load Exposure", site: "Site C", occurrences: 26, risk: "HIGH", lsr: "Line of Fire" },
    { id: 4, activity: "Confined Space", barrierFailure: "Gas Testing Not Completed", site: "Site A", occurrences: 19, risk: "MEDIUM", lsr: "Confined Space" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Safety Intelligence</div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Recurring Precursor Patterns</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Identify recurring combinations of activities, barrier failures, Life-Saving Rules and sites from safety reports.
        </p>
      </div>

      <DemoLabel />

      <Card className="border-red-200">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Pattern #1</div>
              <h3 className="mt-1 text-xl font-black text-slate-900">Maintenance + Energy Isolation Failure + Site B</h3>
            </div>
            <PriorityBadge value="HIGH" />
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <PatternNode label="Activity" value="Maintenance" />
            <PatternNode label="Barrier Failure" value="Energy Isolation Failure" />
            <PatternNode label="Priority Site" value="Site B" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MetricBox label="Occurrences" value="47" />
            <MetricBox label="Risk" value="HIGH" danger />
            <MetricBox label="Life-Saving Rule" value="Energy Isolation" />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Precursor Pattern Register" subtitle="Recurring precursor combinations detected in safety reports." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Pattern','Activity','Barrier Failure','Site','Life-Saving Rule','Occurrences','Priority'].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-400 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patterns.map((pattern) => (
                <tr key={pattern.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-black">Pattern #{pattern.id}</td>
                  <td className="px-6 py-4">{pattern.activity}</td>
                  <td className="px-6 py-4 font-medium">{pattern.barrierFailure}</td>
                  <td className="px-6 py-4">{pattern.site}</td>
                  <td className="px-6 py-4">{pattern.lsr}</td>
                  <td className="px-6 py-4 font-black">{pattern.occurrences}</td>
                  <td className="px-6 py-4"><PriorityBadge value={pattern.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-3xl bg-slate-900 p-6 text-white">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Intelligence Insight</div>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          SIF-Sanket groups recurring safety conditions instead of only classifying individual reports. This helps identify repeated barrier failures, activities and priority sites requiring HSE attention.
        </p>
      </div>
    </div>
  );
}


/* ============================================================
   SITE INSIGHTS
============================================================ */

function SiteInsightsPage() {
  const sites = [
    { name: "Site B", risk: "HIGH", totalReports: 342, sifCases: 127, rate: "37.1%", activity: "Maintenance", lsr: "Energy Isolation", precursor: "Improper Isolation", barrier: "Energy Isolation Failure" },
    { name: "Site C", risk: "MEDIUM-HIGH", totalReports: 289, sifCases: 91, rate: "31.5%", activity: "Hot Work", lsr: "Hot Work", precursor: "Missing Fire Control", barrier: "Fire Control Failure" },
    { name: "Site A", risk: "MEDIUM", totalReports: 251, sifCases: 58, rate: "23.1%", activity: "Inspection", lsr: "Confined Space", precursor: "Incomplete Gas Testing", barrier: "Gas Testing Failure" },
    { name: "Site D", risk: "LOW", totalReports: 198, sifCases: 27, rate: "13.6%", activity: "Lifting", lsr: "Line of Fire", precursor: "Load Separation", barrier: "Exclusion Zone Failure" },
  ];
  const [selectedSite, setSelectedSite] = useState(sites[0]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Site Intelligence</div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Site Insights</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Compare site-level SIF precursor patterns, activities, Life-Saving Rules and barrier failures.</p>
      </div>

      <DemoLabel />

      <Card>
        <CardHeader title="Site Risk Overview" subtitle="Priority sites" />
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          {sites.map((site) => (
            <button key={site.name} onClick={() => setSelectedSite(site)} className={`rounded-2xl border p-5 text-left transition ${selectedSite.name === site.name ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-black text-slate-900">{site.name}</div>
                <RiskDot risk={site.risk} />
              </div>
              <div className="mt-4"><PriorityBadge value={site.risk} /></div>
              <div className="mt-5 text-sm text-slate-500">{site.totalReports} total reports</div>
              <div className="mt-1 text-xl font-black text-slate-900">{site.sifCases}<span className="ml-1 text-sm font-semibold text-slate-400">SIF cases</span></div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Selected Priority Site</div>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedSite.name}</h3>
          </div>
          <PriorityBadge value={selectedSite.risk} />
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricBox label="Total Reports" value={selectedSite.totalReports} />
            <MetricBox label="SIF Cases" value={selectedSite.sifCases} />
            <MetricBox label="SIF Rate" value={selectedSite.rate} />
            <MetricBox label="Top Activity" value={selectedSite.activity} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoBox label="Top Life-Saving Rule" value={selectedSite.lsr} />
            <InfoBox label="Top Precursor" value={selectedSite.precursor} />
            <InfoBox label="Common Barrier Failure" value={selectedSite.barrier} />
            <InfoBox label="Priority Activity" value={selectedSite.activity} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-black text-slate-900">SIF Trend</div>
                <div className="mt-1 text-xs text-slate-500">Live safety incident trend</div>
              </div>
              <div className="text-xs font-bold text-slate-400">Last 6 periods</div>
            </div>
            <div className="mt-6 flex h-44 items-end gap-3">
              {[42, 55, 48, 72, 61, 83].map((value, index) => (
                <div key={index} className="flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t-xl bg-blue-500" style={{ height: `${value}%` }} />
                  <div className="mt-2 text-center text-[10px] font-bold text-slate-400">M{index + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


/* ============================================================
   HSE REVIEW
============================================================ */

function HSEReviewPage() {
  const [status, setStatus] = useState("Pending");
  const reviewCase = {
    reportId: "R-1042",
    prediction: "YES",
    confidence: 67,
    priority: "HIGH",
    reason: "Possible energy isolation failure",
    evidence: "Isolation procedure was not followed during maintenance activity.",
    activity: "Maintenance",
    site: "Site B",
    lsr: "Energy Isolation",
    barrier: "Energy Isolation",
    barrierFailure: "Improper Isolation",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Human-in-the-Loop</div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">HSE Review</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Review uncertain AI assessments before a safety case is finalized.</p>
      </div>

      <DemoLabel />

      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">HSE Review Required</div>
            <h3 className="mt-2 text-2xl font-black text-slate-900">Report ID: {reviewCase.reportId}</h3>
            <p className="mt-2 text-sm text-slate-600">This case requires human validation because AI confidence is below the high-confidence threshold.</p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-black text-amber-700">{status}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="SIF Assessment" subtitle="AI assessment requiring human validation" />
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricBox label="SIF Potential" value={reviewCase.prediction} danger />
              <MetricBox label="Confidence" value={`${reviewCase.confidence}%`} />
              <MetricBox label="Priority" value={reviewCase.priority} danger />
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">Reason</div>
              <div className="mt-2 font-bold text-slate-900">{reviewCase.reason}</div>
            </div>
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="text-xs font-black uppercase tracking-wider text-blue-500">Supporting Evidence</div>
              <blockquote className="mt-3 border-l-4 border-blue-500 pl-4 text-sm font-medium italic leading-6 text-slate-700">“{reviewCase.evidence}”</blockquote>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Case Summary" />
          <div className="p-6 space-y-4">
            <InfoBox label="Activity" value={reviewCase.activity} />
            <InfoBox label="Site" value={reviewCase.site} />
            <InfoBox label="Life-Saving Rule" value={reviewCase.lsr} />
            <InfoBox label="Barrier" value={reviewCase.barrier} />
            <InfoBox label="Barrier Failure" value={reviewCase.barrierFailure} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="HSE Decision" subtitle="Human validation is required before this case is finalized." />
        <div className="p-6 flex flex-col sm:flex-row gap-3">
          <button onClick={() => setStatus("Approved")} className="flex-1 rounded-xl bg-emerald-600 text-white px-5 py-3.5 font-black hover:bg-emerald-700 transition">✓ APPROVE</button>
          <button onClick={() => setStatus("Rejected")} className="flex-1 rounded-xl bg-red-600 text-white px-5 py-3.5 font-black hover:bg-red-700 transition">✕ REJECT</button>
          <button onClick={() => setStatus("Pending Review")} className="flex-1 rounded-xl bg-amber-500 text-white px-5 py-3.5 font-black hover:bg-amber-600 transition">↻ MARK FOR REVIEW</button>
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">Current Review Status</div>
            <div className="mt-1 text-lg font-black text-slate-900">{status}</div>
          </div>
        </div>
      </Card>

      <div className="rounded-3xl bg-slate-900 p-6 text-white">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Human-in-the-Loop Principle</div>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">AI provides SIF Potential, Confidence, Evidence and safety intelligence. The final HSE decision remains with the responsible human reviewer.</p>
      </div>
    </div>
  );
}


/* ============================================================
   NEW HSE UI HELPERS
============================================================ */

function DemoLabel() {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3">
      <div className="text-xs font-black uppercase tracking-wider text-blue-600">SIF-Sanket · Safety Intelligence System</div>
    </div>
  );
}

function PatternNode({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 text-base font-black text-slate-900">{value}</div>
    </div>
  );
}

function MetricBox({ label, value, danger = false }) {
  return (
    <div className={`rounded-2xl border p-5 ${danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-black ${danger ? "text-red-700" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function PriorityBadge({ value }) {
  const styles = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    "MEDIUM-HIGH": "bg-orange-50 text-orange-700 border-orange-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black ${styles[value] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{value}</span>;
}

function RiskDot({ risk }) {
  const styles = {
    HIGH: "bg-red-500",
    "MEDIUM-HIGH": "bg-orange-500",
    MEDIUM: "bg-amber-400",
    LOW: "bg-emerald-500",
  };
  return <span className={`w-3 h-3 rounded-full ${styles[risk] || "bg-slate-400"}`} />;
}


/* ============================================================
   INFO BOX
============================================================ */

function InfoBox({
  label,
  value,
}) {

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">

      <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-sm font-bold text-slate-800 break-words">
        {value || "—"}
      </div>

    </div>
  );
}


/* ============================================================
   EMPTY
============================================================ */

function EmptyState({
  text,
}) {

  return (
    <div className="py-14 text-center">

      <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
        —
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-400">
        {text}
      </p>

    </div>
  );
}


/* ============================================================
   LOADING TABLE
============================================================ */

function LoadingTable() {

  return (
    <div className="p-8 space-y-4">

      {[1, 2, 3, 4].map((item) => (

        <div
          key={item}
          className="h-14 rounded-xl bg-slate-100 animate-pulse"
        />

      ))}

    </div>
  );
}


/* ============================================================
   HELPERS
============================================================ */

/* ============================================================
   INLINE ICONS — no extra dependency required
============================================================ */

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    analytics: <><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/><path d="M3 21h20"/></>,
    reports: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h2"/></>,
    pdf: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 14h6"/><path d="M9 17h4"/></>,
    pattern: <><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9.5 9.5l5 5"/><path d="M17 4v6"/><path d="M14 7h6"/></>,
    sites: <><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/></>,
    review: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    shield: <><path d="M12 3 20 6v5c0 5.2-3.5 8.8-8 10-4.5-1.2-8-4.8-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-3L3 11"/><path d="M3 6v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3L21 13"/><path d="M21 18v-5h-5"/></>,
    spark: <><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    bot: <><path d="M12 2v3"/><rect x="4" y="5" width="16" height="14" rx="4"/><path d="M9 11v.01"/><path d="M15 11v.01"/><path d="M8 15h8"/><path d="M2 12h2"/><path d="M20 12h2"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></>,
    close: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    trash: <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
  };

  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}


function pageTitle(page) {

  const item =
    NAV_ITEMS.find((x) => x.id === page);

  return item?.label || "Dashboard";
}


function formatDate(value) {

  if (!value) {
    return "Date unavailable";
  }

  try {

    return new Date(value).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );

  } catch {
    return String(value);
  }
}


export default App;